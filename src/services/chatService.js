class ChatService {
  constructor() {
    // Updated to use CORS proxy server to bypass browser CORS restrictions
    this.baseURL = 'http://localhost:3001';
    this.chatEndpoint = `${this.baseURL}/api/chat`;
  }

  async sendMessage(userMessage, conversationHistory = [], onToken = null) {
    console.log('🚀 CHAT DEBUG: Starting sendMessage with:', userMessage);
    console.log('🚀 CHAT DEBUG: Using proxy server:', this.chatEndpoint);
    console.log('🚀 CHAT DEBUG: Streaming enabled:', !!onToken);
    
    try {
      // Use the CORS proxy server
      const response = await fetch(this.chatEndpoint, {
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
        throw new Error(`Proxy server error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log('✅ CHAT DEBUG: Received response from proxy:', data);
      
      if (data.success && data.response) {
        // Simulate streaming for compatibility with existing frontend
        if (onToken) {
          const words = data.response.split(' ');
          for (let i = 0; i < words.length; i++) {
            const word = words[i] + (i < words.length - 1 ? ' ' : '');
            onToken(word);
            // Small delay to simulate streaming
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
        
        return data.response;
      } else {
        throw new Error('Invalid response from proxy server');
      }
      
    } catch (error) {
      console.error('❌ CHAT DEBUG: Error in sendMessage:', error);
      throw error;
    }
  }
}

export default ChatService;