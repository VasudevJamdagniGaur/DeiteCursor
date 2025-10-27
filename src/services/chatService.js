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

      // Try different models in order of preference
      const apiUrl = `${this.baseURL}api/generate`;
      const modelOptions = ['llama3:8b', 'llama3', 'llama3.1:8b', 'llama3.1'];
      
      let selectedModel = modelOptions[0];
      let lastError = null;
      
      // First, try to get available models
      try {
        const tagsResponse = await fetch(`${this.baseURL}api/tags`);
        if (tagsResponse.ok) {
          const tagsData = await tagsResponse.json();
          const availableModels = tagsData.models?.map(m => m.name) || [];
          console.log('📋 Available models on server:', availableModels);
          
          // Use first available model from our preferred list
          for (const preferredModel of modelOptions) {
            if (availableModels.includes(preferredModel) || availableModels.some(m => m.includes(preferredModel))) {
              selectedModel = preferredModel;
              console.log('✅ Selected model:', selectedModel);
              break;
            }
          }
        }
      } catch (tagsError) {
        console.log('⚠️ Could not check available models, using default:', selectedModel);
      }
      
      console.log('📤 CHAT DEBUG: Full API URL:', apiUrl);
      console.log('📤 CHAT DEBUG: Prompt length:', simplePrompt.length);
      
      // Try models in order until one succeeds
      for (const modelToTry of modelOptions) {
        console.log('📤 CHAT DEBUG: Trying model:', modelToTry);
        
        try {
          const requestBody = {
            model: modelToTry,
            prompt: simplePrompt,
            stream: false,
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
}

export default ChatService;