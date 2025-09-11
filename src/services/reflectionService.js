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
    console.log('🤖 Starting AI journal summary generation...');
    
    // Create a conversation context for the AI
    const conversationContext = this.buildConversationContext(userMessages, aiMessages);
    console.log('📋 Conversation context created');
    
    const reflectionPrompt = `Based on the user's chat messages, generate a concise and realistic daily journal entry. Do not invent or exaggerate events. Summarize the main emotions, concerns, and insights discussed during the conversation. Write in a grounded, honest tone — like a real person journaling about their day. Only use the content actually discussed in the messages. Do not make up metaphors or fictional events. The tone should be factual. Keep it brief and to the point.

Conversation with Deite:
${conversationContext}

Daily journal entry:`;

    console.log('🌐 Making API call to RunPod...');

    try {
      const response = await fetch(`${this.baseURL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3.1',
          messages: [
            {
              role: 'user',
              content: reflectionPrompt
            }
          ],
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9
          }
        })
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ RunPod API Error:', response.status, errorText);
        throw new Error(`RunPod API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ RunPod response received for journal generation');
      
      if (data.message && data.message.content) {
        const summary = data.message.content.trim();
        console.log('📖 Generated journal summary:', summary);
        return summary;
      } else {
        console.error('❌ Invalid response format:', data);
        throw new Error('Invalid response format from API');
      }
    } catch (error) {
      console.error('💥 Error calling RunPod API for journal summary:', error);
      throw error;
    }
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

export default new ReflectionService();