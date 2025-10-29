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

    // Analyze stress triggers with reflection data
    const stressTriggers = this.identifyStressTriggers(validData, enrichedData);
    
    // Analyze joy boosters with reflection data
    const joyBoosters = this.identifyJoyBoosters(validData, enrichedData);
    
    // Analyze distractions with reflection data
    const distractions = this.identifyDistractions(validData, enrichedData);
    
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
   * Identify stress triggers from mood data and reflections
   * @param {Array} moodData - Array of mood data entries
   * @param {Array} enrichedData - Array of mood data with reflection summaries
   * @returns {Array} Array of activity-focused stress trigger descriptions
   */
  identifyStressTriggers(moodData, enrichedData = null) {
    const triggers = [];
    const dataWithSummaries = enrichedData || moodData;
    
    // Get days with high stress/anxiety
    const highStressDays = moodData.filter(d => (d.stress || 0) >= 60);
    const highAnxietyDays = moodData.filter(d => (d.anxiety || 0) >= 60);
    
    // Analyze specific stress-causing activities from summaries
    const daysWithSummaries = dataWithSummaries.filter(d => d.summary && d.summary.trim().length > 0);
    const stressfulDaysWithSummary = daysWithSummaries.filter(d => (d.stress || 0) >= 55 || (d.anxiety || 0) >= 55);
    
    if (stressfulDaysWithSummary.length > 0) {
      const processedTriggers = new Set();
      
      stressfulDaysWithSummary.forEach(day => {
        const summary = (day.summary || '').toLowerCase();
        
        // Look for work-related stress activities
        if ((summary.includes('work') || summary.includes('deadline') || summary.includes('meeting') || 
             summary.includes('project') || summary.includes('boss') || summary.includes('colleague')) && 
            !processedTriggers.has('work')) {
          triggers.push('Dealing with work deadlines or meetings');
          processedTriggers.add('work');
        }
        
        // Look for conflict-related activities
        if ((summary.includes('argument') || summary.includes('conflict') || summary.includes('fight') || 
             summary.includes('disagreement') || summary.includes('tension')) && 
            !processedTriggers.has('conflict')) {
          triggers.push('Having difficult conversations or arguments');
          processedTriggers.add('conflict');
        }
        
        // Look for time pressure activities
        if ((summary.includes('late') || summary.includes('rushing') || summary.includes('running out') || 
             summary.includes('time') || summary.includes('busy')) && 
            !processedTriggers.has('time')) {
          triggers.push('Rushing or running behind schedule');
          processedTriggers.add('time');
        }
        
        // Look for decision-making activities
        if ((summary.includes('decide') || summary.includes('choice') || summary.includes('unsure') || 
             summary.includes('uncertain') || summary.includes('doubt')) && 
            !processedTriggers.has('decision')) {
          triggers.push('Making difficult decisions');
          processedTriggers.add('decision');
        }
        
        // Look for social/interpersonal activities
        if ((summary.includes('judge') || summary.includes('criticize') || summary.includes('reject') || 
             summary.includes('disapprove') || summary.includes('expectation')) && 
            !processedTriggers.has('social')) {
          triggers.push('Facing criticism or high expectations from others');
          processedTriggers.add('social');
        }
        
        // Look for financial concerns
        if ((summary.includes('money') || summary.includes('bill') || summary.includes('financial') || 
             summary.includes('payment') || summary.includes('debt')) && 
            !processedTriggers.has('financial')) {
          triggers.push('Managing financial obligations or payments');
          processedTriggers.add('financial');
        }
        
        // Look for multitasking/overload
        if ((summary.includes('multitask') || summary.includes('overwhelm') || summary.includes('too much') || 
             summary.includes('many things') || summary.includes('juggling')) && 
            !processedTriggers.has('overload')) {
          triggers.push('Juggling multiple tasks at once');
          processedTriggers.add('overload');
        }
      });
    }
    
    // Fall back to activity-based patterns if no specific summaries found
    if (triggers.length === 0) {
      if (highStressDays.length >= moodData.length * 0.3) {
        triggers.push('Working under tight deadlines');
      }
      
      if (highAnxietyDays.length >= moodData.length * 0.3) {
        triggers.push('Facing uncertain situations or decisions');
      }
      
      const stressAnxietyCombined = moodData.filter(d => (d.stress || 0) >= 50 && (d.anxiety || 0) >= 50);
      if (stressAnxietyCombined.length >= moodData.length * 0.2) {
        triggers.push('Handling multiple demanding tasks');
      }
    }

    return triggers.length > 0 ? triggers.slice(0, 3) : [];
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
          boosters.push('Completing tasks ahead of schedule');
          processedSummaries.add('achievement');
        }
        
        // Look for connection/social patterns
        if ((summary.includes('friend') || summary.includes('talked') || summary.includes('conversation') || 
             summary.includes('joked') || summary.includes('laughed') || summary.includes('connected')) && 
            !processedSummaries.has('connection')) {
          boosters.push('Talking with friends or sharing updates');
          processedSummaries.add('connection');
        }
        
        // Look for calm/peace patterns
        if ((summary.includes('calm') || summary.includes('peaceful') || summary.includes('quiet') || 
             summary.includes('relax') || summary.includes('walk') || summary.includes('breath')) && 
            !processedSummaries.has('peace')) {
          if (summary.includes('walk')) {
            boosters.push('Going for walks');
          } else if (summary.includes('music')) {
            boosters.push('Listening to music');
          } else {
            boosters.push('Taking quiet moments to yourself');
          }
          processedSummaries.add('peace');
        }
        
        // Look for progress/growth patterns
        if ((summary.includes('learned') || summary.includes('understood') || summary.includes('insight') || 
             summary.includes('realized') || summary.includes('growth') || summary.includes('progress')) && 
            !processedSummaries.has('growth')) {
          boosters.push('Reading or learning new things');
          processedSummaries.add('growth');
        }
        
        // Look for control/agency patterns
        if ((summary.includes('decided') || summary.includes('chose') || summary.includes('set') || 
             summary.includes('boundary') || summary.includes('control') || summary.includes('manage')) && 
            !processedSummaries.has('control')) {
          boosters.push('Setting boundaries or making decisions');
          processedSummaries.add('control');
        }
        
        // Look for specific activities
        if (summary.includes('music') && !processedSummaries.has('music')) {
          boosters.push('Listening to music');
          processedSummaries.add('music');
        }
        
        if (summary.includes('walk') && !processedSummaries.has('walk')) {
          boosters.push('Going for walks');
          processedSummaries.add('walk');
        }
        
        if (summary.includes('exercise') && !processedSummaries.has('exercise')) {
          boosters.push('Exercising or physical activity');
          processedSummaries.add('exercise');
        }
        
        if (summary.includes('organize') && !processedSummaries.has('organize')) {
          boosters.push('Organizing your space');
          processedSummaries.add('organize');
        }
        
        if (summary.includes('outdoor') && !processedSummaries.has('outdoor')) {
          boosters.push('Spending time outdoors');
          processedSummaries.add('outdoor');
        }
      });
    }
    
    // Fall back to mood pattern analysis if no specific summaries found
    if (boosters.length === 0) {
      if (highHappinessDays.length >= moodData.length * 0.25) {
        boosters.push('Finishing tasks and projects');
      }
      
      if (highEnergyDays.length >= moodData.length * 0.25) {
        boosters.push('Being productive during the day');
      }
      
      if (lowStressDays.length >= moodData.length * 0.3) {
        boosters.push('Taking breaks and resting');
      }
    }

    return boosters.length > 0 ? boosters.slice(0, 3) : [];
  }

  /**
   * Identify distractions from mood data and reflections
   * @param {Array} moodData - Array of mood data entries
   * @param {Array} enrichedData - Array of mood data with reflection summaries
   * @returns {Array} Array of activity-focused distraction descriptions
   */
  identifyDistractions(moodData, enrichedData = null) {
    const distractions = [];
    const dataWithSummaries = enrichedData || moodData;
    
    // Get days with low energy or high stress-low happiness
    const lowEnergyHighStress = moodData.filter(d => (d.energy || 0) <= 40 && (d.stress || 0) >= 50);
    const highStressLowHappiness = moodData.filter(d => (d.stress || 0) >= 60 && (d.happiness || 0) <= 50);
    const energyDrops = moodData.filter(d => (d.energy || 0) <= 35);
    
    // Analyze specific distracting activities from summaries
    const daysWithSummaries = dataWithSummaries.filter(d => d.summary && d.summary.trim().length > 0);
    const distractedDaysWithSummary = daysWithSummaries.filter(d => 
      ((d.energy || 0) <= 40 && (d.stress || 0) >= 50) || 
      ((d.stress || 0) >= 60 && (d.happiness || 0) <= 50) ||
      (d.energy || 0) <= 35
    );
    
    if (distractedDaysWithSummary.length > 0) {
      const processedDistractions = new Set();
      
      distractedDaysWithSummary.forEach(day => {
        const summary = (day.summary || '').toLowerCase();
        
        // Look for scrolling/social media activities
        if ((summary.includes('scroll') || summary.includes('social media') || summary.includes('instagram') || 
             summary.includes('facebook') || summary.includes('twitter') || summary.includes('tiktok') || 
             summary.includes('phone') || summary.includes('screen')) && 
            !processedDistractions.has('scrolling')) {
          distractions.push('Scrolling through social media endlessly');
          processedDistractions.add('scrolling');
        }
        
        // Look for procrastination activities
        if ((summary.includes('procrastinate') || summary.includes('avoid') || summary.includes('delay') || 
             summary.includes('put off') || summary.includes('postpone')) && 
            !processedDistractions.has('procrastination')) {
          distractions.push('Procrastinating on important tasks');
          processedDistractions.add('procrastination');
        }
        
        // Look for overthinking/worrying activities
        if ((summary.includes('overthink') || summary.includes('worry') || summary.includes('ruminate') || 
             summary.includes('overanalyze') || summary.includes('dwell')) && 
            !processedDistractions.has('overthinking')) {
          distractions.push('Overthinking or dwelling on problems');
          processedDistractions.add('overthinking');
        }
        
        // Look for excessive TV/entertainment
        if ((summary.includes('binge') || summary.includes('tv') || summary.includes('show') || 
             summary.includes('netflix') || summary.includes('streaming') || summary.includes('watch')) && 
            !processedDistractions.has('entertainment')) {
          distractions.push('Binge-watching shows or content');
          processedDistractions.add('entertainment');
        }
        
        // Look for multitasking
        if ((summary.includes('multitask') || summary.includes('doing multiple') || 
             summary.includes('switching between') || summary.includes('juggling')) && 
            !processedDistractions.has('multitasking')) {
          distractions.push('Trying to do too many things at once');
          processedDistractions.add('multitasking');
        }
        
        // Look for late-night activities
        if ((summary.includes('late night') || summary.includes('staying up') || summary.includes('sleepless') || 
             summary.includes('insomnia')) && 
            !processedDistractions.has('late')) {
          distractions.push('Staying up late or losing sleep');
          processedDistractions.add('late');
        }
        
        // Look for constant notifications/interruptions
        if ((summary.includes('notification') || summary.includes('interrupt') || summary.includes('disturb') || 
             summary.includes('alert') || summary.includes('message')) && 
            !processedDistractions.has('interruptions')) {
          distractions.push('Constant notifications or interruptions');
          processedDistractions.add('interruptions');
        }
        
        // Look for perfectionism
        if ((summary.includes('perfect') || summary.includes('redo') || summary.includes('redo') || 
             summary.includes('redoing') || summary.includes('fixing')) && 
            !processedDistractions.has('perfectionism')) {
          distractions.push('Getting stuck on perfecting details');
          processedDistractions.add('perfectionism');
        }
      });
    }
    
    // Fall back to activity-based patterns if no specific summaries found
    if (distractions.length === 0) {
      if (lowEnergyHighStress.length >= moodData.length * 0.2) {
        distractions.push('Letting stress drain your energy throughout the day');
      }
      
      if (highStressLowHappiness.length >= moodData.length * 0.25) {
        distractions.push('Allowing worries to consume your attention');
      }
      
      if (energyDrops.length >= moodData.length * 0.3) {
        distractions.push('Staying up late or not getting enough rest');
      }
    }

    return distractions.length > 0 ? distractions.slice(0, 3) : [];
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