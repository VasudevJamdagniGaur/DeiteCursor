import firestoreService from './firestoreService';
import { getDateIdDaysAgo, getDateId } from '../utils/dateUtils';

class PatternAnalysisService {
  constructor() {
    // Updated to use RunPod Ollama directly
    this.baseURL = 'https://v1jsqencdtvwvq-11434.proxy.runpod.net';
    this.modelName = 'llama3:70b'; // Using the available model from your RunPod
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
   * Perform AI analysis on chat data using RunPod directly
   */
  async performAIAnalysis(chatData, days) {
    console.log('🤖 Performing AI analysis on chat data...');
    
    try {
      // Create conversation context from chat data
      const conversationContext = chatData.map(day => {
        const messages = day.messages || [];
        const messageTexts = messages.map(msg => `${msg.sender}: ${msg.text}`).join('\n');
        return `${day.date}: ${messageTexts}`;
      }).join('\n\n');

      const analysisPrompt = `You are an AI emotional pattern analyzer. Analyze the following conversation data and identify emotional triggers, joy sources, and distractions.

## Your Task:
Analyze the conversation patterns to identify:
1. **Triggers** - What consistently causes stress, anxiety, or negative emotions
2. **Joy Sources** - What consistently brings happiness, energy, or positive emotions  
3. **Distractions** - What consistently pulls attention away from important tasks or goals

## Conversation Data:
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
- Focus on actionable insights that can help improve emotional well-being
- Even with limited data, provide meaningful insights`;

      console.log('📤 PATTERN DEBUG: Sending request to RunPod Ollama...');

      // Use RunPod Ollama API directly
      const response = await fetch(`${this.baseURL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.modelName,
          prompt: analysisPrompt,
          stream: false,
          options: {
            temperature: 0.3,
            max_tokens: 1000
          }
        })
      });

      if (!response.ok) {
        throw new Error(`RunPod Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ PATTERN DEBUG: Received response from RunPod:', data);
      
      if (data.response) {
        const analysisResult = this.parseAnalysisResult(data.response);
        console.log('✅ AI analysis completed:', analysisResult);
        return analysisResult;
      } else {
        throw new Error('Invalid response format from API');
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
}

export default new PatternAnalysisService();