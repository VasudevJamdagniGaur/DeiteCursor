import firestoreService from './firestoreService';
import { getDateIdDaysAgo, getDateId } from '../utils/dateUtils';

class PatternAnalysisService {
  constructor() {
    this.baseURL = 'https://2bgkbfa5o788fb-11434.proxy.runpod.net/';
    this.minDaysRequired = 3; // Minimum days needed for meaningful analysis
    this.minMessagesRequired = 8; // Minimum total messages needed
    this.minDaysFor3Months = 7; // Minimum days for 3-month analysis
    this.minMessagesFor3Months = 15; // Minimum messages for 3-month analysis
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
      // Fetch chat data for the specified period
      const chatData = await this.fetchChatDataForPeriod(uid, days);
      
      // Check if we have enough data
      if (!this.hasEnoughData(chatData, days)) {
        console.log('❌ Not enough chat data for analysis');
        const minDays = days >= 90 ? this.minDaysFor3Months : this.minDaysRequired;
        const minMessages = days >= 90 ? this.minMessagesFor3Months : this.minMessagesRequired;
        return {
          success: false,
          hasEnoughData: false,
          message: `Not enough chat data for ${days >= 90 ? '3-month' : days === 7 ? 'weekly' : 'monthly'} analysis. Need at least ${minDays} days of conversations with ${minMessages} messages.`,
          totalMessages: chatData.totalMessages,
          totalDays: chatData.activeDays,
          triggers: {
            stress: [],
            joy: [],
            distraction: []
          }
        };
      }

      // Perform AI analysis
      const analysis = await this.performAIAnalysis(chatData, days);
      
      return {
        success: true,
        hasEnoughData: true,
        period: days === 7 ? 'week' : 'month',
        totalMessages: chatData.totalMessages,
        totalDays: chatData.activeDays,
        triggers: analysis.triggers,
        insights: analysis.insights,
        recommendations: analysis.recommendations
      };

    } catch (error) {
      console.error('❌ Error in pattern analysis:', error);
      return {
        success: false,
        hasEnoughData: false,
        error: error.message,
        triggers: {
          stress: [],
          joy: [],
          distraction: []
        }
      };
    }
  }

  /**
   * Fetch chat data for a specific period
   */
  async fetchChatDataForPeriod(uid, days) {
    console.log(`📅 Fetching chat data for last ${days} days...`);
    
    const chatData = {
      conversations: [],
      totalMessages: 0,
      activeDays: 0,
      dateRange: {
        start: getDateIdDaysAgo(days - 1),
        end: getDateId()
      }
    };

    // Get all chat days in the period
    for (let i = 0; i < days; i++) {
      const dateId = getDateIdDaysAgo(i);
      const messagesResult = await firestoreService.getMessages(uid, dateId);
      
      if (messagesResult.success && messagesResult.messages.length > 0) {
        const dayConversation = {
          date: dateId,
          messages: messagesResult.messages,
          messageCount: messagesResult.messages.length
        };
        
        chatData.conversations.push(dayConversation);
        chatData.totalMessages += messagesResult.messages.length;
        chatData.activeDays++;
      }
    }

    console.log(`✅ Fetched ${chatData.totalMessages} messages across ${chatData.activeDays} active days`);
    return chatData;
  }

  /**
   * Check if we have enough data for meaningful analysis
   */
  hasEnoughData(chatData, days = 7) {
    if (days >= 90) {
      // For 3-month analysis, use more lenient requirements
      return chatData.totalMessages >= this.minMessagesFor3Months && chatData.activeDays >= this.minDaysFor3Months;
    }
    return chatData.totalMessages >= this.minMessagesRequired && chatData.activeDays >= this.minDaysRequired;
  }

  /**
   * Perform AI analysis on chat data
   */
  async performAIAnalysis(chatData, days) {
    console.log('🤖 Performing AI analysis on chat data...');
    
    // Prepare conversation context for analysis
    const conversationContext = this.buildAnalysisContext(chatData);
    
    const analysisPrompt = `You are an expert emotional intelligence analyst. Analyze the following chat conversations between a user and an AI companion named Deite from the last ${days >= 90 ? '3 months' : days === 7 ? 'week' : 'month'}.

Your task is to identify SPECIFIC, CONCRETE triggers and patterns from the actual conversations. DO NOT use generic categories.

## What to Look For:

1. **Stress Triggers**: SPECIFIC things mentioned that caused stress, anxiety, or negative emotions
   - Example: "work deadlines", "argument with mom", "financial concerns", "health issues", "social anxiety", "family conflicts"
   - NOT: "high stress conversations", "complex decisions"

2. **Joy Boosters**: SPECIFIC activities, people, or situations that brought happiness or comfort
   - Example: "talking to friends", "listening to music", "weekend plans", "good news about job", "exercise", "hobbies"
   - NOT: "meaningful conversations", "emotional support"

3. **Distractions**: SPECIFIC things that scattered focus or caused overthinking
   - Example: "social media scrolling", "worrying about exam results", "relationship doubts", "procrastination", "overthinking"
   - NOT: "overthinking patterns", "worry cycles"

## Critical Rules:
- ONLY include triggers that are specifically mentioned or clearly implied in the conversations
- Use the user's actual words and context when possible
- If you cannot find specific triggers, provide general but helpful fallbacks based on common patterns
- Be concrete and actionable, not abstract
- Each trigger should be something the user can recognize and act upon
- For 3-month analysis, look for recurring themes and patterns across the entire period

## Chat Conversations to Analyze:
${conversationContext}

## Response Format:
Return a JSON object with this exact structure:

{
  "triggers": {
    "stress": ["specific trigger from conversations", "another specific trigger"],
    "joy": ["specific joy source from conversations", "another specific source"],
    "distraction": ["specific distraction from conversations", "another specific distraction"]
  },
  "insights": {
    "primaryStressSource": "most frequently mentioned stress source",
    "mainJoySource": "most frequently mentioned joy source", 
    "behavioralPattern": "clear pattern observed from conversations"
  },
  "recommendations": [
    "specific actionable advice based on identified triggers",
    "another specific recommendation",
    "third specific recommendation"
  ]
}

IMPORTANT: 
- Maximum 3-4 items per category
- If no clear patterns exist, provide helpful general triggers based on common emotional patterns
- Be specific, not generic
- Focus on actionable insights that can help improve emotional well-being`;

    try {
      const response = await fetch(`${this.baseURL}api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3:70b',
          prompt: analysisPrompt,
          stream: false,
          options: {
            temperature: 0.3, // Lower temperature for more consistent analysis
            top_p: 0.9
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.response) {
        const analysisResult = this.parseAnalysisResult(data.response);
        console.log('✅ AI analysis completed:', analysisResult);
        return analysisResult;
      } else if (data.message && data.message.content) {
        const analysisResult = this.parseAnalysisResult(data.message.content);
        console.log('✅ AI analysis completed:', analysisResult);
        return analysisResult;
      } else {
        throw new Error('Invalid response format from API');
      }

    } catch (error) {
      console.error('❌ Error in AI analysis:', error);
      // Return default structure on error
      return {
        triggers: {
          stress: ["Work pressure", "Time constraints", "Uncertainty about future"],
          joy: ["Meaningful conversations", "Personal achievements", "Time with loved ones"],
          distraction: ["Overthinking", "Social media scrolling", "Worry cycles"]
        },
        insights: {
          primaryStressSource: "General life pressures",
          mainJoySource: "Social connections and personal growth",
          behavioralPattern: "Building emotional awareness through conversation"
        },
        recommendations: [
          "Continue chatting to build more specific pattern data",
          "Share specific details about your daily experiences",
          "Try to identify what activities bring you the most joy"
        ]
      };
    }
  }

  /**
   * Build conversation context for AI analysis
   */
  buildAnalysisContext(chatData) {
    let context = `Analysis Period: ${chatData.dateRange.start} to ${chatData.dateRange.end}\n`;
    context += `Total Messages: ${chatData.totalMessages}, Active Days: ${chatData.activeDays}\n\n`;
    
    chatData.conversations.forEach(day => {
      context += `--- ${day.date} (${day.messageCount} messages) ---\n`;
      
      // Include user messages and AI responses for context
      const messagesToInclude = day.messages.slice(0, 20); // Limit to prevent too long prompts
      
      messagesToInclude.forEach(msg => {
        const sender = msg.sender === 'user' ? 'User' : 'Deite';
        const text = msg.text.length > 200 ? msg.text.substring(0, 200) + '...' : msg.text;
        context += `${sender}: "${text}"\n`;
      });
      
      context += '\n';
    });
    
    return context;
  }

  /**
   * Parse AI analysis result from response
   */
  parseAnalysisResult(responseText) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        
        // Validate structure and provide defaults
        return {
          triggers: {
            stress: Array.isArray(parsed.triggers?.stress) ? parsed.triggers.stress.slice(0, 5) : [],
            joy: Array.isArray(parsed.triggers?.joy) ? parsed.triggers.joy.slice(0, 5) : [],
            distraction: Array.isArray(parsed.triggers?.distraction) ? parsed.triggers.distraction.slice(0, 5) : []
          },
          insights: {
            primaryStressSource: parsed.insights?.primaryStressSource || "Not identified",
            mainJoySource: parsed.insights?.mainJoySource || "Not identified",
            behavioralPattern: parsed.insights?.behavioralPattern || "No clear pattern"
          },
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 3) : []
        };
      }
    } catch (parseError) {
      console.error('❌ Error parsing analysis result:', parseError);
    }

    // Fallback: try to extract patterns from text
    return this.extractPatternsFromText(responseText);
  }

  /**
   * Fallback method to extract patterns from text response
   */
  extractPatternsFromText(text) {
    const defaultResult = {
      triggers: {
        stress: ["Work pressure", "Time constraints", "Uncertainty about future"],
        joy: ["Meaningful conversations", "Personal achievements", "Time with loved ones"],
        distraction: ["Overthinking", "Social media scrolling", "Worry cycles"]
      },
      insights: {
        primaryStressSource: "General life pressures",
        mainJoySource: "Social connections and personal growth", 
        behavioralPattern: "Building emotional awareness through conversation"
      },
      recommendations: [
        "Continue chatting to build more specific pattern data",
        "Share specific details about your daily experiences",
        "Try to identify what activities bring you the most joy"
      ]
    };

    try {
      // Simple text extraction (basic fallback)
      const lines = text.split('\n').filter(line => line.trim());
      
      let currentCategory = null;
      lines.forEach(line => {
        const lowerLine = line.toLowerCase();
        
        if (lowerLine.includes('stress') && lowerLine.includes('trigger')) {
          currentCategory = 'stress';
        } else if (lowerLine.includes('joy') || lowerLine.includes('booster')) {
          currentCategory = 'joy';  
        } else if (lowerLine.includes('distraction')) {
          currentCategory = 'distraction';
        } else if (currentCategory && line.trim().startsWith('-')) {
          const item = line.replace(/^-\s*/, '').trim();
          if (item && defaultResult.triggers[currentCategory].length < 3) {
            defaultResult.triggers[currentCategory].push(item);
          }
        }
      });

      return defaultResult;
    } catch (error) {
      console.error('❌ Error extracting patterns from text:', error);
      return defaultResult;
    }
  }

  /**
   * Get cached analysis results if available
   */
  getCachedAnalysis(uid, days) {
    try {
      const cacheKey = `pattern_analysis_${uid}_${days}d`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        const data = JSON.parse(cached);
        const cacheAge = Date.now() - new Date(data.timestamp).getTime();
        const maxCacheAge = days === 7 ? 6 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 6 hours for week, 24 hours for month
        
        if (cacheAge < maxCacheAge) {
          console.log(`✅ Using cached analysis (${Math.round(cacheAge / 60000)} minutes old)`);
          return data.analysis;
        }
      }
    } catch (error) {
      console.error('❌ Error getting cached analysis:', error);
    }
    
    return null;
  }

  /**
   * Cache analysis results
   */
  cacheAnalysis(uid, days, analysis) {
    try {
      const cacheKey = `pattern_analysis_${uid}_${days}d`;
      const cacheData = {
        analysis,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log('✅ Analysis cached successfully');
    } catch (error) {
      console.error('❌ Error caching analysis:', error);
    }
  }

  /**
   * Main method with caching
   */
  async getPatternAnalysis(uid, days = 7, useCache = true) {
    console.log(`🚀 Getting pattern analysis for ${days} days (cache: ${useCache})`);
    
    // Try cache first if enabled
    if (useCache) {
      const cached = this.getCachedAnalysis(uid, days);
      if (cached) {
        return cached;
      }
    }

    // Perform fresh analysis
    const analysis = await this.analyzePatterns(uid, days);
    
    // Cache successful results
    if (analysis.success && useCache) {
      this.cacheAnalysis(uid, days, analysis);
    }
    
    return analysis;
  }
}

export default new PatternAnalysisService();
