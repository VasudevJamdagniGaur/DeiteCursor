import firestoreService from './firestoreService';
import { getDateId } from '../utils/dateUtils';

class ReflectionService {
  constructor() {
    this.baseURL = 'https://huccz96dzpalfa-11434.proxy.runpod.net/';
    this.greetings = ['hey', 'hi', 'hello', 'hii', 'hiii', 'hiiii', 'sup', 'yo', 'what\'s up', 'wassup'];
  }

  isSimpleGreeting(message) {
    const cleanMsg = message.toLowerCase().trim();
    return this.greetings.some(greeting => 
      cleanMsg === greeting || 
      cleanMsg === greeting + '!' || 
      cleanMsg === greeting + '.'
    );
  }

  async generateReflection(messages) {
    console.log('🔄 Starting reflection generation...');
    console.log('💬 Total messages for reflection:', messages.length);
    
    // Filter out system messages and get meaningful messages
    const userMessages = messages
      .filter(msg => msg.sender === 'user')
      .map(msg => msg.text.trim())
      .filter(text => !this.isSimpleGreeting(text) && text.length > 3);

    const aiMessages = messages
      .filter(msg => msg.sender === 'ai')
      .map(msg => msg.text.trim());

    console.log('📝 User messages:', userMessages.length);
    console.log('🤖 AI messages:', aiMessages.length);

    if (userMessages.length === 0) {
      return "Had a brief chat with Deite today but didn't share much.";
    }

    // Generate AI summary
    const aiSummary = await this.generateAISummary(userMessages, aiMessages);
    return aiSummary;
  }

  async generateAISummary(userMessages, aiMessages) {
    console.log('🤖 REFLECTION: Starting AI journal summary generation...');
    console.log('🤖 REFLECTION: RunPod URL:', this.baseURL);
    
    // Create a conversation context for the AI
    const conversationContext = this.buildConversationContext(userMessages, aiMessages);
    console.log('📋 REFLECTION: Conversation context created, length:', conversationContext.length);
    
    const reflectionPrompt = `Based on the user's chat messages, generate a concise and realistic daily journal entry. Do not invent or exaggerate events. Summarize the main emotions, concerns, and insights discussed during the conversation. Write in a grounded, honest tone — like a real person journaling about their day. Only use the content actually discussed in the messages. Do not make up metaphors or fictional events. The tone should be factual. Keep it brief and to the point.

Conversation with Deite:
${conversationContext}

Daily journal entry:`;

    console.log('🌐 REFLECTION: Making API call to RunPod...');

    // First, let's check what models are available
    let availableModels = [];
    try {
      console.log('🔍 REFLECTION: Checking available models...');
      const modelsResponse = await fetch(`${this.baseURL}api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (modelsResponse.ok) {
        const modelsData = await modelsResponse.json();
        availableModels = modelsData.models?.map(m => m.name) || [];
        console.log('🔍 REFLECTION: Available models:', availableModels);
      } else {
        console.log('🔍 REFLECTION: Could not fetch models, status:', modelsResponse.status);
      }
    } catch (e) {
      console.log('🔍 REFLECTION: Could not fetch models:', e.message);
    }

    // Create attempts based on available models first, then fallbacks
    const attempts = [];
    
    // Add attempts for available models
    if (availableModels.length > 0) {
      for (const model of availableModels.slice(0, 3)) { // Try first 3 models
        attempts.push({
          url: `${this.baseURL}api/generate`,
          body: {
            model: model,
            prompt: reflectionPrompt,
            stream: false
          },
          name: `Generate API (${model})`
        });
        attempts.push({
          url: `${this.baseURL}api/chat`,
          body: {
            model: model,
            messages: [{ role: 'user', content: reflectionPrompt }],
            stream: false
          },
          name: `Chat API (${model})`
        });
      }
    }
    
    // Add common fallback attempts
    const fallbackModels = ['llama3.1', 'llama3', 'llama2', 'llama3:8b', 'llama3:70b'];
    for (const model of fallbackModels) {
      if (!availableModels.includes(model)) {
        attempts.push({
          url: `${this.baseURL}api/generate`,
          body: {
            model: model,
            prompt: reflectionPrompt,
            stream: false
          },
          name: `Generate API (${model})`
        });
        attempts.push({
          url: `${this.baseURL}api/chat`,
          body: {
            model: model,
            messages: [{ role: 'user', content: reflectionPrompt }],
            stream: false
          },
          name: `Chat API (${model})`
        });
      }
    }

    console.log(`🎯 REFLECTION: Will try ${attempts.length} different approaches`);

    for (const attempt of attempts) {
      try {
        console.log(`🔄 REFLECTION: Trying ${attempt.name}...`);
        
        const response = await fetch(attempt.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(attempt.body)
        });

        console.log(`📥 REFLECTION: ${attempt.name} Response status:`, response.status);
        console.log(`📥 REFLECTION: ${attempt.name} Response headers:`, [...response.headers.entries()]);

        if (response.ok) {
          const data = await response.json();
          console.log(`✅ REFLECTION: ${attempt.name} Response data:`, data);
          
          // Handle different response formats
          let summary = null;
          if (data.message && data.message.content) {
            summary = data.message.content.trim();
            console.log('📖 REFLECTION: Using message.content format');
          } else if (data.response) {
            summary = data.response.trim();
            console.log('📖 REFLECTION: Using response format');
          } else if (data.content) {
            summary = data.content.trim();
            console.log('📖 REFLECTION: Using content format');
          } else if (data.choices && data.choices[0] && data.choices[0].message) {
            summary = data.choices[0].message.content.trim();
            console.log('📖 REFLECTION: Using OpenAI format');
          }
          
          if (summary && summary.length > 10) {
            console.log('🎉 REFLECTION: Successfully generated journal summary:', summary);
            return summary;
          } else {
            console.log('⚠️ REFLECTION: Response too short or empty:', summary);
          }
        } else {
          const errorText = await response.text();
          console.log(`❌ REFLECTION: ${attempt.name} Error response (${response.status}):`, errorText);
        }
      } catch (attemptError) {
        console.log(`❌ REFLECTION: ${attempt.name} failed:`, attemptError.message);
      }
    }

    // If all attempts fail, return a fallback reflection
    console.log('⚠️ REFLECTION: All API attempts failed, creating fallback reflection');
    
    // Create a simple fallback based on user messages
    if (userMessages.length > 0) {
      const topics = this.extractTopics(userMessages);
      const fallbackReflection = `Today I had a meaningful conversation with Deite. We discussed ${topics.join(', ')}. It was helpful to reflect on these thoughts and feelings.`;
      console.log('📝 REFLECTION: Generated fallback reflection:', fallbackReflection);
      return fallbackReflection;
    }
    
    const defaultReflection = "Had a brief chat with Deite today but didn't share much.";
    console.log('📝 REFLECTION: Using default reflection:', defaultReflection);
    return defaultReflection;
  }

  buildConversationContext(userMessages, aiMessages) {
    let context = '';
    
    // Build a detailed conversation flow for better journal summaries
    userMessages.forEach((userMsg, index) => {
      context += `User: "${userMsg}"\n`;
      if (aiMessages[index]) {
        // Include more of the AI response to capture the emotional journey
        const aiResponse = aiMessages[index].substring(0, 200);
        context += `Deite: "${aiResponse}${aiMessages[index].length > 200 ? '...' : ''}"\n\n`;
      }
    });
    
    return context.trim();
  }

  extractTopics(userMessages) {
    // Simple topic extraction for fallback reflections
    const topics = [];
    const topicKeywords = {
      'work': ['work', 'job', 'career', 'office', 'boss', 'colleague'],
      'family': ['family', 'mom', 'dad', 'parent', 'sibling', 'child'],
      'relationships': ['friend', 'relationship', 'partner', 'boyfriend', 'girlfriend'],
      'health': ['health', 'doctor', 'sick', 'tired', 'exercise', 'sleep'],
      'emotions': ['feel', 'emotion', 'happy', 'sad', 'angry', 'anxious', 'stressed'],
      'future': ['future', 'plan', 'goal', 'dream', 'hope', 'worry']
    };
    
    const messageText = userMessages.join(' ').toLowerCase();
    
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => messageText.includes(keyword))) {
        topics.push(topic);
      }
    }
    
    return topics.length > 0 ? topics : ['various topics'];
  }

  async testConnection() {
    console.log('🔍 REFLECTION: Testing RunPod connection...');
    
    try {
      // First, try to check if Ollama is running
      const healthResponse = await fetch(`${this.baseURL}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('🔍 REFLECTION: Health check response:', healthResponse.status);

      if (healthResponse.ok) {
        const healthText = await healthResponse.text();
        console.log('🔍 REFLECTION: Health response text:', healthText);
        
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
            console.log('🔍 REFLECTION: Available models:', modelsData);
            
            return {
              status: 'success',
              message: 'RunPod connection successful for reflections',
              details: `Available models: ${modelsData.models?.map(m => m.name).join(', ') || 'No models found'}`,
              models: modelsData.models || []
            };
          }
        } catch (modelsError) {
          console.log('🔍 REFLECTION: Models endpoint not available, but base connection works');
        }

        return {
          status: 'success',
          message: 'RunPod connection successful for reflections',
          details: 'Ollama is running'
        };
      }

      return {
        status: 'error',
        message: 'RunPod connection failed for reflections',
        details: `HTTP ${healthResponse.status}`
      };

    } catch (error) {
      console.error('🔍 REFLECTION: Connection test error:', error);
      return {
        status: 'error',
        message: 'RunPod connection failed for reflections',
        details: error.message
      };
    }
  }

  async saveReflection(userId, dateId, reflection) {
    try {
      console.log('💾 Saving reflection...');
      
      // Analyze the reflection content to extract mood and insights
      const analysis = this.analyzeReflection(reflection);
      
      const reflectionData = {
        summary: reflection,
        mood: analysis.mood,
        score: analysis.score,
        insights: analysis.insights,
        source: 'auto'
      };
      
      const result = await firestoreService.saveDayReflection(userId, dateId, reflectionData);
      console.log('✅ Reflection saved successfully');
      return result;
    } catch (error) {
      console.error('Error saving reflection:', error);
      return { success: false, error: error.message };
    }
  }

  async getReflection(userId, dateId) {
    try {
      const result = await firestoreService.getDayReflection(userId, dateId);
      if (result.success && result.reflection) {
        return { 
          success: true, 
          reflection: result.reflection.summary,
          fullData: result.reflection 
        };
      }
      return { success: true, reflection: null };
    } catch (error) {
      console.error('Error getting reflection:', error);
      return { success: false, error: error.message };
    }
  }

  analyzeReflection(reflection) {
    const lowerReflection = reflection.toLowerCase();
    
    // Simple mood analysis based on keywords
    const moodKeywords = {
      'Happy': ['happy', 'good', 'great', 'excited', 'positive', 'hopeful'],
      'Sad': ['sad', 'down', 'depressed', 'upset', 'disappointed'],
      'Anxious': ['anxious', 'worried', 'nervous', 'stressed', 'overwhelmed'],
      'Angry': ['angry', 'frustrated', 'annoyed', 'mad'],
      'Peaceful': ['calm', 'peaceful', 'relaxed', 'content'],
      'Neutral': []
    };

    let detectedMood = 'Neutral';
    let maxScore = 0;

    for (const [mood, keywords] of Object.entries(moodKeywords)) {
      if (mood === 'Neutral') continue;
      
      const score = keywords.reduce((count, keyword) => {
        return count + (lowerReflection.includes(keyword) ? 1 : 0);
      }, 0);
      
      if (score > maxScore) {
        maxScore = score;
        detectedMood = mood;
      }
    }

    // Calculate score (0-100) based on mood
    let score = 50; // neutral baseline
    switch (detectedMood) {
      case 'Happy':
      case 'Peaceful':
        score = 75 + Math.min(25, maxScore * 5);
        break;
      case 'Sad':
      case 'Angry':
        score = Math.max(15, 40 - maxScore * 5);
        break;
      case 'Anxious':
        score = Math.max(25, 45 - maxScore * 3);
        break;
      default:
        score = 50;
    }

    // Extract insights
    const insights = [];
    if (lowerReflection.includes('work')) insights.push('Work discussion');
    if (lowerReflection.includes('relationship') || lowerReflection.includes('family')) insights.push('Relationship focus');
    if (lowerReflection.includes('health')) insights.push('Health consideration');
    if (lowerReflection.includes('future') || lowerReflection.includes('plan')) insights.push('Future planning');
    if (lowerReflection.includes('stress') || lowerReflection.includes('anxiety')) insights.push('Stress management');

    return {
      mood: detectedMood,
      score: Math.round(score),
      insights: insights.length > 0 ? insights : ['General reflection']
    };
  }
}

const reflectionServiceInstance = new ReflectionService();

// Add a global test function for debugging
if (typeof window !== 'undefined') {
  window.testReflectionService = async () => {
    console.log('🧪 TESTING: Starting reflection service test...');
    
    // Test connection
    const connectionResult = await reflectionServiceInstance.testConnection();
    console.log('🧪 TESTING: Connection result:', connectionResult);
    
    // Test with sample messages
    const sampleMessages = [
      { sender: 'user', text: 'Hi, I had a tough day at work today' },
      { sender: 'ai', text: 'I understand that work can be challenging. Would you like to talk about what made it difficult?' },
      { sender: 'user', text: 'My boss was being really demanding and I felt overwhelmed' },
      { sender: 'ai', text: 'Feeling overwhelmed by demanding expectations is really stressful. How are you feeling about it now?' }
    ];
    
    console.log('🧪 TESTING: Testing reflection generation with sample messages...');
    
    try {
      const reflection = await reflectionServiceInstance.generateReflection(sampleMessages);
      console.log('🧪 TESTING: Generated reflection:', reflection);
      return {
        success: true,
        reflection: reflection,
        connection: connectionResult
      };
    } catch (error) {
      console.error('🧪 TESTING: Reflection generation failed:', error);
      return {
        success: false,
        error: error.message,
        connection: connectionResult
      };
    }
  };
}

export default reflectionServiceInstance;