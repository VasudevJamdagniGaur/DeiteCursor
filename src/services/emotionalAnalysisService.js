class EmotionalAnalysisService {
  constructor() {
    this.baseURL = 'https://huccz96dzpalfa-11434.proxy.runpod.net/';
  }

  async analyzeEmotionalScores(messages) {
    console.log('🧠 Starting emotional analysis...');
    console.log('🔍 EMOTIONAL DEBUG: messages type:', typeof messages, 'length:', messages?.length);
    
    // Safety check and fix for messages
    if (!messages || !Array.isArray(messages)) {
      console.error('❌ EMOTIONAL ERROR: Invalid messages array, using defaults');
      return {
        happiness: 50,
        energy: 50,
        anxiety: 25,
        stress: 25
      };
    }
    
    console.log('💬 Analyzing messages:', messages.length);

    if (!messages || messages.length === 0) {
      return {
        happiness: 50,
        energy: 50,
        anxiety: 25,
        stress: 25
      };
    }

    // Create daily conversation transcript from ALL messages
    const conversationTranscript = this.createDailyTranscript(messages);
    console.log('📄 Daily conversation transcript created, length:', conversationTranscript.length);
    console.log('📄 Transcript preview:', conversationTranscript.slice(0, 300));

    if (conversationTranscript.length < 20) {
      console.log('⚠️ Conversation too short for analysis');
      return {
        happiness: 50,
        energy: 50,
        anxiety: 25,
        stress: 25
      };
    }
    
    const analysisPrompt = `Your task is to analyze a person's daily chat conversation and assign numeric scores (0–100) to four emotional states:
1. Happiness
2. Energy  
3. Anxiety
4. Stress

### Rules for Scoring:
- 0 = Not present at all.
- 25 = Mild presence.
- 50 = Moderate presence.
- 75 = Strong presence.
- 100 = Very intense/overwhelming presence.

### Guidelines:
- Happiness is shown by positivity, joy, gratitude, humor, optimism, or excitement.
- Energy is shown by motivation, enthusiasm, activity level, and engagement. Fatigue or low motivation lowers this score.
- Anxiety is shown by worry, nervousness, overthinking, fear, or uncertainty.
- Stress is shown by pressure, overwhelm, frustration, deadlines, or tension.

### Important:
- Consider the overall **tone of the full chat**, not just isolated words.
- If multiple emotions appear, balance them. Example: "I was stressed earlier, but felt relaxed later" → stress score should be moderate, not extreme.
- If emotions are mixed, distribute appropriately (e.g., both high stress and some happiness can coexist).
- Always return a JSON object with integer scores only.

Daily Conversation Transcript:
${conversationTranscript}

Analyze this conversation and rate the user's happiness, stress, anxiety, and energy on a scale of 0–100, where 0 means none and 100 means very high.

Return ONLY a JSON object with integer scores:
{
  "happiness": 0-100,
  "energy": 0-100,
  "anxiety": 0-100,
  "stress": 0-100
}`;

    try {
      console.log('🌐 Making API call for emotional analysis...');

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
            temperature: 0.3,
            top_p: 0.9,
            max_tokens: 200
          }
        })
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', response.status, errorText);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Raw response received');

      if (data.response) {
        const responseText = data.response.trim();
        console.log('📊 AI Analysis response:', responseText);

        // Parse the JSON response
        try {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const scores = JSON.parse(jsonMatch[0]);
            
            // Validate and clamp scores to 0-100
            const validatedScores = {
              happiness: Math.max(0, Math.min(100, parseInt(scores.happiness) || 50)),
              energy: Math.max(0, Math.min(100, parseInt(scores.energy) || 50)),
              anxiety: Math.max(0, Math.min(100, parseInt(scores.anxiety) || 25)),
              stress: Math.max(0, Math.min(100, parseInt(scores.stress) || 25))
            };
            
            console.log('✅ AI Emotional scores validated:', validatedScores);
            return validatedScores;
          }
        } catch (parseError) {
          console.error('❌ JSON parse error:', parseError.message);
          console.log('Raw response for debugging:', responseText);
        }
      }
      
      throw new Error('Could not parse AI response');

    } catch (error) {
      console.error('💥 Error in emotional analysis:', error);
      // Return default scores if analysis fails
      return {
        happiness: 50,
        energy: 50,
        anxiety: 25,
        stress: 25
      };
    }
  }

  parseEmotionalScores(responseText) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        
        // Validate and clamp scores
        const scores = {
          happiness: this.clampScore(parsed.happiness || 50),
          energy: this.clampScore(parsed.energy || 50),
          anxiety: this.clampScore(parsed.anxiety || 25),
          stress: this.clampScore(parsed.stress || 25)
        };

        return scores;
      }
    } catch (parseError) {
      console.error('❌ Error parsing emotional scores:', parseError);
    }

    // Fallback: try to extract numbers from text
    return this.extractScoresFromText(responseText);
  }

  extractScoresFromText(text) {
    const defaultScores = {
      happiness: 50,
      energy: 50,
      anxiety: 25,
      stress: 25
    };

    try {
      const happinessMatch = text.match(/happiness["\s:]*(\d+)/i);
      const energyMatch = text.match(/energy["\s:]*(\d+)/i);
      const anxietyMatch = text.match(/anxiety["\s:]*(\d+)/i);
      const stressMatch = text.match(/stress["\s:]*(\d+)/i);

      return {
        happiness: this.clampScore(happinessMatch ? parseInt(happinessMatch[1]) : defaultScores.happiness),
        energy: this.clampScore(energyMatch ? parseInt(energyMatch[1]) : defaultScores.energy),
        anxiety: this.clampScore(anxietyMatch ? parseInt(anxietyMatch[1]) : defaultScores.anxiety),
        stress: this.clampScore(stressMatch ? parseInt(stressMatch[1]) : defaultScores.stress)
      };
    } catch (error) {
      console.error('❌ Error extracting scores from text:', error);
      return defaultScores;
    }
  }

  clampScore(score) {
    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, Math.round(score || 50)));
  }

  createDailyTranscript(messages) {
    console.log('📄 Creating daily conversation transcript...');
    
    let transcript = 'Daily Conversation:\n\n';
    
    // Add all messages in chronological order
    messages.forEach((msg, index) => {
      const speaker = msg.sender === 'user' ? 'User' : 'Deite';
      const timestamp = new Date(msg.timestamp).toLocaleTimeString();
      transcript += `[${timestamp}] ${speaker}: ${msg.text}\n\n`;
    });
    
    return transcript.trim();
  }

  buildConversationContext(userMessages, aiMessages) {
    let context = '';
    
    userMessages.forEach((userMsg, index) => {
      context += `User: "${userMsg}"\n`;
      if (aiMessages[index]) {
        const aiResponse = aiMessages[index].substring(0, 150);
        context += `Deite: "${aiResponse}${aiMessages[index].length > 150 ? '...' : ''}"\n\n`;
      }
    });
    
    return context.trim();
  }

  // Helper method to save emotional data
  async saveEmotionalData(userId, dateId, scores) {
    try {
      console.log('💾 Saving emotional data...');
      
      const emotionalData = {
        date: dateId,
        happiness: scores.happiness,
        energy: scores.energy,
        anxiety: scores.anxiety,
        stress: scores.stress,
        timestamp: new Date().toISOString(),
        source: 'chat_analysis'
      };

      // Save to localStorage for now (can be extended to Firestore later)
      const existingData = JSON.parse(localStorage.getItem(`emotional_data_${userId}`) || '[]');
      
      // Remove existing data for the same date
      const filteredData = existingData.filter(item => item.date !== dateId);
      
      // Add new data
      const updatedData = [...filteredData, emotionalData];
      
      localStorage.setItem(`emotional_data_${userId}`, JSON.stringify(updatedData));
      console.log('✅ Emotional data saved successfully');
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error saving emotional data:', error);
      return { success: false, error: error.message };
    }
  }

  // Helper method to get emotional data
  getEmotionalData(userId, days = 30) {
    try {
      const data = JSON.parse(localStorage.getItem(`emotional_data_${userId}`) || '[]');
      
      // Sort by date and get recent data
      return data
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, days);
    } catch (error) {
      console.error('❌ Error getting emotional data:', error);
      return [];
    }
  }

  // Helper method to get all emotional data (for lifetime analysis)
  getAllEmotionalData(userId) {
    try {
      const data = JSON.parse(localStorage.getItem(`emotional_data_${userId}`) || '[]');
      
      // Sort by date and return all data
      return data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      console.error('❌ Error getting all emotional data:', error);
      return [];
    }
  }
}

export default new EmotionalAnalysisService();
