import firestoreService from './firestoreService';
import { getDateIdDaysAgo, getDateId } from '../utils/dateUtils';

class HabitAnalysisService {
  constructor() {
    this.baseURL = 'https://ey2yvoq090rvrv-11434.proxy.runpod.net/';
    this.minDaysRequired = 30; // Minimum 30 days for meaningful habit analysis
    this.minMessagesRequired = 50; // Minimum 50 messages for analysis
  }

  /**
   * Analyze 3 months of chat history to identify patterns and suggest habits
   * @param {string} uid - User ID
   * @returns {Object} Analysis results with personalized habits
   */
  async analyzeHabits(uid) {
    console.log('🔍 Starting 3-month habit analysis...');
    
    try {
      // Fetch 3 months (90 days) of chat data
      const chatData = await this.fetchChatDataForPeriod(uid, 90);
      
      // Check if we have enough data
      if (!this.hasEnoughData(chatData)) {
        console.log('❌ Not enough chat data for habit analysis');
        return {
          success: false,
          hasEnoughData: false,
          message: `Not enough chat data for habit analysis. Need at least ${this.minDaysRequired} days of conversations with ${this.minMessagesRequired} messages.`,
          totalMessages: chatData.totalMessages,
          totalDays: chatData.activeDays,
          habits: []
        };
      }

      // Perform AI analysis for habit recommendations
      const habitAnalysis = await this.performHabitAnalysis(chatData);
      
      return {
        success: true,
        hasEnoughData: true,
        period: '3 months',
        totalMessages: chatData.totalMessages,
        totalDays: chatData.activeDays,
        habits: habitAnalysis.habits,
        patterns: habitAnalysis.patterns,
        struggles: habitAnalysis.struggles
      };

    } catch (error) {
      console.error('❌ Error in habit analysis:', error);
      return {
        success: false,
        hasEnoughData: false,
        error: error.message,
        habits: []
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
  hasEnoughData(chatData) {
    return chatData.totalMessages >= this.minMessagesRequired && chatData.activeDays >= this.minDaysRequired;
  }

  /**
   * Perform AI analysis on chat data to identify habits and patterns
   */
  async performHabitAnalysis(chatData) {
    console.log('🤖 Performing AI habit analysis on 3 months of chat data...');
    
    // Prepare conversation context for analysis
    const conversationContext = this.buildHabitAnalysisContext(chatData);
    
    const habitAnalysisPrompt = `You are an expert emotional wellness coach and habit formation specialist. Analyze the following 3 months of conversations between a user and an AI companion named Deite to identify recurring struggles, emotional patterns, and challenges.

Your task is to identify SPECIFIC, ACTIONABLE patterns and suggest exactly 3 practical habits that will help improve their emotional well-being.

## What to Look For:

1. **Recurring Struggles**: Specific challenges mentioned repeatedly
   - Examples: "work stress", "sleep issues", "social anxiety", "procrastination", "relationship conflicts"
   - Look for patterns in what triggers negative emotions

2. **Emotional Patterns**: How emotions cycle and what influences them
   - Examples: "mood drops on Mondays", "anxiety spikes before meetings", "happiness after exercise"
   - Identify what activities/events consistently affect their mood

3. **Behavioral Patterns**: Recurring behaviors that help or hurt
   - Examples: "staying up late scrolling", "skipping meals when stressed", "feeling better after talking to friends"
   - Look for both positive and negative patterns

## Critical Rules:
- ONLY suggest habits based on SPECIFIC patterns you can identify in the conversations
- Each habit must be directly addressing a recurring struggle you found
- Habits must be specific, measurable, and actionable
- Focus on habits that will solve the most frequent or impactful issues
- Each habit should have a clear "why" based on their actual patterns

## Chat Conversations to Analyze (Last 3 Months):
${conversationContext}

## Response Format:
Return a JSON object with this exact structure:

{
  "habits": [
    {
      "title": "Specific habit name",
      "description": "Clear, actionable description of what to do",
      "why": "Specific reason based on their patterns (e.g., 'You mentioned work stress 15 times in the last 3 months')",
      "frequency": "How often to do it (e.g., 'Daily', '3x per week', 'When feeling anxious')",
      "category": "stress_management|sleep|social|productivity|self_care|mindfulness"
    },
    {
      "title": "Second specific habit",
      "description": "Clear, actionable description",
      "why": "Specific reason based on their patterns",
      "frequency": "How often to do it",
      "category": "stress_management|sleep|social|productivity|self_care|mindfulness"
    },
    {
      "title": "Third specific habit",
      "description": "Clear, actionable description",
      "why": "Specific reason based on their patterns",
      "frequency": "How often to do it",
      "category": "stress_management|sleep|social|productivity|self_care|mindfulness"
    }
  ],
  "patterns": {
    "topStruggles": ["struggle1", "struggle2", "struggle3"],
    "emotionalTriggers": ["trigger1", "trigger2", "trigger3"],
    "positiveBehaviors": ["behavior1", "behavior2", "behavior3"]
  },
  "insights": {
    "mainChallenge": "Primary recurring challenge identified",
    "emotionalCycle": "How their emotions typically cycle",
    "keyOpportunity": "Biggest opportunity for improvement"
  }
}

IMPORTANT: 
- Maximum 3 habits, each addressing a different category
- Each habit must be based on SPECIFIC evidence from their conversations
- Be concrete and actionable, not abstract
- Focus on habits that will have the biggest impact on their most frequent struggles`;

    try {
      const response = await fetch(`${this.baseURL}api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3:70b',
          prompt: habitAnalysisPrompt,
          stream: false,
          options: {
            temperature: 0.3, // Lower temperature for more consistent analysis
            top_p: 0.9,
            max_tokens: 1000
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.response) {
        const analysisResult = this.parseHabitAnalysisResult(data.response);
        console.log('✅ AI habit analysis completed:', analysisResult);
        return analysisResult;
      } else {
        throw new Error('Invalid response format from API');
      }

    } catch (error) {
      console.error('❌ Error in AI habit analysis:', error);
      // Return default structure on error
      return {
        habits: [
          {
            title: "Daily Mood Check-in",
            description: "Take 2 minutes each morning to rate your mood and identify one thing you're grateful for",
            why: "Regular mood tracking helps identify patterns and build emotional awareness",
            frequency: "Daily",
            category: "mindfulness"
          },
          {
            title: "Evening Wind-down Routine",
            description: "Create a 30-minute routine before bed: no screens, gentle music, and reflection on the day",
            why: "Consistent sleep routine improves emotional regulation and reduces stress",
            frequency: "Daily",
            category: "self_care"
          },
          {
            title: "Weekly Social Connection",
            description: "Reach out to one friend or family member each week for a meaningful conversation",
            why: "Social connections provide emotional support and reduce feelings of isolation",
            frequency: "Weekly",
            category: "social"
          }
        ],
        patterns: {
          topStruggles: ["Analysis temporarily unavailable"],
          emotionalTriggers: ["Analysis temporarily unavailable"],
          positiveBehaviors: ["Analysis temporarily unavailable"]
        },
        insights: {
          mainChallenge: "Service temporarily unavailable",
          emotionalCycle: "Analysis temporarily unavailable",
          keyOpportunity: "Continue chatting to build pattern data"
        }
      };
    }
  }

  /**
   * Build conversation context for habit analysis
   */
  buildHabitAnalysisContext(chatData) {
    let context = `Habit Analysis Period: ${chatData.dateRange.start} to ${chatData.dateRange.end}\n`;
    context += `Total Messages: ${chatData.totalMessages}, Active Days: ${chatData.activeDays}\n\n`;
    
    // Sample conversations from different time periods to get a good spread
    const sampleSize = Math.min(20, chatData.conversations.length);
    const step = Math.max(1, Math.floor(chatData.conversations.length / sampleSize));
    
    for (let i = 0; i < chatData.conversations.length; i += step) {
      const day = chatData.conversations[i];
      context += `--- ${day.date} (${day.messageCount} messages) ---\n`;
      
      // Include user messages and AI responses for context
      const messagesToInclude = day.messages.slice(0, 15); // Limit to prevent too long prompts
      
      messagesToInclude.forEach(msg => {
        const sender = msg.sender === 'user' ? 'User' : 'Deite';
        const text = msg.text.length > 300 ? msg.text.substring(0, 300) + '...' : msg.text;
        context += `${sender}: "${text}"\n`;
      });
      
      context += '\n';
    }
    
    return context;
  }

  /**
   * Parse AI habit analysis result from response
   */
  parseHabitAnalysisResult(responseText) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        
        // Validate structure and provide defaults
        return {
          habits: Array.isArray(parsed.habits) ? parsed.habits.slice(0, 3).map(habit => ({
            title: habit.title || "Habit",
            description: habit.description || "Description not available",
            why: habit.why || "Based on your patterns",
            frequency: habit.frequency || "Daily",
            category: habit.category || "self_care"
          })) : [],
          patterns: {
            topStruggles: Array.isArray(parsed.patterns?.topStruggles) ? parsed.patterns.topStruggles.slice(0, 3) : [],
            emotionalTriggers: Array.isArray(parsed.patterns?.emotionalTriggers) ? parsed.patterns.emotionalTriggers.slice(0, 3) : [],
            positiveBehaviors: Array.isArray(parsed.patterns?.positiveBehaviors) ? parsed.patterns.positiveBehaviors.slice(0, 3) : []
          },
          insights: {
            mainChallenge: parsed.insights?.mainChallenge || "Not identified",
            emotionalCycle: parsed.insights?.emotionalCycle || "Not identified",
            keyOpportunity: parsed.insights?.keyOpportunity || "Continue tracking patterns"
          }
        };
      }
    } catch (parseError) {
      console.error('❌ Error parsing habit analysis result:', parseError);
    }

    // Fallback: return default habits
    return {
      habits: [
        {
          title: "Daily Mood Check-in",
          description: "Take 2 minutes each morning to rate your mood and identify one thing you're grateful for",
          why: "Regular mood tracking helps identify patterns and build emotional awareness",
          frequency: "Daily",
          category: "mindfulness"
        },
        {
          title: "Evening Wind-down Routine",
          description: "Create a 30-minute routine before bed: no screens, gentle music, and reflection on the day",
          why: "Consistent sleep routine improves emotional regulation and reduces stress",
          frequency: "Daily",
          category: "self_care"
        },
        {
          title: "Weekly Social Connection",
          description: "Reach out to one friend or family member each week for a meaningful conversation",
          why: "Social connections provide emotional support and reduce feelings of isolation",
          frequency: "Weekly",
          category: "social"
        }
      ],
      patterns: {
        topStruggles: ["Analysis incomplete"],
        emotionalTriggers: ["Analysis incomplete"],
        positiveBehaviors: ["Analysis incomplete"]
      },
      insights: {
        mainChallenge: "Analysis incomplete",
        emotionalCycle: "Analysis incomplete",
        keyOpportunity: "Continue chatting to build pattern data"
      }
    };
  }

  /**
   * Get cached habit analysis if available
   */
  getCachedHabitAnalysis(uid) {
    try {
      const cacheKey = `habit_analysis_${uid}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        const data = JSON.parse(cached);
        const cacheAge = Date.now() - new Date(data.timestamp).getTime();
        const maxCacheAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        
        if (cacheAge < maxCacheAge) {
          console.log(`✅ Using cached habit analysis (${Math.round(cacheAge / 60000)} minutes old)`);
          return data.analysis;
        }
      }
    } catch (error) {
      console.error('❌ Error getting cached habit analysis:', error);
    }
    
    return null;
  }

  /**
   * Cache habit analysis results
   */
  cacheHabitAnalysis(uid, analysis) {
    try {
      const cacheKey = `habit_analysis_${uid}`;
      const cacheData = {
        analysis,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log('✅ Habit analysis cached successfully');
    } catch (error) {
      console.error('❌ Error caching habit analysis:', error);
    }
  }

  /**
   * Main method with caching
   */
  async getHabitAnalysis(uid, useCache = true) {
    console.log(`🚀 Getting habit analysis for user ${uid} (cache: ${useCache})`);
    
    // Try cache first if enabled
    if (useCache) {
      const cached = this.getCachedHabitAnalysis(uid);
      if (cached) {
        return cached;
      }
    }

    // Perform fresh analysis
    const analysis = await this.analyzeHabits(uid);
    
    // Cache successful results
    if (analysis.success && useCache) {
      this.cacheHabitAnalysis(uid, analysis);
    }
    
    return analysis;
  }
}

export default new HabitAnalysisService();
