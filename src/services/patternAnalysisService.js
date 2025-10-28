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
      const analysis = await this.analyzePatternsFromMoodData(moodDataResult.moodData, days);
      
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
   * @returns {Object} Analysis with triggers, patterns, and summary
   */
  async analyzePatternsFromMoodData(moodData, days) {
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

    // Analyze stress triggers
    const stressTriggers = this.identifyStressTriggers(validData);
    
    // Analyze joy boosters
    const joyBoosters = this.identifyJoyBoosters(validData);
    
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
      triggers.push('Work-related pressure and deadlines — you consistently experienced elevated stress (60%+ on many days), suggesting that professional demands are a significant emotional trigger. Consider setting clearer boundaries and incorporating buffer time into your schedule.');
    }
    
    if (highAnxietyDays.length >= moodData.length * 0.3) {
      triggers.push('Uncertainty and worries about the future — your anxiety peaked frequently (60%+) across the period, indicating that uncertainty or anticipatory stress weighs heavily. Practice grounding techniques when anxiety rises.');
    }
    
    if (lowHappinessDays.length >= moodData.length * 0.3 && highStressDays.length > 0) {
      triggers.push('Stress-energy depletion — when stress levels increased (60%+), your happiness often dropped below 40%, showing that high stress directly impacts your emotional wellbeing and robs you of joy.');
    }

    // Analyze stress/anxiety correlations
    const stressAnxietyCombined = moodData.filter(d => (d.stress || 0) >= 50 && (d.anxiety || 0) >= 50);
    if (stressAnxietyCombined.length >= moodData.length * 0.2) {
      triggers.push('Overwhelm from combined pressures — on 20%+ of days, both stress and anxiety were elevated simultaneously (50%+ each). This pattern suggests that when multiple pressures converge, you experience emotional overwhelm. Recognize these moments and practice breathing exercises or take strategic breaks.');
    }

    // If no strong patterns, provide general insights
    if (triggers.length === 0) {
      const avgStress = moodData.reduce((sum, d) => sum + (d.stress || 0), 0) / moodData.length;
      const avgAnxiety = moodData.reduce((sum, d) => sum + (d.anxiety || 0), 0) / moodData.length;
      
      if (avgStress >= 45) {
        triggers.push('Moderate but consistent stress levels — your average stress (40%+) suggests that ongoing pressure, though manageable, is a regular part of your emotional landscape. Pay attention to what specific situations elevate your stress.');
      }
      
      if (avgAnxiety >= 45) {
        triggers.push('Persistent worries — elevated average anxiety (40%+) indicates that worry is a recurring emotional state. Consider journaling about your concerns or discussing them with trusted others.');
      }
    }

    return triggers.length > 0 ? triggers : [];
  }

  /**
   * Identify joy boosters from mood data
   * @param {Array} moodData - Array of mood data entries
   * @returns {Array} Array of joy booster descriptions
   */
  identifyJoyBoosters(moodData) {
    const boosters = [];
    const highHappinessDays = moodData.filter(d => (d.happiness || 0) >= 70);
    const highEnergyDays = moodData.filter(d => (d.energy || 0) >= 70);
    const lowStressDays = moodData.filter(d => (d.stress || 0) <= 30);
    const lowAnxietyDays = moodData.filter(d => (d.anxiety || 0) <= 30);
    
    // Analyze positive patterns
    if (highHappinessDays.length >= moodData.length * 0.25) {
      boosters.push('Authentic achievements and progress — you frequently experienced high happiness (70%+) on 25%+ of days, suggesting that meaningful accomplishments, personal growth, or pursuing goals brings you genuine joy. You thrive when making progress toward what matters to you.');
    }
    
    if (highEnergyDays.length >= moodData.length * 0.25) {
      boosters.push('Physical vitality and engagement — your energy peaked (70%+) regularly, indicating that being physically active, pursuing interests, or feeling mentally stimulated energizes you. Activities that bring vitality into your life consistently uplift your mood.');
    }
    
    if (lowStressDays.length >= moodData.length * 0.3 && lowAnxietyDays.length >= moodData.length * 0.3) {
      boosters.push('Calm and peace — on many days, both stress and anxiety stayed low (30% or less), showing that peaceful moments and low-pressure environments are a consistent source of wellbeing. You recharge through calm, quiet, or unstructured time.');
    }

    // Find correlation between high happiness and low stress
    const peacefulDays = moodData.filter(d => (d.happiness || 0) >= 60 && (d.stress || 0) <= 30 && (d.anxiety || 0) <= 30);
    if (peacefulDays.length >= moodData.length * 0.2) {
      boosters.push('Emotional balance — on 20%+ of days, you experienced happiness (60%+) alongside low stress and anxiety (30% or less). This reveals that when you can reduce pressure and worry, happiness naturally emerges. Peace is a genuine boost for your mood.');
    }

    // If no strong patterns, analyze average positive emotions
    if (boosters.length === 0) {
      const avgHappiness = moodData.reduce((sum, d) => sum + (d.happiness || 0), 0) / moodData.length;
      const avgEnergy = moodData.reduce((sum, d) => sum + (d.energy || 0), 0) / moodData.length;
      
      if (avgHappiness >= 55 && avgEnergy >= 55) {
        boosters.push('Steady positive emotional energy — your consistent happiness (55%+) and energy (55%+) indicate that you have a solid foundation of wellbeing. Continue nurturing the relationships, activities, and routines that sustain this positive baseline.');
      }
      
      if (avgHappiness >= 60) {
        boosters.push('Natural optimism and contentment — your average happiness (60%+) suggests that positive thinking, gratitude, or supportive relationships consistently bring you joy. These sources of happiness are reliable boosters for your emotional state.');
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
      distractions.push('Stress-induced energy depletion — on 20%+ of days, high stress (50%+) coincided with low energy (40% or less), showing that when stress spikes, your energy tanks. This pattern suggests that stress isn\'t just mentally draining but physically depleting. Consider setting clearer boundaries to protect your energy reserves.');
    }
    
    if (highStressLowHappiness.length >= moodData.length * 0.25) {
      distractions.push('Stress hijacks happiness — elevated stress (60%+) frequently occurred alongside reduced happiness (50% or less) on 25%+ of days. This reveals that stress acts as an emotional hijacker, robbing you of joy even when positive things are happening. Identify stress sources and address them proactively.');
    }
    
    if (energyDrops.length >= moodData.length * 0.3) {
      distractions.push('Chronic low energy — your energy dropped to 35% or below on 30%+ of days, indicating that something is consistently draining your vitality. This could be sleep issues, overcommitment, physical demands, or mental burnout. Look for patterns that precede these energy crashes.');
    }

    // Analyze correlation between stress and energy
    const stressedDays = moodData.filter(d => (d.stress || 0) >= 55);
    const avgEnergyOnStressedDays = stressedDays.reduce((sum, d) => sum + (d.energy || 0), 0) / (stressedDays.length || 1);
    const avgEnergyOnAllDays = moodData.reduce((sum, d) => sum + (d.energy || 0), 0) / moodData.length;
    
    if (avgEnergyOnStressedDays < avgEnergyOnAllDays - 15 && stressedDays.length >= moodData.length * 0.2) {
      distractions.push('Stress-energy drain pattern — when stress increases (55%+), your energy consistently drops below its usual level. This creates a cycle where stress depletes energy, leading to more stress. Breaking this cycle requires proactive energy management during stressful periods.');
    }

    // If no strong patterns, provide general insights
    if (distractions.length === 0) {
      const avgEnergy = moodData.reduce((sum, d) => sum + (d.energy || 0), 0) / moodData.length;
      const avgStress = moodData.reduce((sum, d) => sum + (d.stress || 0), 0) / moodData.length;
      
      if (avgEnergy <= 45) {
        distractions.push('Consistently low energy levels — your average energy stayed at 45% or below, suggesting that fatigue, overcommitment, or lack of restorative activities is impacting your daily functioning. Prioritize sleep, nutrition, and activities that genuinely recharge you.');
      }
      
      if (avgStress >= 50 && avgEnergy <= 50) {
        distractions.push('Stress-energy imbalance — elevated stress (50%+) coexists with lower energy (50% or less), indicating that managing stress while maintaining energy is an ongoing challenge. Build in recovery time and stress-relief practices into your routine.');
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