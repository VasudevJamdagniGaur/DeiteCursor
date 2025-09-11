class ChatService {
  constructor() {
    this.baseURL = 'https://huccz96dzpalfa-11434.proxy.runpod.net/';
  }

  async sendMessage(userMessage, conversationHistory = [], onToken = null) {
    console.log('🚀 RUNPOD: Starting sendMessage with:', userMessage);
    console.log('🚀 RUNPOD: Using URL:', this.baseURL);
    console.log('🚀 RUNPOD: Streaming enabled:', !!onToken);
    
    try {
      // First, check what models are available
      let availableModels = [];
      try {
        console.log('🔍 RUNPOD: Fetching available models...');
        const modelsResponse = await fetch(`${this.baseURL}api/tags`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        if (modelsResponse.ok) {
          const modelsData = await modelsResponse.json();
          availableModels = modelsData.models?.map(m => m.name) || [];
          console.log('🔍 RUNPOD: Available models:', availableModels);
        }
      } catch (e) {
        console.log('🔍 RUNPOD: Could not fetch models:', e.message);
      }

      // Use the first available model, or fallback to common ones
      const modelToUse = availableModels[0] || 'llama3.1' || 'llama3' || 'llama2';
      console.log('🎯 RUNPOD: Using model:', modelToUse);

      // Prepare messages for chat API
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

      // Create simple prompt for generate API as backup
      const simplePrompt = messages.map(msg => {
        if (msg.role === 'system') return msg.content;
        if (msg.role === 'user') return `Human: ${msg.content}`;
        if (msg.role === 'assistant') return `Assistant: ${msg.content}`;
        return msg.content;
      }).join('\n\n') + '\n\nAssistant:';

      console.log('📤 RUNPOD: Prepared messages for API');

      // Try the most reliable approaches first
      const attempts = [
        // Try generate API with streaming (most reliable for Ollama)
        {
          url: `${this.baseURL}api/generate`,
          body: {
            model: modelToUse,
            prompt: simplePrompt,
            stream: !!onToken
          },
          name: `Generate API (${modelToUse})`,
          streaming: !!onToken
        },
        // Try chat API with streaming
        {
          url: `${this.baseURL}api/chat`,
          body: {
            model: modelToUse,
            messages: messages,
            stream: !!onToken
          },
          name: `Chat API (${modelToUse})`,
          streaming: !!onToken
        }
      ];

      // Try each approach
      for (const attempt of attempts) {
        try {
          console.log(`🔄 RUNPOD: Trying ${attempt.name}...`);
          
          const response = await fetch(attempt.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify(attempt.body)
          });
          
          console.log(`📥 RUNPOD: ${attempt.name} Response status:`, response.status);
          
          if (response.ok) {
            // Handle streaming responses
            if (attempt.streaming && onToken) {
              console.log('🌊 RUNPOD: Processing streaming response...');
              return await this.handleStreamingResponse(response, onToken, attempt.name);
            }
            
            // Handle non-streaming responses
            const data = await response.json();
            console.log(`✅ RUNPOD: ${attempt.name} Response data:`, data);
            
            // Extract response content
            let responseText = null;
            if (data.message && data.message.content) {
              responseText = data.message.content.trim();
            } else if (data.response) {
              responseText = data.response.trim();
            } else if (data.content) {
              responseText = data.content.trim();
            } else if (data.choices && data.choices[0] && data.choices[0].message) {
              responseText = data.choices[0].message.content.trim();
            }
            
            if (responseText && responseText.length > 0) {
              console.log('🎉 RUNPOD: Successfully got response:', responseText.substring(0, 100) + '...');
              return responseText;
            }
          } else {
            const errorText = await response.text();
            console.log(`❌ RUNPOD: ${attempt.name} Error (${response.status}):`, errorText);
          }
        } catch (attemptError) {
          console.log(`❌ RUNPOD: ${attempt.name} failed:`, attemptError.message);
        }
      }

      // If all attempts fail, return a helpful response
      console.log('⚠️ RUNPOD: All API attempts failed');
      return `I'm having trouble connecting to the AI service right now. Please try again in a moment.`;

    } catch (error) {
      console.error('❌ RUNPOD: Final error:', error);
      return `I apologize, but there was an error processing your message. Please try again.`;
    }
  }

  async handleStreamingResponse(response, onToken, attemptName) {
    console.log('🌊 RUNPOD: Starting to process streaming response for:', attemptName);
    
    try {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('🌊 RUNPOD: Stream completed');
          if (onToken) {
            onToken(null);
          }
          break;
        }
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            
            // Skip metadata
            if (data.context || data.prompt_eval_count || data.eval_count || 
                data.total_duration || data.load_duration || data.prompt_eval_duration || 
                data.eval_duration) {
              continue;
            }
            
            // Extract token from response
            let token = null;
            if (data.response !== undefined) {
              token = data.response;
            } else if (data.message && data.message.content !== undefined) {
              token = data.message.content;
            } else if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
              token = data.choices[0].delta.content;
            }
            
            // Process valid tokens
            if (token !== null && token.length > 0) {
              console.log('🌊 RUNPOD: Token:', token);
              fullResponse += token;
              if (onToken) {
                onToken(token);
              }
            }
            
            // Check if stream is done
            if (data.done === true) {
              console.log('🌊 RUNPOD: Stream marked as done');
              if (onToken) {
                onToken(null);
              }
              return fullResponse.trim();
            }
            
          } catch (parseError) {
            // Skip non-JSON lines or handle as plain text if needed
            console.log('🌊 RUNPOD: Non-JSON line skipped');
          }
        }
      }
      
      console.log('🌊 RUNPOD: Final response length:', fullResponse.length);
      if (onToken) {
        onToken(null);
      }
      return fullResponse.trim();
      
    } catch (streamError) {
      console.error('❌ RUNPOD: Error processing stream:', streamError);
      if (onToken) {
        onToken(null);
      }
      throw streamError;
    }
  }

  async testConnection() {
    console.log('🔍 RUNPOD: Testing connection...');
    
    try {
      // Test basic connectivity
      const healthResponse = await fetch(`${this.baseURL}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      console.log('🔍 RUNPOD: Health check response:', healthResponse.status);

      if (healthResponse.ok) {
        // Get available models
        try {
          const modelsResponse = await fetch(`${this.baseURL}api/tags`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });

          if (modelsResponse.ok) {
            const modelsData = await modelsResponse.json();
            console.log('🔍 RUNPOD: Available models:', modelsData);
            
            return {
              status: 'success',
              message: 'RunPod connection successful',
              details: `Available models: ${modelsData.models?.map(m => m.name).join(', ') || 'No models found'}`,
              models: modelsData.models || []
            };
          }
        } catch (modelsError) {
          console.log('🔍 RUNPOD: Models endpoint error, but base connection works');
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
      console.error('🔍 RUNPOD: Connection test error:', error);
      return {
        status: 'error',
        message: 'RunPod connection failed',
        details: error.message
      };
    }
  }

  // Test function for debugging
  async testSimpleChat() {
    console.log('🧪 RUNPOD: Testing simple chat...');
    
    try {
      const testMessage = "Hello, can you respond with just 'Hi there!'?";
      const response = await this.sendMessage(testMessage, [], null); // No streaming
      
      console.log('🧪 RUNPOD: Test response:', response);
      return {
        success: true,
        response: response
      };
    } catch (error) {
      console.error('🧪 RUNPOD: Test chat failed:', error);
      return {
        success: false,
        error: error.message
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

const chatServiceInstance = new ChatService();

// Add global test functions for debugging
if (typeof window !== 'undefined') {
  window.testRunPodConnection = async () => {
    console.log('🧪 GLOBAL: Testing RunPod connection...');
    return await chatServiceInstance.testConnection();
  };
  
  window.testRunPodChat = async () => {
    console.log('🧪 GLOBAL: Testing RunPod chat...');
    return await chatServiceInstance.testSimpleChat();
  };
}

export default chatServiceInstance;
