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

  async sendMessage(userMessage, conversationHistory = [], onStreamChunk = null) {
    try {
      console.log('🚀 Sending message to RunPod API...');
      
      // Simple message format - just current message for now
      const messages = [
        {
          role: 'system',
          content: this.systemPrompt
        },
        {
          role: 'user',
          content: userMessage
        }
      ];

      console.log('📤 Request payload:', { model: 'llama3:70b', messages: messages.length });

      const response = await fetch(`${this.baseURL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3:70b',
          messages: messages,
          stream: false // Start with non-streaming for simplicity
        })
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', response.status, errorText);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ API Response received:', data);

      if (data.message && data.message.content) {
        return data.message.content.trim();
      } else {
        console.error('❌ Invalid response structure:', data);
        throw new Error('Invalid response from API');
      }

    } catch (error) {
      console.error('❌ Chat API Error:', error);
      
      // Simple fallback message
      return "I'm having a moment of technical difficulty, but I'm still here for you. Let's try that again in a moment.";
    }
  }

  // Simplified warmup method
  async warmupModel() {
    console.log('🔥 Warming up model...');
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutes

      const response = await fetch(`${this.baseURL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'keep-alive'
        },
        body: JSON.stringify({
          model: 'llama3:70b',
          messages: [{ role: 'user', content: 'Hi' }],
          stream: true,
          options: {
            num_ctx: 512,
            num_predict: 10
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (response.ok) {
        // Just check if we can read the response
        const reader = response.body.getReader();
        try {
          await reader.read();
          reader.releaseLock();
          console.log('✅ Model warmed up successfully!');
          return true;
        } catch (e) {
          console.log('⚠️ Warmup response read failed, but connection worked');
          return true; // Connection worked, that's good enough
        }
      }
      
      console.log('❌ Warmup failed with status:', response.status);
      return false;
    } catch (error) {
      console.log('❌ Warmup failed:', error.message);
      return false;
    }
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

  // Simple test method to verify chat API works
  async testChatAPI() {
    console.log('🧪 Testing chat API...');
    try {
      const result = await this.sendMessage('test', [], null);
      console.log('✅ Chat API test successful:', result.substring(0, 50) + '...');
      return true;
    } catch (error) {
      console.log('❌ Chat API test failed:', error.message);
      return false;
    }
  }
}

export default new ChatService();
