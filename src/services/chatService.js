class ChatService {
  constructor() {
    this.baseURL = 'https://71i6k2pjw5sbgb-11434.proxy.runpod.net';
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

  async sendMessage(userMessage, conversationHistory = [], onStreamChunk = null) {
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
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout for 70B model

      const response = await fetch(`${this.baseURL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3:70b',
          messages: messages,
          stream: !!onStreamChunk // Enable streaming if callback is provided
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
      }

      // Handle streaming response
      if (onStreamChunk && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

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
                  onStreamChunk(content);
                }
                
                // Check if the response is done
                if (data.done) {
                  return fullResponse.trim();
                }
              } catch (parseError) {
                // Skip invalid JSON lines
                continue;
              }
            }
          }
          
          return fullResponse.trim();
        } finally {
          reader.releaseLock();
        }
      } else {
        // Handle non-streaming response (fallback)
        const data = await response.json();
        console.log('API Response:', data);
        
        // Ollama native API returns the response in data.message.content
        if (data.message && data.message.content) {
          return data.message.content.trim();
        } else {
          console.error('Invalid response structure:', data);
          throw new Error('No response from AI model');
        }
      }
    } catch (error) {
      console.error('Error calling chat API:', error);
      
      // Handle different types of errors with appropriate Deite responses
      if (error.name === 'AbortError') {
        return "I'm taking a bit longer to process your thoughts than usual. You know how sometimes we need extra time to really think things through? Let's try again.";
      } else if (error.message.includes('524')) {
        return "The AI model is taking a bit longer to warm up than usual. This happens sometimes with larger models. Let's give it another try - your thoughts deserve a proper response.";
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
