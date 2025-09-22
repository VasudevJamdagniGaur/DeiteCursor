import firestoreService from './firestoreService';
import { getDateId } from '../utils/dateUtils';

class ReflectionService {
  constructor() {
    this.baseURL = 'https://2bgkbfa5o788fb-11434.proxy.runpod.net/';
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
    console.log('🔍 REFLECTION DEBUG: messages type:', typeof messages, 'length:', messages?.length);
    
    // Safety check and fix for messages
    if (!messages || !Array.isArray(messages)) {
      console.error('❌ REFLECTION ERROR: Invalid messages array, using fallback');
      return "Had a brief chat with Deite today.";
    }
    
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

    // Generate AI summary with safe fallback
    try {
      const aiSummary = await this.generateAISummary(userMessages, aiMessages);
      return aiSummary;
    } catch (err) {
      console.error('⚠️ Reflection generation via API failed, using fallback:', err?.message || err);
      return this.createFallbackSummary(userMessages, aiMessages);
    }
  }

  async generateAISummary(userMessages, aiMessages) {
    console.log('🤖 Starting AI journal summary generation...');
    
    // Create a conversation context for the AI
    const conversationContext = this.buildConversationContext(userMessages, aiMessages);
    console.log('📋 Conversation context created');
    
    const reflectionPrompt = `You are an empathetic AI assistant helping someone reflect on their day. Based on the conversation below, write a thoughtful, personal journal entry in first person that captures the essence of what they shared and experienced.

Guidelines:
- Write in first person ("I felt...", "Today I...")
- Keep it warm, personal, and reflective
- Focus on emotions, insights, and meaningful moments discussed
- 2-3 sentences maximum
- Make it sound like a real person writing in their journal

Conversation with Deite:
${conversationContext}

Write a personal journal entry that reflects this person's day and feelings:`;

    // Minimal diagnostics to ensure we're not sending an empty prompt
    console.log('🧪 Reflection prompt length:', reflectionPrompt.length);
    console.log('🧪 Reflection prompt preview:', reflectionPrompt.slice(0, 200));

    console.log('🌐 Making API call to RunPod for reflection...');

    // Use consistent model names
    const modelOptions = ['llama3:70b', 'llama3.1:70b', 'llama3:8b', 'llama3'];
    
    for (const model of modelOptions) {
      try {
        console.log(`🔄 Trying model: ${model} for reflection`);
        
        const response = await fetch(`${this.baseURL}api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            prompt: reflectionPrompt,
            stream: false,
            options: {
              temperature: 0.7,
              top_p: 0.9,
              max_tokens: 150
            }
          })
        });

        console.log(`📥 Response status for ${model}:`, response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ RunPod API Error for ${model}:`, response.status, errorText);
          continue; // Try next model
        }

        const data = await response.json();
        console.log(`✅ RunPod response received for journal generation with ${model}`);
        
        // Accept multiple possible fields from providers
        const text = (data && (data.response ?? data.output ?? data.message?.content)) || '';
        if (typeof text === 'string' && text.trim()) {
          const summary = text.trim();
          console.log('📖 Generated journal summary:', summary);
          return summary;
        } else {
          console.error(`❌ Invalid response format from ${model}:`, data);
          console.log('🔍 Full response data:', JSON.stringify(data, null, 2));
          continue; // Try next model
        }
      } catch (modelError) {
        console.error(`💥 Error with model ${model}:`, modelError.message);
        continue; // Try next model
      }
    }
    
    // If all models failed, throw error
    throw new Error('All models failed for reflection generation');
  }

  createFallbackSummary(userMessages, aiMessages) {
    const lastUser = userMessages[userMessages.length - 1] || '';
    const firstUser = userMessages[0] || '';
    const base = (firstUser !== lastUser) ? `${firstUser} ... ${lastUser}` : lastUser;
    const trimmed = base.slice(0, 220);
    return `Today I reflected on my day with Deite. I shared about: “${trimmed}${base.length > 220 ? '...' : ''}”. It was helpful to pause, notice my feelings, and consider what matters next.`;
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
      console.log('🔍 SAVE DEBUG: userId:', userId, 'dateId:', dateId, 'reflection length:', reflection?.length);
      
      // Simplified reflection data structure
      const reflectionData = {
        summary: reflection,
        date: dateId,
        userId: userId,
        timestamp: new Date().toISOString(),
        source: 'auto'
      };
      
      console.log('🔍 SAVE DEBUG: Reflection data:', reflectionData);
      
      // Save to Firestore with simplified structure
      const result = await firestoreService.saveDayReflection(userId, dateId, reflectionData);
      console.log('✅ Reflection saved successfully to Firestore');
      
      // Also save to localStorage as backup
      localStorage.setItem(`reflection_${dateId}`, reflection);
      console.log('✅ Reflection saved to localStorage as backup');
      
      return result;
    } catch (error) {
      console.error('❌ Error saving reflection:', error);
      // Fallback to localStorage only
      localStorage.setItem(`reflection_${dateId}`, reflection);
      console.log('✅ Reflection saved to localStorage (fallback)');
      return { success: true };
    }
  }

  async getReflection(userId, dateId) {
    try {
      console.log('📖 GET DEBUG: Getting reflection for userId:', userId, 'dateId:', dateId);
      
      // Try new Firestore structure first
      const result = await firestoreService.getReflectionNew(userId, dateId);
      console.log('📖 GET DEBUG: New Firestore result:', result);
      
      if (result.success && result.reflection) {
        console.log('📖 GET DEBUG: Found in new Firestore structure:', result.reflection);
        return { 
          success: true, 
          reflection: result.reflection
        };
      }
      
      // Fallback to localStorage
      const localReflection = localStorage.getItem(`reflection_${dateId}`);
      if (localReflection) {
        console.log('📖 GET DEBUG: Found in localStorage:', localReflection);
        return { success: true, reflection: localReflection };
      }
      
      console.log('📖 GET DEBUG: No reflection found anywhere');
      return { success: true, reflection: null };
    } catch (error) {
      console.error('❌ Error getting reflection:', error);
      // Fallback to localStorage only
      const localReflection = localStorage.getItem(`reflection_${dateId}`);
      return { 
        success: true, 
        reflection: localReflection || null 
      };
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