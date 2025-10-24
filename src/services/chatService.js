class ChatService {
  constructor() {
    // Updated to use the new backend server with warm-up system
    this.baseURL = 'http://localhost:3001';
    this.backendChatEndpoint = `${this.baseURL}/api/chat`;
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
          content: `You are Deite, a warm and emotionally intelligent AI companion. Before responding, follow these rules:

1. IDENTIFY INTENT by reading between the words:
   - Look for underlying emotions, not just surface words
   - Example: "I feel like I'm not progressing with Blish" = lack of progress + self-doubt + pressure + fear of stagnation
   - Note: He's probably putting in effort but not seeing visible results — this is emotional fatigue, not lack of skill

2. RECALL CONTEXT:
   - Remember what you already know about him
   - Consider his work, current situation, recent conversations
   - Base your reply on this accumulated knowledge

3. CHOOSE THE RIGHT TONE based on his emotional state:
   - Overwhelmed → Stay calm and grounding
   - Sad/demotivated → Gentle, validating, and honest
   - Excited/hopeful → Reflect that energy back, encouraging and fueling it
   - Emotionally mirror him, but without pretending

4. VALIDATE THE FEELING:
   - Before talking about solutions, make him feel it's normal and human
   - Not a personal failure

5. CREATE SAFETY:
   - No judgment
   - No trying to push optimism too fast
   - No assuming you know the full story

6. REFLECT GENTLY OR ASK BEFORE HELPING:
   - Check: "Do you want to unpack what might be causing this, or should I just listen for now?"
   - If yes, carefully reflect his thoughts back in clearer light
   - Help him see patterns, don't force solutions

7. REBUILD POSITIVITY SLOWLY:
   - Leave him calmer or stronger than when he started
   - Once he feels understood, help him regain direction or hope — gently
   - Not fake positivity, but grounded encouragement

Keep responses SHORT and PRECISE (1-3 sentences max). Be empathetic but concise.`
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
            stream: true,  // 👈 ALWAYS enable streaming
            options: {
              max_tokens: 150,  // Limit response length
              temperature: 0.7
            }
          },
          name: 'Ollama Generate API (llama3.1)',
          streaming: true
        },
        {
          url: `${this.baseURL}api/generate`,
          body: {
            model: 'llama3',
            prompt: simplePrompt,
            stream: true,  // 👈 ALWAYS enable streaming
            options: {
              max_tokens: 150,  // Limit response length
              temperature: 0.7
            }
          },
          name: 'Ollama Generate API (llama3)',
          streaming: true
        },
        {
          url: `${this.baseURL}api/generate`,
          body: {
            model: 'llama2',
            prompt: simplePrompt,
            stream: true,  // 👈 ALWAYS enable streaming
            options: {
              max_tokens: 150,  // Limit response length
              temperature: 0.7
            }
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
            stream: true,  // 👈 ALWAYS enable streaming
            options: {
              max_tokens: 150,  // Limit response length
              temperature: 0.7
            }
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
            stream: true,  // 👈 ALWAYS enable streaming
            options: {
              max_tokens: 150,  // Limit response length
              temperature: 0.7
            }
          },
          name: 'Ollama Chat API (llama3.1)',
          streaming: true
        },
        {
          url: `${this.baseURL}api/chat`,
          body: {
            model: 'llama3',
            messages: messages,
            stream: true,  // 👈 ALWAYS enable streaming
            options: {
              max_tokens: 150,  // Limit response length
              temperature: 0.7
            }
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
            max_tokens: 150  // Limit response length
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
          console.log('🌊 STREAM DEBUG: Stream completed');
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
            
            // Check if stream is done
            if (data.done === true) {
              console.log('🌊 STREAM DEBUG: Stream marked as done');
              break;
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
      return fullResponse.trim();
      
    } catch (streamError) {
      console.error('❌ STREAM DEBUG: Error processing stream:', streamError);
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
          const modelsResponse = await fetch(`${this.baseURL}api/tags`, {
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
        prompt = `On ${date}, this person had their best mood day in the ${period} with happiness at ${happiness}%, energy at ${energy}%, stress at ${stress}%, and anxiety at ${anxiety}%. Write a simple explanation of what probably made this day great. Keep it casual and realistic.

Write 2-3 sentences like this example:
"You woke up feeling good and had a productive morning. Maybe you finished something important or got good news. The rest of the day just felt easier and more positive."

Focus on:
- Something specific that probably happened
- How it made them feel
- Why the day stayed good

Use simple, everyday language.`;
      } else {
        prompt = `On ${date}, this person had their most challenging day in the ${period} with happiness at ${happiness}%, energy at ${energy}%, stress at ${stress}%, and anxiety at ${anxiety}%. Write a simple explanation of what probably made this day tough. Keep it casual and realistic.

Write 2-3 sentences like this example:
"The day started off stressful with deadlines and worries. Maybe something didn't go as planned or there was pressure from work. It was hard to shake off the negative feelings."

Focus on:
- Something specific that probably happened
- How it affected their mood
- Why the day felt difficult

Use simple, everyday language.`;
      }

      const messages = [
        {
          role: 'system',
          content: 'You help people understand their emotions in simple, everyday language. Write short explanations that sound like how a normal person would describe their day. Keep it casual and realistic, avoid fancy words or overly emotional language.'
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      // Convert messages to a single prompt for Ollama generate API
      const promptText = messages.map(msg => {
        if (msg.role === 'system') return msg.content;
        if (msg.role === 'user') return `User: ${msg.content}`;
        return msg.content;
      }).join('\n\n');

      console.log('🚀 Calling RunPod with prompt:', promptText.substring(0, 200) + '...');

      const response = await fetch(`${this.baseURL}api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3:70b',
          prompt: promptText,
          stream: false,
          options: {
            temperature: 0.7,
            max_tokens: 100
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ RunPod response:', data);
      
      if (data.response) {
        return data.response.trim();
      }

      throw new Error('Invalid response format');

    } catch (error) {
      console.error(`❌ Error generating ${dayType} day description:`, error);
      // Return fallback descriptions
      if (dayType === 'best') {
        return "You woke up feeling good and had a productive day. Maybe you finished something important or got good news. The rest of the day just felt easier and more positive.";
      } else {
        return "The day started off stressful with deadlines and worries. Maybe something didn't go as planned or there was pressure from work. It was hard to shake off the negative feelings.";
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

      // Convert messages to a single prompt for Ollama generate API
      const promptText = messages.map(msg => {
        if (msg.role === 'system') return msg.content;
        if (msg.role === 'user') return `User: ${msg.content}`;
        return msg.content;
      }).join('\n\n');

      const response = await fetch(`${this.baseURL}api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3:70b',
          prompt: promptText,
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
      
      if (data.response) {
        const responseText = data.response.trim();
        
        // Parse JSON response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);
          return analysis;
        }
        
        throw new Error('Invalid JSON format in response');
      } else if (data.message && data.message.content) {
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
