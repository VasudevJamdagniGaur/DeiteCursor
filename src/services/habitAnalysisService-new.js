import firestoreService from './firestoreService';
import { getDateIdDaysAgo } from '../utils/dateUtils';

class HabitAnalysisService {
  constructor() {
    // Updated to use the new backend server with warm-up system
    this.baseURL = 'http://localhost:3001';
    this.backendAnalysisEndpoint = `${this.baseURL}/api/pattern-analysis`; // Reuse pattern analysis endpoint
    this.minDaysRequired = 1; // Minimum days needed for meaningful analysis
    this.minMessagesRequired = 1; // Minimum total messages needed
  }

  /**
   * Analyze habits and patterns from 3 months of chat data
   * @param {string} uid - User ID
   * @returns {Object} Analysis results with habits, patterns, and insights
   */
  async analyzeHabits(uid) {
    console.log('🔍 Starting habit analysis for 3 months...');
    
    try {
      // Get 3 months of chat data
      const chatData = await this.getChatData(uid, 90); // 3 months
      
      if (!this.hasEnoughData(chatData)) {
        console.log('⚠️ Not enough data for habit analysis');
        return this.getDefaultHabitAnalysis();
      }
      
      // Perform AI analysis using backend
      const analysisResult = await this.performHabitAnalysis(chatData);
      
      console.log('✅ Habit analysis completed:', analysisResult);
      return analysisResult;
      
    } catch (error) {
      console.error('❌ Error in habit analysis:', error);
      return this.getDefaultHabitAnalysis();
    }
  }

  /**
   * Perform AI analysis on chat data using backend
   */
  async performHabitAnalysis(chatData) {
    console.log('🤖 Performing AI habit analysis on 3 months of chat data...');
    
    try {
      // Use the new backend API with warm-up system
      const response = await fetch(this.backendAnalysisEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatData: chatData,
          days: 90 // 3 months
        })
      });

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log('✅ AI habit analysis completed:', data);
      console.log('✅ Model warmed up:', data.modelWarmedUp);
      
      return data.analysis || this.getDefaultHabitAnalysis();
      
    } catch (error) {
      console.error('❌ Error in AI habit analysis:', error);
      return this.getDefaultHabitAnalysis();
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
  hasEnoughData(chatData) {
    const totalMessages = chatData.reduce((sum, day) => sum + (day.messages?.length || 0), 0);
    const daysWithData = chatData.length;
    
    return daysWithData >= this.minDaysRequired && totalMessages >= this.minMessagesRequired;
  }

  /**
   * Get default habit analysis when no data is available
   */
  getDefaultHabitAnalysis() {
    return {
      habits: [
        {
          title: 'Daily Reflection',
          description: 'Take 5 minutes each evening to reflect on your day',
          why: 'Regular reflection helps process emotions and identify patterns',
          frequency: 'Daily',
          category: 'mindfulness'
        },
        {
          title: 'Stress Management',
          description: 'Practice deep breathing when feeling overwhelmed',
          why: 'Helps manage stress and anxiety in the moment',
          frequency: 'When feeling stressed',
          category: 'stress_management'
        },
        {
          title: 'Gratitude Practice',
          description: 'Write down three things you\'re grateful for each day',
          why: 'Focuses attention on positive aspects of life',
          frequency: 'Daily',
          category: 'self_care'
        }
      ],
      patterns: {
        topStruggles: ['Work stress', 'Time management', 'Self-doubt'],
        emotionalTriggers: ['Deadlines', 'Criticism', 'Uncertainty'],
        positiveBehaviors: ['Problem-solving', 'Seeking support', 'Learning new things']
      },
      insights: {
        mainChallenge: 'Balancing work demands with personal well-being',
        emotionalCycle: 'Stress builds up during work, relief comes from personal activities',
        keyOpportunity: 'Developing consistent stress management routines'
      }
    };
  }
}

export default new HabitAnalysisService();
