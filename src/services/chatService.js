class ChatService {
  constructor() {
    this.baseURL = 'https://9s21cuv9xr14qz-11434.proxy.runpod.net/';
    this.systemPrompt = `You are Deite — a warm, emotionally intelligent, witty companion grounded in Indian emotional sensibilities. You speak like a close, understanding friend. Your tone is natural, caring, and responsive — not scripted, not overly formal, and never robotic.

You give therapeutic advice or structured responses like a life coach or counselor. With that, you show genuine curiosity and listen deeply. Let the user lead the pace of the conversation. Don't end every message with a question. Instead, most of the times end it with an advice,— just like a close friend would.

When the user shares something personal, respond with emotion, relatability, and subtle prompts. Show interest through empathy and casual tone, not interrogation. Help them explore their thoughts at their own pace. You may lightly nudge them forward, but you should *never dominate the dialogue*.

Avoid:
- Labeling sections (like Reframe, Encouragement)
- Giving structured "next steps" unless asked
- Pushing journaling or self-reflection exercises unless clearly needed
- There is no need to ask questions at the end of every message.

Do:
- Use a mix of statements, subtle follow-ups, and silence (sometimes not asking a question at all)
- Avoid simply repeating what the user has said and then ending with a question. Instead, build on what they've shared by offering a meaningful, emotionally grounded insight or gentle advice. If there is no advice to give then only ask a question.
- Mirror the user's tone (if they're excited, match it; if they're vulnerable, soften)`;
  }

  async sendMessage(userMessage, conversationHistory = [], onStreamChunk = null, retryCount = 0) {
    const maxRetries = 2;
    
    try {
      // Limit conversation history to last 10 messages to manage token usage
      const recentHistory = conversationHistory.slice(-10);
      
      // Format conversation history for the API
      const messages = [
        {
          role: 'system',
          content: this.systemPrompt
        },
        // Add recent conversation history
        ...recentHistory.map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        })),
        // Add current user message
        {
          role: 'user',
          content: userMessage
        }
      ];

      // Use AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout for 70B model

      const response = await fetch(`${this.baseURL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3:70b',
          messages: messages,
          stream: true, // Always use streaming for better timeout handling
          options: {
            temperature: 0.7,
            top_p: 0.9,
            top_k: 40
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
      }

      // Always handle streaming response
      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        let hasReceivedData = false;

        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.trim() === '') continue;
              
              try {
                const data = JSON.parse(line);
                
                if (data.message && data.message.content) {
                  const content = data.message.content;
                  fullResponse += content;
                  hasReceivedData = true;
                  
                  // Call streaming callback if provided
                  if (onStreamChunk) {
                    onStreamChunk(content);
                  }
                }
                
                // Check if the response is done
                if (data.done) {
                  if (!hasReceivedData && !fullResponse.trim()) {
                    throw new Error('Empty response from AI model');
                  }
                  return fullResponse.trim();
                }
              } catch (parseError) {
                // Skip invalid JSON lines but log for debugging
                console.log('Skipping invalid JSON line:', line);
                continue;
              }
            }
          }
          
          // If we exit the loop without getting a "done" signal
          if (!hasReceivedData) {
            throw new Error('No valid response received from AI model');
          }
          
          return fullResponse.trim();
        } finally {
          reader.releaseLock();
        }
      } else {
        throw new Error('No response body received from API');
      }
    } catch (error) {
      console.error('Error calling chat API:', error);
      
      // Retry logic for certain errors
      if (retryCount < maxRetries && (
        error.message.includes('524') || 
        error.message.includes('Gateway Time-out') ||
        error.message.includes('timeout') ||
        error.message.includes('The operation has timed out') ||
        error.name === 'AbortError'
      )) {
        console.log(`🔄 Retrying request (attempt ${retryCount + 1}/${maxRetries})...`);
        
        // Longer delays for large model (30s, 60s)
        const delay = (retryCount + 1) * 30000;
        console.log(`⏳ Waiting ${delay/1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Always try warming up the model before retry
        console.log('🔥 Warming up model before retry...');
        await this.warmupModel();
        
        return this.sendMessage(userMessage, conversationHistory, onStreamChunk, retryCount + 1);
      }
      
      // Handle different types of errors with appropriate Deite responses
      if (error.name === 'AbortError') {
        return "I'm taking a bit longer to process your thoughts than usual. You know how sometimes we need extra time to really think things through? Let's try again.";
      } else if (error.message.includes('524') || error.message.includes('Gateway Time-out')) {
        return "The AI model is taking a bit longer to warm up than usual. This happens sometimes with larger models. Let me try to warm it up first, then we can continue our conversation.";
      } else if (error.message.includes('timeout')) {
        return "Looks like I need a moment to warm up - kind of like how we all need time to settle into deep conversations. Give me a second and let's try again.";
      } else if (error.message.includes('HTTP error')) {
        return "There's a little technical hiccup on my side right now. Your feelings and thoughts are important, so let's give this another shot in a moment.";
      } else {
        // Generic fallback responses in Deite's voice
        const fallbackResponses = [
          "I'm having trouble connecting right now, but I'm still here with you. Sometimes technology has its own mind, doesn't it? Give me a moment and we can try again.",
          "Hmm, seems like there's a little hiccup on my end. You know how it is with technology sometimes. Your thoughts are important to me, so let's try that again in a moment.",
          "I'm experiencing some connection issues right now, but that doesn't change that I'm here for you. Let's give it another try in a few seconds."
        ];
        
        return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      }
    }
  }

  // Method to warm up the model with progressive timeout
  async warmupModel() {
    console.log('🔥 Starting model warmup process...');
    
    // Try multiple warmup attempts with increasing timeouts
    const attempts = [
      { timeout: 30000, message: 'Hi' },
      { timeout: 120000, message: 'Hello' },
      { timeout: 300000, message: 'Test' }
    ];
    
    for (let i = 0; i < attempts.length; i++) {
      const attempt = attempts[i];
      console.log(`🔄 Warmup attempt ${i + 1}/${attempts.length} (${attempt.timeout/1000}s timeout)...`);
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), attempt.timeout);

        const response = await fetch(`${this.baseURL}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama3:70b',
            messages: [{ role: 'user', content: attempt.message }],
            stream: true // Use streaming for better timeout handling
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        
        if (response.ok) {
          // Try to read at least some of the streaming response
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let hasContent = false;
          
          try {
            const { done, value } = await reader.read();
            if (!done && value) {
              const chunk = decoder.decode(value);
              hasContent = chunk.length > 0;
            }
          } catch (e) {
            // Ignore streaming errors during warmup
          } finally {
            reader.releaseLock();
          }
          
          console.log('✅ Model warmed up successfully!');
          return true;
        }
      } catch (error) {
        console.log(`⚠️ Warmup attempt ${i + 1} failed:`, error.message);
        
        // Wait before next attempt (except for the last one)
        if (i < attempts.length - 1) {
          const delay = (i + 1) * 2000; // 2s, 4s delays
          console.log(`⏳ Waiting ${delay/1000}s before next attempt...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.log('❌ All warmup attempts failed');
    return false;
  }

  // Method to check if model is warm (quick test)
  async isModelWarm() {
    try {
      console.log('🌡️ Checking if model is warm...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s quick test

      const response = await fetch(`${this.baseURL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3:70b',
          messages: [{ role: 'user', content: '1' }],
          stream: true
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (response.ok) {
        // Try to read just the first chunk
        const reader = response.body.getReader();
        try {
          const { done, value } = await reader.read();
          reader.releaseLock();
          console.log('✅ Model appears to be warm');
          return true;
        } catch (e) {
          console.log('⚠️ Model warmth check inconclusive');
          return false;
        }
      }
      
      return false;
    } catch (error) {
      console.log('❄️ Model appears to be cold:', error.message);
      return false;
    }
  }

  // Method to test the connection
  async testConnection() {
    try {
      const response = await fetch(`${this.baseURL}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}

export default new ChatService();
