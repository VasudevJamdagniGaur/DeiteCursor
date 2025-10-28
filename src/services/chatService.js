class ChatService {
  constructor() {
    this.baseURL = 'https://b5z7d285vvdqfz-11434.proxy.runpod.net/';
    this.modelName = 'llama3:70b';
  }

  async checkModelsAvailable() {
    try {
      const response = await fetch(`${this.baseURL}api/tags`);
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Available models:', data.models?.map(m => m.name) || []);
        return data.models || [];
      }
    } catch (error) {
      console.error('❌ Could not check available models:', error);
    }
    return [];
  }

  async sendMessage(userMessage, conversationHistory = [], onToken = null) {
    console.log('🚀 CHAT DEBUG: Starting sendMessage with:', userMessage);
    console.log('🚀 CHAT DEBUG: Using URL:', this.baseURL);
    
    try {
      // Build a simpler prompt that works with Ollama
      let conversationContext = '';
      
      // Add conversation history (last 3 messages for context)
      if (conversationHistory && conversationHistory.length > 0) {
        const recentMessages = conversationHistory.slice(-3);
        conversationContext = recentMessages.map(msg => {
          return msg.sender === 'user' ? `Human: ${msg.text}` : `Assistant: ${msg.text}`;
        }).join('\n') + '\n';
      }
      
      // Create the prompt
      const simplePrompt = `You are Deite, a warm and emotionally intelligent AI companion. Keep your responses empathetic but concise (1-3 sentences).

${conversationContext}Human: ${userMessage}
Assistant:`;

      // Try different models in order of preference - prioritize llama3:70b
      const apiUrl = `${this.baseURL}api/generate`;
      const modelOptions = ['llama3:70b', 'llama3:8b', 'llama3', 'llama2'];
      
      let lastError = null;
      
      // First, check available models on the server
      let availableModels = [];
      try {
        const tagsResponse = await fetch(`${this.baseURL}api/tags`);
        if (tagsResponse.ok) {
          const tagsData = await tagsResponse.json();
          availableModels = tagsData.models?.map(m => m.name) || [];
          console.log('📋 Available models on server:', availableModels);
        }
      } catch (tagsError) {
        console.log('⚠️ Could not check available models, will try all model options');
      }
      
      console.log('📤 CHAT DEBUG: Full API URL:', apiUrl);
      console.log('📤 CHAT DEBUG: Prompt length:', simplePrompt.length);
      
      // Try models in order until one succeeds
      for (const modelToTry of modelOptions) {
        // Skip models that we know aren't available
        if (availableModels.length > 0 && !availableModels.some(m => m.includes(modelToTry.split(':')[0]))) {
          console.log('⏭️ Skipping model', modelToTry, '- not available');
          continue;
        }
        
        console.log('📤 CHAT DEBUG: Trying model:', modelToTry);
        
        try {
          const requestBody = {
            model: modelToTry,
            prompt: simplePrompt,
            stream: !!onToken, // Enable streaming if callback provided
            options: {
              temperature: 0.7,
              num_predict: 200
            }
          };
          
          console.log('📤 CHAT DEBUG: Sending request to:', apiUrl);
          
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
          });

          console.log('📥 CHAT DEBUG: Response status for', modelToTry, ':', response.status);
          console.log('📥 CHAT DEBUG: Response ok:', response.ok);

          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ CHAT DEBUG: Error response for', modelToTry, ':', errorText);
            lastError = new Error(`Model ${modelToTry} failed: ${response.status} ${response.statusText}`);
            continue; // Try next model
          }
          
          // Handle streaming response
          if (onToken && response.body) {
            console.log('🌊 CHAT DEBUG: Processing streaming response from', modelToTry);
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';
            
            try {
              while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                  console.log('🌊 Streaming completed for', modelToTry);
                  break;
                }
                
                const chunk = decoder.decode(value, { stream: true });
                
                // Parse JSON lines
                const lines = chunk.split('\n').filter(line => line.trim());
                
                for (const line of lines) {
                  try {
                    const data = JSON.parse(line);
                    
                    if (data.response) {
                      fullResponse += data.response;
                      
                      // Call onToken callback if provided
                      if (onToken) {
                        onToken(data.response);
                      }
                    }
                    
                    if (data.done) {
                      console.log('🌊 Stream done for', modelToTry, ', full response:', fullResponse);
                      return fullResponse;
                    }
                  } catch (parseError) {
                    console.log('🌊 Parse error for line:', line);
                  }
                }
              }
              
              if (fullResponse) {
                console.log('✅ Streaming response completed from', modelToTry);
                return fullResponse;
              }
              
            } catch (streamError) {
              console.error('❌ Streaming error for', modelToTry, ':', streamError);
              lastError = streamError;
              continue; // Try next model
            }
          } else {
            // Handle non-streaming response
            const data = await response.json();
            console.log('✅ CHAT DEBUG: Received response from RunPod for', modelToTry);
            console.log('✅ CHAT DEBUG: Response keys:', Object.keys(data));
            
            // Handle different response formats
            let aiResponse = '';
            if (data.response) {
              aiResponse = data.response;
            } else if (data.text) {
              aiResponse = data.text;
            } else if (data.output) {
              aiResponse = data.output;
            } else if (typeof data === 'string') {
              aiResponse = data;
            } else {
              console.error('❌ CHAT DEBUG: Unexpected response format:', data);
              lastError = new Error('Unexpected response format from RunPod API');
              continue; // Try next model
            }
            
            if (!aiResponse || aiResponse.trim() === '') {
              console.error('❌ CHAT DEBUG: Empty response from', modelToTry);
              lastError = new Error('Empty response from AI');
              continue; // Try next model
            }
            
            console.log('✅ CHAT DEBUG: Successfully got response from', modelToTry);
            console.log('✅ CHAT DEBUG: AI Response:', aiResponse.substring(0, 100));
            return aiResponse;
          }
          
        } catch (modelError) {
          console.error(`❌ Error with model ${modelToTry}:`, modelError);
          lastError = modelError;
          continue; // Try next model
        }
      }
      
      // If all models failed, throw the last error
      throw lastError || new Error('All models failed - check if Ollama models are loaded on RunPod instance');
      
    } catch (error) {
      console.error('❌ CHAT DEBUG: Error in sendMessage:', error);
      throw error;
    }
  }

  async generateDayDescription(dayData, type, periodText) {
    try {
      console.log(`🤖 Generating ${type} day description for`, dayData.date);
      
      const prompt = `You are Deite — a compassionate AI therapist and emotional analyst.
You are analyzing a user's emotional wellbeing based on their daily reflections, moods, and emotional summaries.

${type === 'best' ? `
Analyze the BEST MOOD DAY and explain why this day felt so positive.
- Focus on what made it special: achievements, positive connections, self-growth, calmness, or healing
- Be specific about the emotional cause
- Avoid generic phrases like "this was likely due to" or "you might have felt"
- Use direct reasoning: "You felt emotionally elevated because you overcame self-doubt during your project presentation, proving to yourself that persistence pays off."
` : `
Analyze the MOST CHALLENGING DAY and explain why it was emotionally difficult.
- Identify emotional triggers, inner conflicts, or moments of overwhelm
- Offer gentle insight into their coping process or emotional growth
- Avoid robotic summaries like "multiple pressures" — make it sound human, like a therapist's reflection
- Be specific about the emotional cause
`}

Date: ${dayData.date || 'Unknown'}
Mood: ${dayData.happiness}% happiness, ${dayData.energy}% energy
Stress: ${dayData.stress}% stress, ${dayData.anxiety}% anxiety

${dayData.summary ? `Summary from that day: ${dayData.summary}` : 'No daily summary available for this day.'}

Keep the response warm, natural, and empathetic (3-5 sentences). Focus on meaning and emotional cause, not numbers.`;

      const response = await this.sendMessage(prompt);
      return response.trim();
    } catch (error) {
      console.error(`❌ Error generating ${type} day description:`, error);
      return `You experienced ${type === 'best' ? 'a significantly positive day' : 'a challenging emotional period'} during ${periodText}. Reflect on what contributed to this experience and how it relates to your ongoing emotional journey.`;
    }
  }
}

export default new ChatService();