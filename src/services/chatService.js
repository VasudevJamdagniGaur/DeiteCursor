class ChatService {
  constructor() {
    this.baseURL = 'https://a02e6t44mrmvgx-11434.proxy.runpod.net/';
  }

  async sendMessage(userMessage, conversationHistory = []) {
    console.log('🚀 Sending message to RunPod:', userMessage);
    
    try {
      // Prepare messages for the API
      const messages = [
        {
          role: 'system',
          content: 'You are Deite, a warm and emotionally intelligent AI companion. Respond naturally and empathetically to the user.'
        },
        // Add conversation history
        ...conversationHistory.slice(-5).map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        })),
        {
          role: 'user',
          content: userMessage
        }
      ];

      console.log('📤 Making API request...');

      const response = await fetch(`${this.baseURL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3:70b',
          messages: messages,
          stream: false
        })
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Response received:', data);

      if (data.message && data.message.content) {
        return data.message.content.trim();
      }

      throw new Error('Invalid response format');

    } catch (error) {
      console.error('❌ Chat error:', error);
      throw error;
    }
  }

  async generateDayDescription(emotionalData, dayType, period) {
    console.log(`🤖 Generating ${dayType} day description for ${period}...`);
    
    try {
      const { happiness, energy, stress, anxiety, timestamp } = emotionalData;
      const date = new Date(timestamp).toLocaleDateString();
      
      let prompt;
      if (dayType === 'best') {
        prompt = `On ${date}, this person had their best mood day in the ${period} with happiness at ${happiness}%, energy at ${energy}%, stress at ${stress}%, and anxiety at ${anxiety}%. In 1-2 sentences, explain what likely made this such a positive day based on these emotional levels. Be warm and encouraging.`;
      } else {
        prompt = `On ${date}, this person had their most challenging day in the ${period} with happiness at ${happiness}%, energy at ${energy}%, stress at ${stress}%, and anxiety at ${anxiety}%. In 1-2 sentences, explain what might have made this day difficult based on these emotional levels. Be empathetic and supportive.`;
      }

      const messages = [
        {
          role: 'system',
          content: 'You are an empathetic emotional wellness assistant. Provide brief, insightful explanations about emotional patterns. Keep responses to 1-2 sentences maximum and focus on the emotional data provided.'
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      const response = await fetch(`${this.baseURL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3:70b',
          messages: messages,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.message && data.message.content) {
        return data.message.content.trim();
      }

      throw new Error('Invalid response format');

    } catch (error) {
      console.error(`❌ Error generating ${dayType} day description:`, error);
      // Return fallback descriptions
      if (dayType === 'best') {
        return "Your high energy and happiness levels created an optimal emotional state for a fulfilling day.";
      } else {
        return "Elevated stress and anxiety levels made this a more challenging day to navigate.";
      }
    }
  }

  async generateComprehensiveAnalysis(emotionalData, period) {
    console.log(`🤖 Generating comprehensive AI analysis for ${period} period...`);
    
    try {
      // Prepare emotional data summary
      const dataLength = emotionalData.length;
      if (dataLength === 0) {
        throw new Error('No emotional data available for analysis');
      }

      // Calculate averages
      const avgHappiness = emotionalData.reduce((sum, day) => sum + day.happiness, 0) / dataLength;
      const avgEnergy = emotionalData.reduce((sum, day) => sum + day.energy, 0) / dataLength;
      const avgAnxiety = emotionalData.reduce((sum, day) => sum + day.anxiety, 0) / dataLength;
      const avgStress = emotionalData.reduce((sum, day) => sum + day.stress, 0) / dataLength;

      // Find extremes
      const bestDay = emotionalData.reduce((best, current) => 
        (current.happiness + current.energy) > (best.happiness + best.energy) ? current : best
      );
      const worstDay = emotionalData.reduce((worst, current) => 
        (current.anxiety + current.stress) > (worst.anxiety + worst.stress) ? current : worst
      );

      const prompt = `As an AI emotional wellness analyst, analyze this person's emotional data over ${period} and provide insights in JSON format.

**Emotional Data Summary:**
- Period: ${period}
- Days tracked: ${dataLength}
- Average Happiness: ${Math.round(avgHappiness)}%
- Average Energy: ${Math.round(avgEnergy)}%
- Average Anxiety: ${Math.round(avgAnxiety)}%
- Average Stress: ${Math.round(avgStress)}%
- Best day: ${new Date(bestDay.timestamp).toLocaleDateString()} (H:${bestDay.happiness}%, E:${bestDay.energy}%)
- Most challenging day: ${new Date(worstDay.timestamp).toLocaleDateString()} (A:${worstDay.anxiety}%, S:${worstDay.stress}%)

Provide analysis in this exact JSON format:
{
  "highlights": {
    "bestDayReason": "Brief explanation why this was the best day based on emotional scores",
    "challengingDayReason": "Brief explanation why this was the most challenging day"
  },
  "triggers": {
    "stressFactors": ["factor1", "factor2", "factor3"],
    "joyFactors": ["factor1", "factor2", "factor3"],
    "energyDrains": ["factor1", "factor2", "factor3"]
  },
  "patterns": {
    "overallTrend": "improving/stable/declining",
    "keyInsight": "Main pattern observed in the data",
    "recommendation": "Specific actionable advice"
  },
  "emotionalBalance": {
    "dominantEmotion": "happiness/energy/anxiety/stress",
    "balanceScore": 75,
    "insight": "Brief insight about emotional balance"
  },
  "personalizedGuidance": {
    "focus": "What to focus on improving",
    "strength": "What they're doing well",
    "actionStep": "One specific action to take"
  }
}`;

      const messages = [
        {
          role: 'system',
          content: 'You are an expert emotional wellness analyst. Provide detailed, empathetic, and actionable insights based on emotional data. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      const response = await fetch(`${this.baseURL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3:70b',
          messages: messages,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.message && data.message.content) {
        const responseText = data.message.content.trim();
        
        // Parse JSON response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);
          return analysis;
        }
        
        throw new Error('Invalid JSON format in response');
      }

      throw new Error('Invalid response format');

    } catch (error) {
      console.error(`❌ Error generating comprehensive analysis:`, error);
      
      // Return fallback analysis
      return {
        highlights: {
          bestDayReason: "High energy and happiness levels created an optimal emotional state.",
          challengingDayReason: "Elevated stress and anxiety levels made this day more difficult."
        },
        triggers: {
          stressFactors: ["Work pressure", "Time constraints", "Uncertainty"],
          joyFactors: ["Meaningful conversations", "Personal achievements", "Relaxation"],
          energyDrains: ["Overthinking", "Worry cycles", "Fatigue"]
        },
        patterns: {
          overallTrend: "stable",
          keyInsight: "Your emotional patterns show normal daily variations.",
          recommendation: "Continue monitoring and practicing self-care."
        },
        emotionalBalance: {
          dominantEmotion: "happiness",
          balanceScore: 70,
          insight: "Generally maintaining good emotional balance with room for improvement."
        },
        personalizedGuidance: {
          focus: "Stress management and energy conservation",
          strength: "Maintaining positive outlook during challenges",
          actionStep: "Practice 5-minute mindfulness sessions daily"
        }
      };
    }
  }
}

export default new ChatService();
