class ChatService {
  constructor() {
    this.baseURL = 'https://c64hx4nq6b4am2-11434.proxy.runpod.net/';
  }

  async sendMessage(userMessage, conversationHistory = [], onToken = null) {
    console.log('🚀 CHAT DEBUG: Starting sendMessage with:', userMessage);
    console.log('🚀 CHAT DEBUG: Using URL:', this.baseURL);
    console.log('🚀 CHAT DEBUG: Streaming enabled:', !!onToken);
    
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

      console.log('📤 CHAT DEBUG: Prepared messages:', messages);

      // First, let's check what models are available
      let availableModels = [];
      try {
        const modelsResponse = await fetch(`${this.baseURL}api/tags`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        if (modelsResponse.ok) {
          const modelsData = await modelsResponse.json();
          availableModels = modelsData.models?.map(m => m.name) || [];
          console.log('🔍 CHAT DEBUG: Available models:', availableModels);
        }
      } catch (e) {
        console.log('🔍 CHAT DEBUG: Could not fetch models:', e.message);
      }

      // Create a simple prompt from messages for generate API
      const simplePrompt = messages.map(msg => {
        if (msg.role === 'system') return msg.content;
        if (msg.role === 'user') return `Human: ${msg.content}`;
        if (msg.role === 'assistant') return `Assistant: ${msg.content}`;
        return msg.content;
      }).join('\n\n') + '\n\nAssistant:';

      // Try multiple approaches to make this work
      const attempts = [
        // Attempt 1: Basic connection test first
        {
          url: `${this.baseURL}`,
          method: 'GET',
          name: 'Basic Connection Test'
        },
        // Attempt 2: Check available models
        {
          url: `${this.baseURL}api/tags`,
          method: 'GET',
          name: 'Get Available Models'
        },
        // Attempt 3: Generate API with common models (streaming enabled)
        {
          url: `${this.baseURL}api/generate`,
          body: {
            model: 'llama3.1',
            prompt: simplePrompt,
            stream: true  // 👈 ALWAYS enable streaming
          },
          name: 'Ollama Generate API (llama3.1)',
          streaming: true
        },
        {
          url: `${this.baseURL}api/generate`,
          body: {
            model: 'llama3',
            prompt: simplePrompt,
            stream: true  // 👈 ALWAYS enable streaming
          },
          name: 'Ollama Generate API (llama3)',
          streaming: true
        },
        {
          url: `${this.baseURL}api/generate`,
          body: {
            model: 'llama2',
            prompt: simplePrompt,
            stream: true  // 👈 ALWAYS enable streaming
          },
          name: 'Ollama Generate API (llama2)',
          streaming: true
        },
        // Attempt 4: Try with first available model if we found any
        ...(availableModels.length > 0 ? [{
          url: `${this.baseURL}api/generate`,
          body: {
            model: availableModels[0],
            prompt: simplePrompt,
            stream: true  // 👈 ALWAYS enable streaming
          },
          name: `Ollama Generate API (${availableModels[0]})`,
          streaming: true
        }] : []),
        // Attempt 5: Chat API attempts (streaming enabled)
        {
          url: `${this.baseURL}api/chat`,
          body: {
            model: 'llama3.1',
            messages: messages,
            stream: true  // 👈 ALWAYS enable streaming
          },
          name: 'Ollama Chat API (llama3.1)',
          streaming: true
        },
        {
          url: `${this.baseURL}api/chat`,
          body: {
            model: 'llama3',
            messages: messages,
            stream: true  // 👈 ALWAYS enable streaming
          },
          name: 'Ollama Chat API (llama3)',
          streaming: true
        },
        // Attempt 6: Try OpenAI compatible format (streaming enabled)
        {
          url: `${this.baseURL}v1/chat/completions`,
          body: {
            model: 'llama3.1',
            messages: messages,
            stream: true,  // 👈 Enable streaming for OpenAI format too
            max_tokens: 1000
          },
          name: 'OpenAI Compatible API',
          streaming: true
        }
      ];

      for (const attempt of attempts) {
        try {
          console.log(`🔄 CHAT DEBUG: Trying ${attempt.name}...`);
          console.log(`🔄 CHAT DEBUG: URL: ${attempt.url}`);
          console.log(`🔄 CHAT DEBUG: Body:`, attempt.body);
          
          const fetchOptions = {
            method: attempt.method || 'POST',
            headers: attempt.headers || {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            }
          };
          
          if (attempt.body && fetchOptions.method === 'POST') {
            fetchOptions.body = JSON.stringify(attempt.body);
          }
          
          const response = await fetch(attempt.url, fetchOptions);
          
          console.log(`📥 CHAT DEBUG: ${attempt.name} Response status:`, response.status);
          console.log(`📥 CHAT DEBUG: ${attempt.name} Response headers:`, [...response.headers.entries()]);
          
          if (response.ok) {
            // Handle GET requests differently (connection tests)
            if (attempt.method === 'GET') {
              const responseText = await response.text();
              console.log(`✅ CHAT DEBUG: ${attempt.name} Response:`, responseText);
              
              // For GET requests, just continue to next attempt unless it's a model list
              if (attempt.name === 'Get Available Models') {
                try {
                  const data = JSON.parse(responseText);
                  console.log('📋 CHAT DEBUG: Models data:', data);
                } catch (e) {
                  console.log('📋 CHAT DEBUG: Could not parse models response');
                }
              }
              continue; // Don't return for GET requests, just log and continue
            }
            
            // Handle streaming responses
            if (attempt.streaming && onToken) {
              console.log('🌊 CHAT DEBUG: Processing streaming response...');
              return await this.handleStreamingResponse(response, onToken, attempt.name);
            }
            
            // Handle non-streaming POST requests (actual chat attempts)
            const data = await response.json();
            console.log(`✅ CHAT DEBUG: ${attempt.name} Response data:`, data);
            
            // Handle different response formats
            if (data.message && data.message.content) {
              console.log('✅ CHAT DEBUG: Using message.content format');
              return data.message.content.trim();
            } else if (data.response) {
              console.log('✅ CHAT DEBUG: Using response format');
              return data.response.trim();
            } else if (data.content) {
              console.log('✅ CHAT DEBUG: Using content format');
              return data.content.trim();
            } else if (data.choices && data.choices[0] && data.choices[0].message) {
              console.log('✅ CHAT DEBUG: Using OpenAI format');
              return data.choices[0].message.content.trim();
            } else if (typeof data === 'string') {
              console.log('✅ CHAT DEBUG: Using string format');
              return data.trim();
            }
            
            console.log('⚠️ CHAT DEBUG: Unknown response format, trying to extract text...');
            const responseText = JSON.stringify(data);
            if (responseText.length > 50) {
              return `Response received but format unknown: ${responseText.substring(0, 200)}...`;
            }
          } else {
            const errorText = await response.text();
            console.log(`❌ CHAT DEBUG: ${attempt.name} Error response (${response.status}):`, errorText);
          }
        } catch (attemptError) {
          console.log(`❌ CHAT DEBUG: ${attempt.name} failed:`, attemptError.message);
        }
      }

      // If all attempts fail, return a debug response so we can at least see the chat is working
      console.log('⚠️ CHAT DEBUG: All API attempts failed, returning debug response');
      return `I'm having trouble connecting to the AI service right now, but I can see your message: "${userMessage}". Please check the browser console for detailed debug information. The system is trying to connect to: ${this.baseURL}`;

    } catch (error) {
      console.error('❌ CHAT DEBUG: Final error:', error);
      // Return error info instead of throwing
      return `Debug Error: ${error.message}. Check console for details.`;
    }
  }

  async handleStreamingResponse(response, onToken, attemptName) {
    console.log('🌊 STREAM DEBUG: Starting to process streaming response...');
    
    try {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('🌊 STREAM DEBUG: Stream completed - sending end signal');
          // ALWAYS send null token when stream ends
          if (onToken) {
            onToken(null);
          }
          break;
        }
        
        const chunk = decoder.decode(value, { stream: true });
        console.log('🌊 STREAM DEBUG: IMMEDIATE CHUNK processing:', chunk);
        
        // Process lines immediately as they arrive - no waiting!
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            // Try to parse as JSON (Ollama format)
            const data = JSON.parse(line);
            
            // Handle Ollama generate API streaming format - IMMEDIATE processing
            if (data.response !== undefined) {
              const token = data.response;
              console.log('🌊 STREAM DEBUG: IMMEDIATE TOKEN from response field:', token);
              fullResponse += token;
              // Send token IMMEDIATELY to UI - no delays!
              if (onToken && token) {
                onToken(token);
              }
            }
            // Handle Ollama chat API streaming format - IMMEDIATE processing
            else if (data.message && data.message.content !== undefined) {
              const token = data.message.content;
              console.log('🌊 STREAM DEBUG: IMMEDIATE TOKEN from message.content:', token);
              fullResponse += token;
              // Send token IMMEDIATELY to UI - no delays!
              if (onToken && token) {
                onToken(token);
              }
            }
            // Handle OpenAI streaming format - IMMEDIATE processing
            else if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
              const token = data.choices[0].delta.content;
              console.log('🌊 STREAM DEBUG: IMMEDIATE TOKEN from OpenAI delta:', token);
              fullResponse += token;
              // Send token IMMEDIATELY to UI - no delays!
              if (onToken && token) {
                onToken(token);
              }
            }
            
            // Check if stream is done via data.done flag
            if (data.done === true) {
              console.log('🌊 STREAM DEBUG: Stream marked as done via data.done');
              // Send null token to indicate stream finished
              if (onToken) {
                onToken(null);
              }
              return fullResponse.trim(); // Return immediately when done
            }
            
          } catch (parseError) {
            // If not JSON, might be raw text
            console.log('🌊 STREAM DEBUG: Non-JSON chunk, treating as raw text:', line);
            if (line.trim()) {
              fullResponse += line;
              if (onToken) onToken(line);
            }
          }
        }
      }
      
      console.log('🌊 STREAM DEBUG: Final response:', fullResponse);
      // Ensure end signal is sent even if we reach here without explicit done
      if (onToken) {
        onToken(null);
      }
      return fullResponse.trim();
      
    } catch (streamError) {
      console.error('❌ STREAM DEBUG: Error processing stream:', streamError);
      // Send end signal even on error to stop typing indicator
      if (onToken) {
        onToken(null);
      }
      throw streamError;
    }
  }

  async testConnection() {
    console.log('🔍 Testing RunPod connection...');
    
    try {
      // First, try to check if Ollama is running
      const healthResponse = await fetch(`${this.baseURL}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('Health check response:', healthResponse.status);

      if (healthResponse.ok) {
        // Try to get available models
        try {
          const modelsResponse = await fetch(`${this.baseURL}/api/tags`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          });

          if (modelsResponse.ok) {
            const modelsData = await modelsResponse.json();
            console.log('Available models:', modelsData);
            
            return {
              status: 'success',
              message: 'RunPod connection successful',
              details: `Available models: ${modelsData.models?.map(m => m.name).join(', ') || 'No models found'}`
            };
          }
        } catch (modelsError) {
          console.log('Models endpoint not available, but base connection works');
        }

        return {
          status: 'success',
          message: 'RunPod connection successful',
          details: 'Ollama is running'
        };
      }

      return {
        status: 'error',
        message: 'RunPod connection failed',
        details: `HTTP ${healthResponse.status}`
      };

    } catch (error) {
      console.error('Connection test error:', error);
      return {
        status: 'error',
        message: 'RunPod connection failed',
        details: error.message
      };
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
          model: 'llama3.1:70b',
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
          model: 'llama3.1:70b',
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
