import firestoreService from './firestoreService';
import { getDateIdDaysAgo, getDateId } from '../utils/dateUtils';

class PatternAnalysisService {
  constructor() {
    this.baseURL = 'https://a837ndg5t3vn43-11434.proxy.runpod.net/';
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
}

export default new PatternAnalysisService();