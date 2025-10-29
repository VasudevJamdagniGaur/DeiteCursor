import firestoreService from './firestoreService';
import { getDateIdDaysAgo, getDateId } from '../utils/dateUtils';

class PatternAnalysisService {
  constructor() {
    this.baseURL = 'https://b5z7d285vvdqfz-11434.proxy.runpod.net/';
    this.minDaysRequired = 1; // Minimum days needed for meaningful analysis (reduced from 3)
    this.minMessagesRequired = 1; // Minimum total messages needed (reduced from 8)
    this.minDaysFor3Months = 1; // Minimum days for 3-month analysis (reduced from 7)
    this.minMessagesFor3Months = 1; // Minimum messages for 3-month analysis (reduced from 15)
  }

  /**
   * Analyze patterns for triggers and boosters from chat data
   * @param {string} uid - User ID
   * @param {number} days - Number of days to analyze (7 for week, 30 for month)
   * @returns {Object} Analysis results with triggers, joy boosters, and distractions
   */
  async analyzePatterns(uid, days = 7) {
    console.log(`🔍 Starting pattern analysis for ${days} days...`);
    
    try {
      // Get chat data from Firestore
      const chatData = await this.getChatData(uid, days);
      
      if (!this.hasEnoughData(chatData, days)) {
        console.log('⚠️ Not enough data for pattern analysis');
        return this.getDefaultAnalysis();
      }
      
      // Perform AI analysis using RunPod directly
      const analysisResult = await this.performAIAnalysis(chatData, days);
      
      console.log('✅ Pattern analysis completed:', analysisResult);
      return analysisResult;

    } catch (error) {
      console.error('❌ Error in pattern analysis:', error);
      return this.getDefaultAnalysis();
    }
  }

  /**
   * Perform AI analysis on chat data using CORS proxy server
   */
  async performAIAnalysis(chatData, days) {
    console.log('🤖 Performing AI analysis on chat data...');
    
    try {
      // Use the CORS proxy server
      const response = await fetch(this.analysisEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatData: chatData,
          days: days
        })
      });

      if (!response.ok) {
        throw new Error(`Proxy server error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log('✅ PATTERN DEBUG: Received analysis from proxy:', data);
      
      if (data.success && data.analysis) {
        console.log('✅ AI analysis completed:', data.analysis);
        return data.analysis;
      } else {
        return this.getDefaultAnalysis();
      }

    } catch (error) {
      console.error('❌ Error in AI analysis:', error);
      return this.getDefaultAnalysis();
    }
  }

  /**
   * Get chat data from Firestore
   */
  async getChatData(uid, days) {
    const chatData = [];
    
    for (let i = 0; i < days; i++) {
      const dateId = getDateIdDaysAgo(i);
      const dayData = await firestoreService.getChatMessages(uid, dateId);
      
      if (dayData && dayData.length > 0) {
        chatData.push({
          date: dateId,
          messages: dayData
        });
      }
    }
    
    return chatData;
  }

  /**
   * Check if there's enough data for analysis
   */
  hasEnoughData(chatData, days) {
    const totalMessages = chatData.reduce((sum, day) => sum + (day.messages?.length || 0), 0);
    const daysWithData = chatData.length;
    
    return daysWithData >= this.minDaysRequired && totalMessages >= this.minMessagesRequired;
  }

  /**
   * Get default analysis when no data is available
   */
  getDefaultAnalysis() {
    return {
      triggers: {
        stress: ['Work pressure', 'Time constraints', 'Uncertainty'],
        joy: ['Personal achievements', 'Social connections', 'Creative activities'],
        distraction: ['Social media', 'Procrastination', 'Multitasking']
      },
      insights: {
        primaryStressSource: 'Work-related pressure',
        mainJoySource: 'Personal accomplishments',
        behavioralPattern: 'Balancing work and personal life'
      },
      recommendations: [
        'Practice time management techniques',
        'Set clear boundaries between work and personal time',
        'Engage in regular physical activity'
      ]
    };
  }

  /**
   * Parse analysis result from AI response
   */
  parseAnalysisResult(responseText) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('❌ Error parsing analysis result:', error);
    }
    
    return this.getDefaultAnalysis();
  }

  /**
   * Get pattern analysis from mood data
   * @param {string} uid - User ID
   * @param {number} days - Number of days to analyze
   * @param {boolean} forceRefresh - Force refresh analysis
   * @returns {Object} Analysis results with triggers, joy boosters, and distractions
   */
  async getPatternAnalysis(uid, days, forceRefresh = false) {
    console.log(`🔍 Getting pattern analysis for ${days} days...`);
    
    try {
      // Get mood data from Firestore
      const moodDataResult = await firestoreService.getMoodChartDataNew(uid, days);
      
      if (!moodDataResult.success || !moodDataResult.moodData || moodDataResult.moodData.length === 0) {
        console.log('⚠️ No mood data available');
        return {
          success: true,
          hasEnoughData: false,
          triggers: {
            stress: [],
            joy: [],
            distraction: []
          },
          patterns: [],
          analysis: 'Not enough data to identify patterns'
        };
      }

      // Analyze patterns from mood data
      const analysis = await this.analyzePatternsFromMoodData(moodDataResult.moodData, days, uid);
      
      console.log('✅ Pattern analysis completed:', analysis);
      return {
        success: true,
        hasEnoughData: moodDataResult.moodData.length >= 7,
        triggers: analysis.triggers,
        patterns: analysis.patterns,
        analysis: analysis.summary
      };

    } catch (error) {
      console.error('❌ Error in getPatternAnalysis:', error);
      return {
        success: false,
        hasEnoughData: false,
        triggers: {
          stress: [],
          joy: [],
          distraction: []
        },
        patterns: [],
        analysis: 'Error analyzing patterns'
      };
    }
  }

  /**
   * Analyze patterns from mood data to generate triggers, joy boosters, and distractions
   * @param {Array} moodData - Array of mood data entries
   * @param {number} days - Number of days analyzed
   * @param {string} uid - User ID for fetching reflections
   * @returns {Object} Analysis with triggers, patterns, and summary
   */
  async analyzePatternsFromMoodData(moodData, days, uid = null) {
    console.log(`📊 Analyzing patterns from ${moodData.length} days of mood data...`);

    if (moodData.length === 0) {
      return {
        triggers: { stress: [], joy: [], distraction: [] },
        patterns: [],
        summary: 'No data to analyze'
      };
    }

    // Process valid mood data
    const validData = moodData.filter(item => {
      const total = (item.happiness || 0) + (item.energy || 0) + (item.anxiety || 0) + (item.stress || 0);
      return total >= 10; // At least 10 points total to avoid nearly empty days
    });

    if (validData.length === 0) {
      return {
        triggers: { stress: [], joy: [], distraction: [] },
        patterns: [],
        summary: 'Not enough meaningful data to identify patterns'
      };
    }

    // Fetch reflections for joy booster analysis
    let enrichedData = validData;
    if (uid) {
      console.log('📖 Fetching reflections for detailed joy booster analysis...');
      try {
        enrichedData = await Promise.all(
          validData.map(async (day) => {
            try {
              const reflectionResult = await firestoreService.getReflectionNew(uid, day.date);
              return {
                ...day,
                summary: reflectionResult.reflection || null
              };
            } catch (error) {
              console.log(`⚠️ No reflection found for ${day.date}`);
              return { ...day, summary: null };
            }
          })
        );
        console.log('✅ Enriched mood data with reflections');
      } catch (error) {
        console.log('⚠️ Could not fetch reflections, using mood data only');
      }
    }

    // Analyze stress triggers
    const stressTriggers = this.identifyStressTriggers(validData);
    
    // Analyze joy boosters with reflection data
    const joyBoosters = this.identifyJoyBoosters(validData, enrichedData);
    
    // Analyze distractions
    const distractions = this.identifyDistractions(validData);
    
    // Identify patterns
    const patterns = this.identifyPatterns(validData);

    return {
      triggers: {
        stress: stressTriggers,
        joy: joyBoosters,
        distraction: distractions
      },
      patterns,
      summary: `Analyzed ${validData.length} days of emotional data`
    };
  }

  /**
   * Identify stress triggers from mood data
   * @param {Array} moodData - Array of mood data entries
   * @returns {Array} Array of stress trigger descriptions
   */
  identifyStressTriggers(moodData) {
    const triggers = [];
    const highStressDays = moodData.filter(d => (d.stress || 0) >= 60);
    const highAnxietyDays = moodData.filter(d => (d.anxiety || 0) >= 60);
    const lowHappinessDays = moodData.filter(d => (d.happiness || 0) <= 40);
    
    // Common stress patterns
    if (highStressDays.length >= moodData.length * 0.3) {
      triggers.push('Work pressure and deadlines');
    }
    
    if (highAnxietyDays.length >= moodData.length * 0.3) {
      triggers.push('Uncertainty about the future');
    }
    
    if (lowHappinessDays.length >= moodData.length * 0.3 && highStressDays.length > 0) {
      triggers.push('Stress-energy depletion');
    }

    // Analyze stress/anxiety correlations
    const stressAnxietyCombined = moodData.filter(d => (d.stress || 0) >= 50 && (d.anxiety || 0) >= 50);
    if (stressAnxietyCombined.length >= moodData.length * 0.2) {
      triggers.push('Overwhelm from combined pressures');
    }

    // If no strong patterns, provide general insights
    if (triggers.length === 0) {
      const avgStress = moodData.reduce((sum, d) => sum + (d.stress || 0), 0) / moodData.length;
      const avgAnxiety = moodData.reduce((sum, d) => sum + (d.anxiety || 0), 0) / moodData.length;
      
      if (avgStress >= 45) {
        triggers.push('Ongoing pressure and demands');
      }
      
      if (avgAnxiety >= 45) {
        triggers.push('Persistent worries and concerns');
      }
    }

    return triggers.length > 0 ? triggers : [];
  }

  /**
   * Identify joy boosters from mood data and reflections
   * @param {Array} moodData - Array of mood data entries
   * @param {Array} enrichedData - Array of mood data with reflection summaries
   * @returns {Array} Array of joy booster descriptions
   */
  identifyJoyBoosters(moodData, enrichedData = null) {
    const boosters = [];
    const dataWithSummaries = enrichedData || moodData;
    
    // Get days with high happiness/energy
    const highHappinessDays = dataWithSummaries.filter(d => (d.happiness || 0) >= 70);
    const highEnergyDays = dataWithSummaries.filter(d => (d.energy || 0) >= 70);
    const lowStressDays = dataWithSummaries.filter(d => (d.stress || 0) <= 30);
    
    // Analyze specific experiences from summaries
    const daysWithSummaries = dataWithSummaries.filter(d => d.summary && d.summary.trim().length > 0);
    const happyDaysWithSummary = daysWithSummaries.filter(d => (d.happiness || 0) >= 65);
    
    if (happyDaysWithSummary.length > 0) {
      // Extract specific moments from summaries
      const processedSummaries = new Set();
      
      happyDaysWithSummary.forEach(day => {
        const summary = (day.summary || '').toLowerCase();
        
        // Look for achievement/accomplishment patterns
        if ((summary.includes('finished') || summary.includes('completed') || summary.includes('accomplished') || 
             summary.includes('achieved') || summary.includes('succeeded') || summary.includes('done')) && 
            !processedSummaries.has('achievement')) {
          boosters.push('Completing something meaningful gave you a powerful sense of capability and validation.');
          processedSummaries.add('achievement');
        }
        
        // Look for connection/social patterns
        if ((summary.includes('friend') || summary.includes('talked') || summary.includes('conversation') || 
             summary.includes('joked') || summary.includes('laughed') || summary.includes('connected')) && 
            !processedSummaries.has('connection')) {
          boosters.push('Meaningful conversations with others helped you feel understood and less alone.');
          processedSummaries.add('connection');
        }
        
        // Look for calm/peace patterns
        if ((summary.includes('calm') || summary.includes('peaceful') || summary.includes('quiet') || 
             summary.includes('relax') || summary.includes('walk') || summary.includes('breath')) && 
            !processedSummaries.has('peace')) {
          boosters.push('Taking time for stillness reminded you that peace comes from letting go of pressure, not avoiding activity.');
          processedSummaries.add('peace');
        }
        
        // Look for progress/growth patterns
        if ((summary.includes('learned') || summary.includes('understood') || summary.includes('insight') || 
             summary.includes('realized') || summary.includes('growth') || summary.includes('progress')) && 
            !processedSummaries.has('growth')) {
          boosters.push('Discovering something new about yourself or your situation gave you clarity and a sense of forward momentum.');
          processedSummaries.add('growth');
        }
        
        // Look for control/agency patterns
        if ((summary.includes('decided') || summary.includes('chose') || summary.includes('set') || 
             summary.includes('boundary') || summary.includes('control') || summary.includes('manage')) && 
            !processedSummaries.has('control')) {
          boosters.push('Making a decision or taking action gave you a sense of control over your own life and circumstances.');
          processedSummaries.add('control');
        }
      });
    }
    
    // Fall back to mood pattern analysis if no specific summaries found
    if (boosters.length === 0) {
      if (highHappinessDays.length >= moodData.length * 0.25) {
        boosters.push('The satisfaction of meaningful accomplishments filled your need to feel capable and recognized.');
      }
      
      if (highEnergyDays.length >= moodData.length * 0.25) {
        boosters.push('Being fully engaged in activities that mattered to you energized both body and mind.');
      }
      
      if (lowStressDays.length >= moodData.length * 0.3) {
        boosters.push('Moments without pressure allowed you to breathe freely and feel like yourself again.');
      }
    }

    return boosters.length > 0 ? boosters : [];
  }

  /**
   * Identify distractions from mood data
   * @param {Array} moodData - Array of mood data entries
   * @returns {Array} Array of distraction descriptions
   */
  identifyDistractions(moodData) {
    const distractions = [];
    const lowEnergyHighStress = moodData.filter(d => (d.energy || 0) <= 40 && (d.stress || 0) >= 50);
    const highStressLowHappiness = moodData.filter(d => (d.stress || 0) >= 60 && (d.happiness || 0) <= 50);
    const energyDrops = moodData.filter(d => (d.energy || 0) <= 35);
    
    // Analyze distraction patterns
    if (lowEnergyHighStress.length >= moodData.length * 0.2) {
      distractions.push('Stress-induced energy depletion');
    }
    
    if (highStressLowHappiness.length >= moodData.length * 0.25) {
      distractions.push('Stress hijacks happiness');
    }
    
    if (energyDrops.length >= moodData.length * 0.3) {
      distractions.push('Chronic low energy levels');
    }

    // Analyze correlation between stress and energy
    const stressedDays = moodData.filter(d => (d.stress || 0) >= 55);
    const avgEnergyOnStressedDays = stressedDays.reduce((sum, d) => sum + (d.energy || 0), 0) / (stressedDays.length || 1);
    const avgEnergyOnAllDays = moodData.reduce((sum, d) => sum + (d.energy || 0), 0) / moodData.length;
    
    if (avgEnergyOnStressedDays < avgEnergyOnAllDays - 15 && stressedDays.length >= moodData.length * 0.2) {
      distractions.push('Stress-energy drain cycle');
    }

    // If no strong patterns, provide general insights
    if (distractions.length === 0) {
      const avgEnergy = moodData.reduce((sum, d) => sum + (d.energy || 0), 0) / moodData.length;
      const avgStress = moodData.reduce((sum, d) => sum + (d.stress || 0), 0) / moodData.length;
      
      if (avgEnergy <= 45) {
        distractions.push('Fatigue and low vitality');
      }
      
      if (avgStress >= 50 && avgEnergy <= 50) {
        distractions.push('Stress-energy imbalance');
      }
    }

    return distractions.length > 0 ? distractions : [];
  }

  /**
   * Identify emotional patterns from mood data
   * @param {Array} moodData - Array of mood data entries
   * @returns {Array} Array of pattern descriptions
   */
  identifyPatterns(moodData) {
    const patterns = [];
    
    // Analyze weekly patterns
    const avgStress = moodData.reduce((sum, d) => sum + (d.stress || 0), 0) / moodData.length;
    const avgHappiness = moodData.reduce((sum, d) => sum + (d.happiness || 0), 0) / moodData.length;
    const avgEnergy = moodData.reduce((sum, d) => sum + (d.energy || 0), 0) / moodData.length;
    const avgAnxiety = moodData.reduce((sum, d) => sum + (d.anxiety || 0), 0) / moodData.length;
    
    // Pattern: Stress-anxiety correlation
    if (avgStress >= 45 && avgAnxiety >= 45) {
      patterns.push('Stress and anxiety often rise together — when stress increases, anxiety typically follows, creating a compounding effect on your emotional state.');
    }
    
    // Pattern: Happiness-stress inverse relationship
    if (avgHappiness >= 60 && avgStress <= 40) {
      patterns.push('Happiness peaks when stress is low — your happiest moments consistently occur when stress (40% or less) and anxiety are minimal, showing that peace and calm are essential for your joy.');
    }
    
    // Pattern: Energy-stress relationship
    if (avgEnergy <= 45 && avgStress >= 50) {
      patterns.push('Low energy coincides with high stress — when stress rises, your energy drops, creating a cycle that can lead to burnout if not managed proactively.');
    }

    // Analyze volatility
    const stressValues = moodData.map(d => d.stress || 0);
    const happinessValues = moodData.map(d => d.happiness || 0);
    const stressVariance = this.calculateVariance(stressValues);
    const happinessVariance = this.calculateVariance(happinessValues);
    
    if (stressVariance >= 300) {
      patterns.push('High stress volatility — your stress levels fluctuate significantly from day to day, indicating unpredictable stressors or difficulty managing emotional responses to changes.');
    }
    
    if (happinessVariance >= 300) {
      patterns.push('Happiness swings — your mood varies considerably (variance of 300+), suggesting that external events or internal states have strong, immediate impacts on your emotional wellbeing.');
    }

    return patterns;
  }

  /**
   * Calculate variance of an array of numbers
   * @param {Array} values - Array of numbers
   * @returns {number} Variance
   */
  calculateVariance(values) {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return variance;
  }
}

export default new PatternAnalysisService();