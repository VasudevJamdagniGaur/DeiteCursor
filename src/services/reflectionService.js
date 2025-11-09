import firestoreService from './firestoreService';
import { getDateId } from '../utils/dateUtils';

class ReflectionService {
  constructor() {
    this.baseURL = 'https://f86jl4i8p64dqs-11434.proxy.runpod.net/';
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
    
    // Filter out system messages, whisper session messages, and get meaningful messages
    const userMessages = messages
      .filter(msg => msg.sender === 'user' && !msg.isWhisperSession)
      .map(msg => msg.text.trim())
      .filter(text => !this.isSimpleGreeting(text) && text.length > 3);

    const aiMessages = messages
      .filter(msg => msg.sender === 'ai' && !msg.isWhisperSession)
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
    console.log('🤖 Starting AI day summary generation...');
    
    // Create a conversation context for the AI
    const conversationContext = this.buildConversationContext(userMessages, aiMessages);
    console.log('📋 Conversation context created');
    
    const reflectionPrompt = `You are helping someone write a diary entry summarizing their day. Analyze the conversation below CAREFULLY and write an empathetic, thoughtful summary that captures the ACTUAL events and emotions discussed.

CRITICAL REQUIREMENTS:
1. READ THE ENTIRE CONVERSATION - Pay close attention to what the user actually shared
2. IDENTIFY THE EMOTIONAL TONE - Is it grief, sadness, joy, stress, anxiety, etc.? Reflect that tone appropriately
3. WRITE LIKE A DIARY ENTRY - Use first person, empathetic tone, like a personal journal
4. REFLECT WHAT WAS ACTUALLY DISCUSSED - If they mentioned losing a loved one, reflect grief. If they mentioned a happy event, reflect joy. DO NOT generate random summaries
5. BE SPECIFIC - Mention key topics, events, or feelings they actually talked about
6. SHOW EMPATHY - For difficult topics (loss, grief, stress), write with understanding and gentleness
7. 3-4 sentences, capturing the essence and emotional weight of the conversation

Conversation with Deite:
${conversationContext}

Write a diary entry summarizing this person's day based on what they ACTUALLY discussed. Match the emotional tone and reflect the real content of their conversation:`;

    // Minimal diagnostics to ensure we're not sending an empty prompt
    console.log('🧪 Reflection prompt length:', reflectionPrompt.length);
    console.log('🧪 Reflection prompt preview:', reflectionPrompt.slice(0, 200));

    console.log('🌐 Making API call to RunPod for reflection...');

    // Go directly to llama3:70b - skip model check
    const modelToUse = 'llama3:70b';
    
      try {
      console.log(`🔄 Using model: ${modelToUse} for reflection`);
        
        const response = await fetch(`${this.baseURL}api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
          model: modelToUse,
            prompt: reflectionPrompt,
            stream: false,
            options: {
              temperature: 0.5,  // Lower temperature for more accurate, focused summaries
              top_p: 0.9,
              max_tokens: 250  // Increased to allow for more detailed, empathetic summaries
            }
          })
        });

      console.log(`📥 Response status for ${modelToUse}:`, response.status);

        if (!response.ok) {
          const errorText = await response.text();
        console.error(`❌ RunPod API Error for ${modelToUse}:`, response.status, errorText);
        throw new Error(`Reflection generation failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
      console.log(`✅ RunPod response received for day summary with ${modelToUse}`);
        
        // Accept multiple possible fields from providers
        const text = (data && (data.response ?? data.output ?? data.message?.content)) || '';
        if (typeof text === 'string' && text.trim()) {
          const summary = text.trim();
          console.log('📖 Generated day summary:', summary);
          return summary;
        } else {
        console.error(`❌ Invalid response format from ${modelToUse}:`, data);
          console.log('🔍 Full response data:', JSON.stringify(data, null, 2));
        throw new Error('Invalid response format from reflection API');
        }
    } catch (error) {
      console.error(`💥 Error with model ${modelToUse}:`, error.message);
      throw error;
    }
  }

  createFallbackSummary(userMessages, aiMessages) {
    const lastUser = userMessages[userMessages.length - 1] || '';
    const firstUser = userMessages[0] || '';
    const base = (firstUser !== lastUser) ? `${firstUser} ... ${lastUser}` : lastUser;
    const trimmed = base.slice(0, 220);
    return `Today I chatted with Deite about: "${trimmed}${base.length > 220 ? '...' : ''}". It was nice to talk through my day and get some perspective.`;
  }

  buildConversationContext(userMessages, aiMessages) {
    let context = '';
    
    // Build a detailed conversation flow for better day summaries
    // Include more context to capture emotional depth and important topics
    userMessages.forEach((userMsg, index) => {
      context += `User: "${userMsg}"\n`;
      if (aiMessages[index]) {
        // Include more of the AI response to capture the emotional journey and context
        // Increased from 200 to 300 characters to better capture full context
        const aiResponse = aiMessages[index].substring(0, 300);
        context += `Deite: "${aiResponse}${aiMessages[index].length > 300 ? '...' : ''}"\n\n`;
      }
    });
    
    // Add a summary note at the end to help the AI identify key themes
    if (context.length > 0) {
      context += `\n---\nPlease analyze this conversation carefully and identify:\n`;
      context += `1. Key events or topics discussed (loss, grief, achievements, challenges, etc.)\n`;
      context += `2. Emotional tone (sad, grieving, happy, stressed, anxious, etc.)\n`;
      context += `3. Important details that should be reflected in the diary entry\n`;
    }
    
    return context.trim();
  }

  async saveReflection(userId, dateId, reflection) {
    try {
      console.log('💾 Saving reflection...');
      console.log('🔍 SAVE DEBUG: userId:', userId, 'dateId:', dateId, 'reflection length:', reflection?.length);
      
      // Analyze reflection for mood and insights
      const analysis = this.analyzeReflection(reflection);
      
      // Use new structure for saving reflections
      const reflectionData = {
        summary: reflection,
        mood: analysis.mood.toLowerCase(),
        score: analysis.score,
        insights: analysis.insights,
        source: 'auto'
      };
      
      console.log('🔍 SAVE DEBUG: Reflection data:', reflectionData);
      
      // Save to Firestore with new structure
      const result = await firestoreService.saveReflectionNew(userId, dateId, reflectionData);
      console.log('✅ Reflection saved successfully to Firestore (new structure)');
      
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