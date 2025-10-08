class EmotionalAnalysisService {
  constructor() {
    this.baseURL = 'https://0dc728udh3bkqd-11434.proxy.runpod.net/';
  }

  async analyzeEmotionalScores(messages) {
    console.log('🧠 Starting emotional analysis...');
    console.log('🔍 EMOTIONAL DEBUG: messages type:', typeof messages, 'length:', messages?.length);
    
    // Safety check and fix for messages
    if (!messages || !Array.isArray(messages)) {
      console.error('❌ EMOTIONAL ERROR: Invalid messages array, using defaults');
      return {
        happiness: 0,
        energy: 0,
        anxiety: 0,
        stress: 0
      };
    }
    
    console.log('💬 Analyzing messages:', messages.length);

    if (!messages || messages.length === 0) {
      return {
        happiness: 0,
        energy: 0,
        anxiety: 0,
        stress: 0
      };
    }

    // Create daily conversation transcript from ALL messages
    const conversationTranscript = this.createDailyTranscript(messages);
    console.log('📄 Daily conversation transcript created, length:', conversationTranscript.length);
    console.log('📄 Transcript preview:', conversationTranscript.slice(0, 300));

    if (conversationTranscript.length < 20) {
      console.log('⚠️ Conversation too short for analysis');
      return {
        happiness: 0,
        energy: 0,
        anxiety: 0,
        stress: 0
      };
    }
    
    const analysisPrompt = `Analyze this conversation and score emotions (0-100) following these STRICT RULES:

EMOTION SCORING RULES (Total sum must not exceed 200%):

HAPPINESS (0-100):
- Reflects positive emotions: joy, satisfaction, relief, excitement, gratitude
- MUST decrease if stress or anxiety are high
- Can only be very high if stress and anxiety are low
- If grief, trauma, financial struggles, negative feelings present → happiness should NOT exceed 50 unless clear acceptance/resolution
- Short bursts of joy cannot outweigh deeper negative emotions

STRESS (0-100):
- Reflects pressure, overwhelm, emotional burden
- MUST be ≥50 if grief, trauma, financial difficulties mentioned (unless clearly resolved)
- Should correlate with anxiety when both from same cause
- Can be high with happiness only if mixed emotions explicitly expressed
- May reduce if user ends feeling calm/reassured
- CRITICAL: For serious events (death, financial difficulty, major trauma) → stress MUST be HIGHER than anxiety

ANXIETY (0-100):
- Reflects worry, uncertainty, fear, nervousness
- Should move in same direction as stress (within ±25 difference) unless explicitly separated
- MUST be ≥50 when grief, trauma, financial struggles present (unless strong emotional control)
- Can be lower than stress if user acknowledges challenges but feels mentally prepared
- Sudden worry spikes should raise anxiety more than stress
- CRITICAL: For serious events (death, financial difficulty, major trauma) → anxiety should be LOWER than stress

ENERGY (0-100):
- Reflects motivation, vitality, activity level
- INDEPENDENT of happiness, stress, anxiety
- High stress can coexist with high energy (tense but active)
- Low energy can coexist with happiness (peaceful but tired) or high stress (burnout)
- Rises with momentum/productivity/excitement, falls with fatigue/burnout/hopelessness

CRITICAL CONSTRAINT: The sum of all four scores MUST NOT exceed 200.
If total > 200, proportionally reduce all scores to fit within 200.

CONVERSATION:
${conversationTranscript}

Apply these rules strictly and ensure total ≤ 200. Return ONLY this JSON:
{"happiness": 0-100, "energy": 0-100, "anxiety": 0-100, "stress": 0-100}`;

    // Try multiple models in case one doesn't exist
    const modelsToTry = ['llama3.2', 'llama3:8b', 'llama3', 'llama2'];
    
    for (const modelName of modelsToTry) {
      try {
        console.log(`🌐 Trying model: ${modelName} for emotional analysis...`);
        console.log('🌐 API URL:', `${this.baseURL}api/generate`);

        const response = await fetch(`${this.baseURL}api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: modelName,
            prompt: analysisPrompt,
            stream: false,
            options: {
              temperature: 0.3,
              top_p: 0.9,
              num_predict: 200
            }
          })
        });

        console.log(`📥 Response status for ${modelName}:`, response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ API Error for ${modelName}:`, response.status, errorText);
          continue; // Try next model
        }

        const data = await response.json();
        console.log(`✅ Raw response received from ${modelName}`);

      if (data.response) {
        const responseText = data.response.trim();
        console.log('📊 AI Analysis response:', responseText);

        // Parse the JSON response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.error('❌ No JSON found in response');
          throw new Error('No JSON found in API response');
        }

        const scores = JSON.parse(jsonMatch[0]);
        console.log('✅ JSON parsed successfully:', scores);
            
        // Validate and apply emotion rules with 200% cap
        let happiness = Math.max(0, Math.min(100, parseInt(scores.happiness) || 0));
        let energy = Math.max(0, Math.min(100, parseInt(scores.energy) || 0));
        let anxiety = Math.max(0, Math.min(100, parseInt(scores.anxiety) || 0));
        let stress = Math.max(0, Math.min(100, parseInt(scores.stress) || 0));
        
        console.log('🔍 Raw AI scores:', {happiness, energy, anxiety, stress});
        
        // Apply 200% total cap constraint
        let total = happiness + energy + anxiety + stress;
        if (total > 200) {
          const scaleFactor = 200 / total;
          happiness = Math.round(happiness * scaleFactor);
          energy = Math.round(energy * scaleFactor);
          anxiety = Math.round(anxiety * scaleFactor);
          stress = Math.round(stress * scaleFactor);
          console.log('🔧 RULE: Total was', total, 'scaled down by factor', scaleFactor.toFixed(2));
        }
        
        // Apply specific emotion rules
        // Rule: Happiness decreases if stress/anxiety are high
        if ((stress >= 60 || anxiety >= 60) && happiness > 40) {
          happiness = Math.min(40, happiness);
          console.log('🔧 RULE: High stress/anxiety detected, reducing happiness');
        }
        
        // Rule: Happiness can only be very high if stress/anxiety are low
        if (happiness >= 70 && (stress > 40 || anxiety > 40)) {
          happiness = Math.min(60, happiness);
          console.log('🔧 RULE: High happiness with high stress/anxiety, reducing happiness');
        }
        
        // Check for serious life events in conversation
        const conversationLower = conversationTranscript.toLowerCase();
        const seriousEvents = [
          'death', 'died', 'passed away', 'funeral', 'loss of', 'lost someone',
          'financial difficulty', 'financial crisis', 'bankruptcy', 'debt', 'money problems',
          'lost job', 'unemployed', 'fired', 'laid off',
          'divorce', 'breakup', 'relationship ended',
          'illness', 'cancer', 'hospital', 'surgery',
          'trauma', 'abuse', 'accident', 'emergency'
        ];
        
        const hasSeriousEvent = seriousEvents.some(event => conversationLower.includes(event));
        
        if (hasSeriousEvent) {
          console.log('🔧 SERIOUS EVENT DETECTED: Adjusting stress > anxiety rule');
          
          // For serious events, stress should be higher than anxiety
          if (anxiety >= stress) {
            const stressAnxietyTotal = stress + anxiety;
            stress = Math.min(100, Math.round(stressAnxietyTotal * 0.6)); // 60% of combined
            anxiety = Math.min(100, Math.round(stressAnxietyTotal * 0.4)); // 40% of combined
            console.log('🔧 RULE: Serious event - stress set higher than anxiety:', {stress, anxiety});
          }
          
          // Ensure minimums for serious events
          stress = Math.max(stress, 60);
          anxiety = Math.max(anxiety, 50);
          console.log('🔧 RULE: Applied serious event minimums - stress ≥60, anxiety ≥50');
        } else {
          // Normal stress/anxiety correlation (within ±25)
          const stressAnxietyDiff = Math.abs(stress - anxiety);
          if (stressAnxietyDiff > 25) {
            const avg = (stress + anxiety) / 2;
            if (stress > anxiety) {
              stress = Math.min(100, Math.round(avg + 12));
              anxiety = Math.max(0, Math.round(avg - 12));
            } else {
              anxiety = Math.min(100, Math.round(avg + 12));
              stress = Math.max(0, Math.round(avg - 12));
            }
            console.log('🔧 RULE: Adjusted normal stress/anxiety correlation, diff was:', stressAnxietyDiff);
          }
        }
        
        const validatedScores = {
          happiness: happiness,
          energy: energy,
          anxiety: anxiety,
          stress: stress
        };
        
        const finalTotal = happiness + energy + anxiety + stress;
        console.log('✅ AI Emotional scores with rules applied:', validatedScores);
        console.log('✅ Final total:', finalTotal, '/ 200 (cap)');
        return validatedScores;
      }
      
      // If we reached here, this model failed, try next one
      console.log(`⚠️ Model ${modelName} failed to parse response`);
      
      } catch (modelError) {
        console.error(`💥 Error with model ${modelName}:`, modelError.message);
        // Continue to next model
      }
    }
    
    // If all models failed, return default scores
    console.error('❌ All models failed for emotional analysis');
    return {
      happiness: 0,
      energy: 0,
      anxiety: 0,
      stress: 0
    };
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
          happiness: this.clampScore(parsed.happiness || 0),
          energy: this.clampScore(parsed.energy || 0),
          anxiety: this.clampScore(parsed.anxiety || 0),
          stress: this.clampScore(parsed.stress || 0)
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
      happiness: 0,
      energy: 0,
      anxiety: 0,
      stress: 0
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
      console.error('❌ Full error details:', error);
      return defaultScores;
    }
  }

  clampScore(score) {
    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, Math.round(score || 50)));
  }

  // Test method to check API connectivity and available models
  async testAPI() {
    console.log('🧪 Testing API connectivity...');
    const testPrompt = 'Respond with only: SUCCESS';
    const modelsToTest = ['llama3.2', 'llama3:8b', 'llama3', 'llama2'];

    for (const modelName of modelsToTest) {
      try {
        console.log(`🧪 Testing model: ${modelName}...`);

        const response = await fetch(`${this.baseURL}api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: modelName,
            prompt: testPrompt,
            stream: false,
            options: {
              temperature: 0.1,
              num_predict: 10
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Model ${modelName} test successful:`, data.response);
          return { success: true, model: modelName, response: data.response };
        } else {
          console.error(`❌ Model ${modelName} test failed:`, response.status);
          const errorText = await response.text();
          console.error('Error details:', errorText);
        }
      } catch (error) {
        console.error(`❌ Model ${modelName} error:`, error.message);
      }
    }

    // If all models failed
    console.error('❌ All models failed');
    return { success: false, error: 'All models failed' };
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
