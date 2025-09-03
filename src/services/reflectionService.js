import firestoreService from './firestoreService';
import { getDateId } from '../utils/dateUtils';

class ReflectionService {
  constructor() {
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
    // Filter out system messages and get meaningful messages
    const userMessages = messages
      .filter(msg => msg.sender === 'user')
      .map(msg => msg.text.trim())
      .filter(text => !this.isSimpleGreeting(text) && text.length > 3);

    const aiMessages = messages
      .filter(msg => msg.sender === 'ai')
      .map(msg => msg.text.trim());

    if (userMessages.length === 0) {
      return "Had a brief chat with Deite today but didn't share much.";
    }

    try {
      // Use AI to generate a diary-style summary
      const aiSummary = await this.generateAISummary(userMessages, aiMessages);
      return aiSummary;
    } catch (error) {
      console.error('Error generating AI summary:', error);
      // Fallback to manual summary if AI fails
      return this.createDiarySummary(userMessages);
    }
  }

  async generateAISummary(userMessages, aiMessages) {
    const baseURL = 'https://3jya7uttzipxsb-11434.proxy.runpod.net/';
    
    console.log('🤖 Starting AI summary generation...');
    console.log('📝 User messages:', userMessages.length);
    console.log('🤖 AI messages:', aiMessages.length);
    
    // Create a conversation context for the AI
    const conversationContext = this.buildConversationContext(userMessages, aiMessages);
    console.log('📋 Conversation context:', conversationContext.substring(0, 200) + '...');
    
    const prompt = `Create a diary-style summary of this conversation between a user and Deite (an AI companion).

Write a personal diary entry from the user's perspective. Format:
- Start with "Today I talked with Deite about..."
- Include main topics and emotions
- End with how the conversation felt
- Keep it 2-3 sentences, natural and personal

Conversation:
${conversationContext}

Diary entry:`;

    console.log('🌐 Making API call to:', `${baseURL}/api/chat`);

    try {
      const requestBody = {
        model: 'llama3:70b',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        stream: false
      };

      console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));

      // Add timeout to the request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`${baseURL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('📥 Response status:', response.status);
      console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('📄 API Response:', data);
      
      if (data.message && data.message.content) {
        const summary = data.message.content.trim();
        console.log('✅ Generated AI summary:', summary);
        return summary;
      } else {
        console.error('❌ Invalid response format:', data);
        throw new Error('Invalid response format from API');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('⏰ API request timed out after 30 seconds');
      } else if (error.message.includes('Failed to fetch')) {
        console.error('🌐 Network error - could not reach API server');
      } else {
        console.error('💥 Error calling AI API for summary:', error);
      }
      throw error; // Re-throw to trigger fallback
    }
  }

  buildConversationContext(userMessages, aiMessages) {
    let context = '';
    
    // Build a conversation flow showing what the user said
    userMessages.forEach((userMsg, index) => {
      context += `User: ${userMsg}\n`;
      if (aiMessages[index]) {
        // Include a brief part of AI response to show context
        const aiResponse = aiMessages[index].substring(0, 100);
        context += `Deite: ${aiResponse}${aiMessages[index].length > 100 ? '...' : ''}\n\n`;
      }
    });
    
    return context.trim();
  }

  createDiarySummary(userMessages) {
    let summary = "Today I talked with Deite about ";

    // Extract what was actually discussed
    const topics = this.extractTopicsFromMessages(userMessages);
    const emotions = this.extractEmotionsFromMessages(userMessages);
    const situations = this.extractSituationsFromMessages(userMessages);

    // Build the diary entry
    if (topics.length > 0) {
      if (topics.length === 1) {
        summary += `${topics[0]}. `;
      } else if (topics.length === 2) {
        summary += `${topics[0]} and ${topics[1]}. `;
      } else {
        summary += `${topics.slice(0, -1).join(', ')}, and ${topics[topics.length - 1]}. `;
      }
    } else {
      summary += "various things on my mind. ";
    }

    // Add emotional context
    if (emotions.length > 0) {
      summary += this.createEmotionalContext(emotions);
    }

    // Add specific situations mentioned
    if (situations.length > 0) {
      summary += this.createSituationContext(situations);
    }

    // Add how the conversation felt
    const conversationTone = this.analyzeTone(userMessages);
    summary += this.createToneContext(conversationTone);

    return summary.trim();
  }

  extractTopicsFromMessages(userMessages) {
    const topics = new Set();
    
    userMessages.forEach(msg => {
      const lower = msg.toLowerCase();
      
      // Work-related
      if (lower.includes('work') || lower.includes('job') || lower.includes('career') || 
          lower.includes('office') || lower.includes('boss') || lower.includes('colleague')) {
        topics.add('my work situation');
      }
      
      // Relationships
      if (lower.includes('family') || lower.includes('relationship') || lower.includes('partner') || 
          lower.includes('friend') || lower.includes('boyfriend') || lower.includes('girlfriend') ||
          lower.includes('parents') || lower.includes('mom') || lower.includes('dad')) {
        topics.add('my relationships');
      }
      
      // Health and wellbeing
      if (lower.includes('health') || lower.includes('sleep') || lower.includes('tired') || 
          lower.includes('sick') || lower.includes('exercise') || lower.includes('diet')) {
        topics.add('my health and wellbeing');
      }
      
      // Stress and mental health
      if (lower.includes('stress') || lower.includes('anxious') || lower.includes('worried') || 
          lower.includes('overwhelmed') || lower.includes('mental health') || lower.includes('therapy')) {
        topics.add('stress and anxiety I\'ve been feeling');
      }
      
      // Future and goals
      if (lower.includes('future') || lower.includes('plan') || lower.includes('goal') || 
          lower.includes('dream') || lower.includes('want to') || lower.includes('hope')) {
        topics.add('my future plans and goals');
      }
      
      // Money and finances
      if (lower.includes('money') || lower.includes('financial') || lower.includes('budget') || 
          lower.includes('expense') || lower.includes('salary') || lower.includes('pay')) {
        topics.add('financial concerns');
      }
      
      // Education and learning
      if (lower.includes('study') || lower.includes('school') || lower.includes('university') || 
          lower.includes('learn') || lower.includes('course') || lower.includes('exam')) {
        topics.add('my studies and learning');
      }
      
      // Personal growth
      if (lower.includes('change') || lower.includes('improve') || lower.includes('better myself') || 
          lower.includes('grow') || lower.includes('develop')) {
        topics.add('personal growth and self-improvement');
      }
    });

    return Array.from(topics);
  }

  extractEmotionsFromMessages(userMessages) {
    const emotions = new Set();
    
    userMessages.forEach(msg => {
      const lower = msg.toLowerCase();
      
      // Look for explicit emotion statements
      if (lower.includes('i feel') || lower.includes('i\'m feeling') || lower.includes('feeling')) {
        if (lower.includes('sad') || lower.includes('down') || lower.includes('depressed')) {
          emotions.add('sad');
        }
        if (lower.includes('happy') || lower.includes('good') || lower.includes('great') || lower.includes('excited')) {
          emotions.add('happy');
        }
        if (lower.includes('anxious') || lower.includes('nervous') || lower.includes('worried')) {
          emotions.add('anxious');
        }
        if (lower.includes('angry') || lower.includes('frustrated') || lower.includes('annoyed')) {
          emotions.add('frustrated');
        }
        if (lower.includes('confused') || lower.includes('lost') || lower.includes('unclear')) {
          emotions.add('confused');
        }
        if (lower.includes('tired') || lower.includes('exhausted') || lower.includes('drained')) {
          emotions.add('tired');
        }
        if (lower.includes('hopeful') || lower.includes('optimistic') || lower.includes('positive')) {
          emotions.add('hopeful');
        }
        if (lower.includes('overwhelmed') || lower.includes('stressed')) {
          emotions.add('overwhelmed');
        }
      }
    });

    return Array.from(emotions);
  }

  extractSituationsFromMessages(userMessages) {
    const situations = [];
    
    userMessages.forEach(msg => {
      const lower = msg.toLowerCase();
      
      // Look for specific situations
      if (lower.includes('problem') || lower.includes('issue')) {
        situations.push('I shared some problems I\'ve been dealing with');
      }
      if (lower.includes('decision') || lower.includes('choice') || lower.includes('should i')) {
        situations.push('I asked for advice on some decisions I need to make');
      }
      if (lower.includes('happened') || lower.includes('today') || lower.includes('yesterday')) {
        situations.push('I told Deite about some recent events in my life');
      }
      if (lower.includes('difficult') || lower.includes('hard') || lower.includes('struggle')) {
        situations.push('I opened up about some difficulties I\'ve been facing');
      }
      if (lower.includes('excited about') || lower.includes('good news') || lower.includes('achievement')) {
        situations.push('I shared some positive news and achievements');
      }
      if (lower.includes('confused about') || lower.includes('don\'t understand') || lower.includes('unsure')) {
        situations.push('I expressed confusion about some things in my life');
      }
    });

    return [...new Set(situations)]; // Remove duplicates
  }

  createEmotionalContext(emotions) {
    if (emotions.length === 0) return '';
    
    if (emotions.length === 1) {
      return `I was feeling quite ${emotions[0]} and it helped to talk about it. `;
    } else if (emotions.length === 2) {
      return `I was experiencing mixed emotions - feeling ${emotions[0]} and ${emotions[1]}. `;
    } else {
      return `I was going through a lot of different emotions - ${emotions.join(', ')}. `;
    }
  }

  createSituationContext(situations) {
    if (situations.length === 0) return '';
    
    if (situations.length === 1) {
      return `${situations[0]}. `;
    } else {
      return `${situations.join(', and ')}. `;
    }
  }

  analyzeTone(userMessages) {
    const allText = userMessages.join(' ').toLowerCase();
    
    // Count positive vs negative indicators
    const positiveWords = ['good', 'great', 'better', 'happy', 'excited', 'thankful', 'grateful', 'hope', 'love'];
    const negativeWords = ['bad', 'terrible', 'worse', 'sad', 'angry', 'hate', 'worry', 'fear', 'problem'];
    const questionWords = ['what', 'how', 'why', 'should', 'can', 'could', 'would'];
    
    const positiveCount = positiveWords.filter(word => allText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => allText.includes(word)).length;
    const questionCount = questionWords.filter(word => allText.includes(word)).length;
    
    if (positiveCount > negativeCount && questionCount < 3) {
      return 'positive';
    } else if (negativeCount > positiveCount) {
      return 'challenging';
    } else if (questionCount >= 3) {
      return 'curious';
    } else {
      return 'reflective';
    }
  }

  createToneContext(tone) {
    switch (tone) {
      case 'positive':
        return 'The conversation left me feeling more positive and hopeful about things.';
      case 'challenging':
        return 'It was good to have someone listen while I worked through some challenging feelings.';
      case 'curious':
        return 'I had many questions and Deite helped me think through different perspectives.';
      case 'reflective':
        return 'It was a thoughtful conversation that gave me space to reflect on my experiences.';
      default:
        return 'The conversation was helpful and I felt heard.';
    }
  }

  async saveReflection(userId, dateId, reflection) {
    try {
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
