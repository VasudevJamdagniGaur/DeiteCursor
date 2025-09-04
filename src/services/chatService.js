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
}

export default new ChatService();
