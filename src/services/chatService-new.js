class ChatService {
  constructor() {
    // Updated to use the new backend server with warm-up system
    this.baseURL = 'http://localhost:3001';
    this.backendChatEndpoint = `${this.baseURL}/api/chat`;
  }

  async sendMessage(userMessage, conversationHistory = [], onToken = null) {
    console.log('🚀 CHAT DEBUG: Starting sendMessage with:', userMessage);
    console.log('🚀 CHAT DEBUG: Using backend URL:', this.backendChatEndpoint);
    console.log('🚀 CHAT DEBUG: Streaming enabled:', !!onToken);
    
    try {
      // Use the new backend API with warm-up system
      const response = await fetch(this.backendChatEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: conversationHistory
        })
      });

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log('✅ CHAT DEBUG: Received response from backend:', data);
      console.log('✅ CHAT DEBUG: Model warmed up:', data.modelWarmedUp);
      
      // Simulate streaming for compatibility with existing frontend
      if (onToken && data.response) {
        const words = data.response.split(' ');
        for (let i = 0; i < words.length; i++) {
          const word = words[i] + (i < words.length - 1 ? ' ' : '');
          onToken(word);
          // Small delay to simulate streaming
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      return data.response || 'I apologize, but I couldn\'t generate a response at this time.';
      
    } catch (error) {
      console.error('❌ CHAT DEBUG: Error in sendMessage:', error);
      throw error;
    }
  }
}

export default ChatService;
