class ChatService {
  constructor() {
    // Updated to use RunPod Ollama directly
    this.baseURL = 'https://v1jsqencdtvwvq-11434.proxy.runpod.net';
    this.modelName = 'llama3:70b'; // Using the available model from your RunPod
  }

  async sendMessage(userMessage, conversationHistory = [], onToken = null) {
    console.log('🚀 CHAT DEBUG: Starting sendMessage with:', userMessage);
    console.log('🚀 CHAT DEBUG: Using RunPod URL:', this.baseURL);
    console.log('🚀 CHAT DEBUG: Model:', this.modelName);
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

      // Create a simple prompt from messages for generate API
      const simplePrompt = messages.map(msg => {
        if (msg.role === 'system') return msg.content;
        if (msg.role === 'user') return `Human: ${msg.content}`;
        if (msg.role === 'assistant') return `Assistant: ${msg.content}`;
        return msg.content;
      }).join('\n\n') + '\n\nAssistant:';

      console.log('📤 CHAT DEBUG: Sending request to RunPod Ollama...');

      // Use RunPod Ollama API directly
      const response = await fetch(`${this.baseURL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.modelName,
          prompt: simplePrompt,
          stream: !!onToken, // Enable streaming if onToken callback provided
          options: {
            temperature: 0.7,
            max_tokens: 200
          }
        })
      });

      if (!response.ok) {
        throw new Error(`RunPod Ollama API error: ${response.status} ${response.statusText}`);
      }

      if (onToken && response.body) {
        // Handle streaming response
        console.log('🌊 CHAT DEBUG: Processing streaming response...');
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              console.log('🌊 Streaming completed');
              break;
            }
            
            const chunk = decoder.decode(value, { stream: true });
            
            // Parse JSON lines
            const lines = chunk.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
              try {
                const data = JSON.parse(line);
                
                if (data.response) {
                  fullResponse += data.response;
                  
                  // Call onToken callback if provided
                  if (onToken) {
                    onToken(data.response);
                  }
                }
                
                if (data.done) {
                  console.log('🌊 Stream done, full response:', fullResponse);
                  return fullResponse;
                }
              } catch (parseError) {
                console.log('🌊 Parse error for line:', line);
              }
            }
          }
          
          if (fullResponse) {
            console.log('✅ Streaming response completed:', fullResponse);
            return fullResponse;
          }
          
        } catch (streamError) {
          console.error('❌ Streaming error:', streamError);
          throw streamError;
        }
      } else {
        // Handle non-streaming response
        const data = await response.json();
        console.log('✅ CHAT DEBUG: Received response from RunPod:', data);
        
        if (data.response) {
          return data.response;
        } else {
          throw new Error('No response field in Ollama API response');
        }
      }
      
    } catch (error) {
      console.error('❌ CHAT DEBUG: Error in sendMessage:', error);
      throw error;
    }
  }
}

export default ChatService;