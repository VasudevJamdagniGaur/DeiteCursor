class ChatService {
  constructor() {
    this.baseURL = 'https://3jya7uttzipxsb-11434.proxy.runpod.net';
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

  async analyzeChatContextForDay(messages, dayType, date) {
    console.log(`🔍 Analyzing chat context for ${dayType} day on ${date}...`);
    
    try {
      if (!messages || messages.length === 0) {
        return `No chat data available for ${date}, but emotional scores indicate this was a ${dayType === 'best' ? 'positive' : 'challenging'} day.`;
      }

      // Filter and prepare conversation content
      const userMessages = messages
        .filter(msg => msg.sender === 'user')
        .map(msg => msg.text.trim())
        .filter(text => text.length > 3);

      const aiMessages = messages
        .filter(msg => msg.sender === 'ai')
        .map(msg => msg.text.trim());

      if (userMessages.length === 0) {
        return `Limited chat activity on ${date}, but emotional patterns suggest this was a ${dayType === 'best' ? 'positive' : 'challenging'} day.`;
      }

      // Build conversation context
      let conversationContext = '';
      userMessages.forEach((userMsg, index) => {
        conversationContext += `User: "${userMsg}"\n`;
        if (aiMessages[index]) {
          const aiResponse = aiMessages[index].substring(0, 200);
          conversationContext += `Deite: "${aiResponse}${aiMessages[index].length > 200 ? '...' : ''}"\n\n`;
        }
      });

      const prompt = `Analyze this chat conversation from ${date} and explain what made this day ${dayType === 'best' ? 'the best/happiest' : 'the most challenging/difficult'} day.

**Chat Conversation:**
${conversationContext}

**Task:** Write 1-2 sentences explaining what specifically happened on this day that made it ${dayType === 'best' ? 'positive and uplifting' : 'challenging and difficult'}. Focus on:
- Specific topics discussed
- Emotions expressed
- Events mentioned
- Achievements or challenges shared
- Overall tone and context

Be specific about what the person talked about, not just general emotional states. Make it personal and contextual.`;

      const messages_api = [
        {
          role: 'system',
          content: 'You are an empathetic AI that analyzes conversations to understand what made specific days meaningful. Focus on concrete events, topics, and experiences mentioned in the chat.'
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
          messages: messages_api,
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
        return data.message.content.trim();
      }

      throw new Error('Invalid response format');

    } catch (error) {
      console.error(`❌ Error analyzing chat context for ${dayType} day:`, error);
      
      // Return fallback based on day type
      if (dayType === 'best') {
        return `This day showed exceptional positivity and high energy levels, indicating meaningful conversations and positive experiences.`;
      } else {
        return `This day presented significant challenges with elevated stress levels, suggesting difficult topics or situations were discussed.`;
      }
    }
  }

  async generatePersonalizedGuidance(lifetimeMessages, recentMessages, emotionalData, triggers) {
    console.log('🎯 Generating comprehensive personalized guidance...');
    
    try {
      if (!recentMessages || recentMessages.length === 0) {
        return {
          focus: "Continue building your emotional awareness through regular check-ins",
          strength: "Taking steps to understand your emotional patterns",
          actionStep: "Start by sharing your daily experiences and feelings",
          insight: "Regular emotional tracking is the foundation of wellbeing growth"
        };
      }

      // Prepare lifetime context (summarized)
      const lifetimeUserMessages = lifetimeMessages
        .filter(msg => msg.sender === 'user')
        .map(msg => msg.text.trim())
        .filter(text => text.length > 10);

      const lifetimeContext = lifetimeUserMessages.length > 0 
        ? this.summarizeLifetimeContext(lifetimeUserMessages)
        : "Limited historical context available";

      // Prepare recent detailed context (last 30 days)
      const recentUserMessages = recentMessages
        .filter(msg => msg.sender === 'user')
        .map(msg => ({
          text: msg.text.trim(),
          date: msg.dateId,
          timestamp: msg.timestamp
        }))
        .filter(msg => msg.text.length > 3);

      const recentAiMessages = recentMessages
        .filter(msg => msg.sender === 'ai')
        .map(msg => msg.text.trim());

      // Build recent conversation context
      let recentContext = '';
      recentUserMessages.slice(-20).forEach((userMsg, index) => {
        const date = new Date(userMsg.timestamp).toLocaleDateString();
        recentContext += `[${date}] User: "${userMsg.text}"\n`;
        if (recentAiMessages[index]) {
          const aiResponse = recentAiMessages[index].substring(0, 150);
          recentContext += `[${date}] Deite: "${aiResponse}${recentAiMessages[index].length > 150 ? '...' : ''}"\n\n`;
        }
      });

      // Calculate emotional trends
      const avgHappiness = emotionalData.reduce((sum, day) => sum + day.happiness, 0) / emotionalData.length;
      const avgEnergy = emotionalData.reduce((sum, day) => sum + day.energy, 0) / emotionalData.length;
      const avgAnxiety = emotionalData.reduce((sum, day) => sum + day.anxiety, 0) / emotionalData.length;
      const avgStress = emotionalData.reduce((sum, day) => sum + day.stress, 0) / emotionalData.length;

      const prompt = `As an expert emotional wellness coach, provide personalized guidance based on this person's complete chat history and recent conversations.

**LIFETIME CONTEXT SUMMARY:**
${lifetimeContext}

**RECENT CONVERSATIONS (Last 30 days):**
${recentContext}

**EMOTIONAL PATTERNS:**
- Average Happiness: ${Math.round(avgHappiness)}%
- Average Energy: ${Math.round(avgEnergy)}%
- Average Anxiety: ${Math.round(avgAnxiety)}%
- Average Stress: ${Math.round(avgStress)}%

**IDENTIFIED TRIGGERS:**
- Stress factors: ${triggers.stress?.join(', ') || 'Not identified'}
- Joy factors: ${triggers.joy?.join(', ') || 'Not identified'}
- Energy drains: ${triggers.distraction?.join(', ') || 'Not identified'}

**TASK:** Provide personalized guidance in this exact JSON format:
{
  "focus": "What they should focus on improving based on recent patterns and lifetime context",
  "strength": "What they're doing well based on their journey and growth",
  "actionStep": "One specific, actionable step they can take this week",
  "insight": "A deeper insight about their emotional patterns and growth journey",
  "recentObservation": "What you noticed about their recent conversations and emotional state",
  "lifetimeGrowth": "How they've grown or what patterns you see across their lifetime"
}

Focus on:
1. Recent events and conversations (last 30 days) as primary guidance
2. Use lifetime context to understand their overall journey and growth
3. Connect recent patterns to longer-term trends
4. Provide specific, actionable advice based on what they've actually shared
5. Be encouraging about their progress while addressing current challenges`;

      const messages = [
        {
          role: 'system',
          content: 'You are a compassionate emotional wellness coach with deep insight into human psychology. Provide personalized, actionable guidance based on comprehensive conversation history. Be specific, empathetic, and encouraging.'
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
            temperature: 0.8,
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
          const guidance = JSON.parse(jsonMatch[0]);
          return guidance;
        }
        
        throw new Error('Invalid JSON format in response');
      }

      throw new Error('Invalid response format');

    } catch (error) {
      console.error('❌ Error generating personalized guidance:', error);
      
      // Return fallback guidance
      return {
        focus: "Building emotional awareness and resilience",
        strength: "Taking proactive steps to understand your emotional patterns",
        actionStep: "Continue regular check-ins and be mindful of your emotional triggers",
        insight: "Emotional growth is a journey that requires patience and self-compassion",
        recentObservation: "Your commitment to emotional wellbeing is commendable",
        lifetimeGrowth: "Every conversation contributes to your emotional intelligence and self-awareness"
      };
    }
  }

  summarizeLifetimeContext(messages) {
    // Create a summary of key themes and patterns from lifetime messages
    const messageText = messages.slice(-100).join(' '); // Last 100 messages for context
    
    // Extract key themes (simplified approach)
    const themes = [];
    
    if (messageText.toLowerCase().includes('work') || messageText.toLowerCase().includes('job')) {
      themes.push('career/work discussions');
    }
    if (messageText.toLowerCase().includes('family') || messageText.toLowerCase().includes('relationship')) {
      themes.push('family/relationship topics');
    }
    if (messageText.toLowerCase().includes('stress') || messageText.toLowerCase().includes('anxiety')) {
      themes.push('stress and anxiety management');
    }
    if (messageText.toLowerCase().includes('goal') || messageText.toLowerCase().includes('dream')) {
      themes.push('personal goals and aspirations');
    }
    if (messageText.toLowerCase().includes('health') || messageText.toLowerCase().includes('exercise')) {
      themes.push('health and wellness');
    }
    
    return `Historical conversations have covered: ${themes.length > 0 ? themes.join(', ') : 'various personal topics'}. Total conversation history: ${messages.length} messages showing ongoing emotional growth journey.`;
  }

  async analyzeEmotionalBalance(messages, period) {
    console.log(`🎭 Analyzing emotional balance for ${period} period with ${messages.length} messages...`);
    
    try {
      if (!messages || messages.length === 0) {
        return {
          positive: 50,
          neutral: 30,
          negative: 20,
          insight: `No chat data available for ${period}. Start conversations with Deite to build emotional insights.`,
          dominantEmotion: 'neutral',
          balanceScore: 65
        };
      }

      // Filter and prepare conversation content
      const userMessages = messages
        .filter(msg => msg.sender === 'user')
        .map(msg => ({
          text: msg.text.trim(),
          date: msg.dateId,
          timestamp: msg.timestamp
        }))
        .filter(msg => msg.text.length > 3);

      if (userMessages.length === 0) {
        return {
          positive: 50,
          neutral: 30,
          negative: 20,
          insight: `Limited conversation activity in ${period}. More detailed conversations will improve emotional balance analysis.`,
          dominantEmotion: 'neutral',
          balanceScore: 65
        };
      }

      // Build conversation context for analysis
      let conversationContext = '';
      userMessages.slice(-30).forEach((msg) => {
        const date = new Date(msg.timestamp).toLocaleDateString();
        conversationContext += `[${date}] "${msg.text}"\n`;
      });

      const prompt = `Analyze the emotional balance in these conversations over ${period} and provide insights about positivity vs negativity.

**Conversations to analyze:**
${conversationContext}

**Task:** Analyze the overall emotional tone and provide results in this exact JSON format:
{
  "positive": [0-100 number representing positive emotions/experiences],
  "neutral": [0-100 number representing neutral/balanced emotions],
  "negative": [0-100 number representing negative emotions/challenges],
  "insight": "Brief insight about the emotional balance and what contributed to it",
  "dominantEmotion": "positive/neutral/negative",
  "balanceScore": [0-100 overall emotional health score],
  "keyObservations": "What you noticed about their emotional patterns"
}

**Analysis Guidelines:**
- Positive: Joy, gratitude, excitement, achievements, hope, love, satisfaction
- Neutral: Daily activities, factual discussions, balanced perspectives
- Negative: Stress, anxiety, sadness, frustration, worry, conflict, challenges
- The three scores should add up to approximately 100
- Consider the overall tone, not just isolated words
- Focus on genuine emotional expression, not surface-level responses
- Balance score: overall emotional wellbeing (higher = better balance)`;

      const messages_api = [
        {
          role: 'system',
          content: 'You are an expert emotional analyst. Analyze conversations to determine emotional balance with accuracy and empathy. Focus on genuine emotional content and overall patterns.'
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
          messages: messages_api,
          stream: false,
          options: {
            temperature: 0.3,
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
          
          // Validate and normalize scores
          const total = analysis.positive + analysis.neutral + analysis.negative;
          if (total > 0) {
            analysis.positive = Math.round((analysis.positive / total) * 100);
            analysis.neutral = Math.round((analysis.neutral / total) * 100);
            analysis.negative = Math.round((analysis.negative / total) * 100);
          }
          
          // Ensure scores are within bounds
          analysis.positive = Math.max(0, Math.min(100, analysis.positive));
          analysis.neutral = Math.max(0, Math.min(100, analysis.neutral));
          analysis.negative = Math.max(0, Math.min(100, analysis.negative));
          analysis.balanceScore = Math.max(0, Math.min(100, analysis.balanceScore || 70));
          
          return analysis;
        }
        
        throw new Error('Invalid JSON format in response');
      }

      throw new Error('Invalid response format');

    } catch (error) {
      console.error(`❌ Error analyzing emotional balance for ${period}:`, error);
      
      // Return fallback analysis
      return {
        positive: 60,
        neutral: 25,
        negative: 15,
        insight: `Analysis unavailable for ${period}. Based on your engagement, you show positive emotional patterns.`,
        dominantEmotion: 'positive',
        balanceScore: 70,
        keyObservations: 'Your willingness to engage in emotional tracking shows positive self-awareness.'
      };
    }
  }
}

export default new ChatService();
