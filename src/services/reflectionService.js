import firestoreService from './firestoreService';
import { getDateId } from '../utils/dateUtils';

class ReflectionService {
  constructor() {
    this.greetings = ['hey', 'hi', 'hello', 'hii', 'hiii', 'hiiii', 'sup', 'yo', 'what\'s up', 'wassup'];
    this.researchKeywords = ['tell me about', 'what is', 'who is', 'where is', 'when did', 'how does', 'explain', 'define'];
  }

  isSimpleGreeting(message) {
    const cleanMsg = message.toLowerCase().trim();
    return this.greetings.some(greeting => 
      cleanMsg === greeting || 
      cleanMsg === greeting + '!' || 
      cleanMsg === greeting + '.'
    );
  }

  isResearchQuery(message) {
    const cleanMsg = message.toLowerCase();
    return this.researchKeywords.some(keyword => cleanMsg.includes(keyword));
  }

  extractMeaningfulContent(messages) {
    const userMessages = messages
      .filter(msg => msg.sender === 'user')
      .map(msg => msg.text.trim())
      .filter(text => {
        // Filter out simple greetings
        if (this.isSimpleGreeting(text)) return false;
        
        // Filter out very short messages (less than 3 words unless they're meaningful)
        const words = text.split(' ').filter(word => word.length > 0);
        if (words.length < 3 && !this.isMeaningfulShort(text)) return false;
        
        return true;
      });

    return userMessages;
  }

  isMeaningfulShort(text) {
    const meaningfulShortPhrases = [
      'i\'m sad', 'feeling down', 'i\'m anxious', 'stressed out', 
      'feeling lost', 'need help', 'i\'m worried', 'feeling better',
      'thank you', 'thanks', 'appreciate it', 'feeling good'
    ];
    
    const cleanText = text.toLowerCase();
    return meaningfulShortPhrases.some(phrase => cleanText.includes(phrase));
  }

  generateReflection(messages) {
    const meaningfulMessages = this.extractMeaningfulContent(messages);
    
    if (meaningfulMessages.length === 0) {
      return "Had a brief check-in today but didn't dive into anything significant.";
    }

    // Create a chronological summary of the conversation
    return this.createChronologicalSummary(messages, meaningfulMessages);
  }

  extractResearchTopic(message) {
    // Simple extraction - get the main subject after research keywords
    const cleanMsg = message.toLowerCase();
    
    for (const keyword of this.researchKeywords) {
      if (cleanMsg.includes(keyword)) {
        const afterKeyword = cleanMsg.split(keyword)[1];
        if (afterKeyword) {
          const topic = afterKeyword.trim().split(/[.!?]/)[0];
          return topic.substring(0, 50); // Limit length
        }
      }
    }
    
    return null;
  }

  createPersonalReflection(personalMessages) {
    const content = personalMessages.join(' ');
    const words = content.split(' ');
    
    // Create a natural reflection based on emotional keywords and themes
    const emotionalKeywords = {
      positive: ['happy', 'good', 'great', 'better', 'excited', 'grateful', 'thankful', 'proud', 'confident'],
      negative: ['sad', 'anxious', 'worried', 'stressed', 'tired', 'overwhelmed', 'frustrated', 'angry', 'upset'],
      neutral: ['thinking', 'wondering', 'considering', 'planning', 'working', 'trying', 'learning']
    };

    let tone = 'neutral';
    let emotionWords = [];

    for (const [category, keywords] of Object.entries(emotionalKeywords)) {
      const found = keywords.filter(keyword => content.toLowerCase().includes(keyword));
      if (found.length > 0) {
        tone = category;
        emotionWords = found;
        break;
      }
    }

    // Generate more detailed journal-like reflection based on content
    const themes = this.getDetailedThemes(content);
    const emotions = this.getEmotionalContext(content, emotionWords);
    
    // Create a multi-sentence journal entry
    let reflection = this.getOpeningSentence(themes, tone);
    
    // Add emotional context if present
    if (emotions) {
      reflection += ` ${emotions}`;
    }
    
    // Add theme-specific insights
    const themeInsights = this.getThemeInsights(content, themes);
    if (themeInsights) {
      reflection += ` ${themeInsights}`;
    }
    
    // Add a closing reflection
    const closing = this.getClosingSentence(tone, words.length);
    if (closing) {
      reflection += ` ${closing}`;
    }
    
    return reflection.trim();
  }

  getMainTheme(content) {
    const themes = {
      'feelings': ['feel', 'feeling', 'emotion', 'mood'],
      'work': ['work', 'job', 'career', 'office', 'boss', 'colleague'],
      'relationships': ['relationship', 'friend', 'family', 'partner', 'love'],
      'health': ['health', 'sick', 'tired', 'energy', 'sleep'],
      'future': ['future', 'plan', 'goal', 'dream', 'hope'],
      'personal growth': ['learn', 'grow', 'change', 'improve', 'better']
    };

    const cleanContent = content.toLowerCase();
    
    for (const [theme, keywords] of Object.entries(themes)) {
      if (keywords.some(keyword => cleanContent.includes(keyword))) {
        return theme;
      }
    }
    
    return 'personal matters';
  }

  getToneDescription(tone) {
    switch (tone) {
      case 'positive':
        return 'Feeling optimistic about things.';
      case 'negative':
        return 'Working through some challenges.';
      default:
        return 'Taking time to process and reflect.';
    }
  }

  getDetailedThemes(content) {
    const themes = {
      'work': ['work', 'job', 'career', 'office', 'boss', 'colleague', 'project', 'meeting', 'deadline'],
      'relationships': ['relationship', 'friend', 'family', 'partner', 'love', 'marriage', 'dating', 'parents'],
      'health': ['health', 'sick', 'tired', 'energy', 'sleep', 'exercise', 'diet', 'doctor'],
      'personal_growth': ['learn', 'grow', 'change', 'improve', 'better', 'goal', 'habit', 'meditation'],
      'stress_anxiety': ['stress', 'anxious', 'worried', 'overwhelmed', 'pressure', 'nervous'],
      'future_planning': ['future', 'plan', 'goal', 'dream', 'hope', 'want', 'wish', 'next'],
      'daily_life': ['today', 'morning', 'evening', 'routine', 'schedule', 'busy'],
      'emotions': ['feel', 'feeling', 'emotion', 'mood', 'happy', 'sad', 'angry', 'excited']
    };

    const cleanContent = content.toLowerCase();
    const foundThemes = [];
    
    for (const [theme, keywords] of Object.entries(themes)) {
      const matches = keywords.filter(keyword => cleanContent.includes(keyword));
      if (matches.length > 0) {
        foundThemes.push({ theme, matches, count: matches.length });
      }
    }
    
    // Sort by frequency of mentions
    foundThemes.sort((a, b) => b.count - a.count);
    return foundThemes;
  }

  getOpeningSentence(themes, tone) {
    if (themes.length === 0) {
      return "Today I took some time to connect with myself and share what was on my mind.";
    }

    const primaryTheme = themes[0].theme;
    
    const openings = {
      'work': [
        "Had a thoughtful conversation about my work situation and what's been going on professionally.",
        "Spent time reflecting on work-related matters and sharing some of the challenges I've been facing.",
        "Opened up about my work life and some of the things that have been on my mind at the office."
      ],
      'relationships': [
        "Shared some thoughts about my relationships and the people who matter to me.",
        "Had a meaningful discussion about my personal connections and relationship dynamics.",
        "Took time to talk through some relationship matters that have been weighing on me."
      ],
      'health': [
        "Discussed some health and wellness concerns that have been on my mind lately.",
        "Opened up about my physical and mental wellbeing and how I've been feeling.",
        "Had an honest conversation about my health and what I've been experiencing."
      ],
      'stress_anxiety': [
        "Talked through some of the stress and anxiety I've been carrying recently.",
        "Shared my feelings about the pressures and worries that have been affecting me.",
        "Had a conversation about managing stress and the anxious thoughts I've been having."
      ],
      'personal_growth': [
        "Reflected on my personal journey and the growth I'm working toward.",
        "Discussed my goals for self-improvement and the changes I want to make in my life.",
        "Shared thoughts about learning and developing myself as a person."
      ],
      'future_planning': [
        "Talked about my hopes and plans for the future and what I'm working toward.",
        "Shared my thoughts on upcoming goals and the direction I want my life to take.",
        "Discussed my dreams and aspirations for what's ahead."
      ],
      'emotions': [
        "Had an emotional conversation and really opened up about how I've been feeling.",
        "Shared some deep feelings and explored the emotions I've been processing.",
        "Took time to discuss my emotional state and what's been in my heart."
      ],
      'daily_life': [
        "Talked about my daily routine and the things that make up my everyday life.",
        "Shared thoughts about my day-to-day experiences and what's been happening.",
        "Discussed the regular aspects of my life and how things have been going."
      ]
    };

    const options = openings[primaryTheme] || [
      "Had a meaningful conversation about what's been on my mind recently.",
      "Took time to share my thoughts and feelings about various aspects of my life.",
      "Opened up about some personal matters that have been important to me."
    ];
    
    return options[Math.floor(Math.random() * options.length)];
  }

  getEmotionalContext(content, emotionWords) {
    if (emotionWords.length === 0) return null;
    
    const contexts = [
      `I've been feeling quite ${emotionWords[0]} and it was helpful to talk through these emotions.`,
      `There's been a ${emotionWords[0]} undertone to how I've been experiencing things lately.`,
      `I noticed I'm feeling ${emotionWords[0]} about several aspects of my life right now.`
    ];
    
    return contexts[Math.floor(Math.random() * contexts.length)];
  }

  getThemeInsights(content, themes) {
    if (themes.length === 0) return null;
    
    const insights = [];
    const cleanContent = content.toLowerCase();
    
    // Add specific insights based on detected themes
    if (themes.some(t => t.theme === 'work')) {
      if (cleanContent.includes('challenge') || cleanContent.includes('difficult')) {
        insights.push("Work has been presenting some challenges that I'm navigating through.");
      } else if (cleanContent.includes('good') || cleanContent.includes('well')) {
        insights.push("Things at work seem to be going relatively well.");
      }
    }
    
    if (themes.some(t => t.theme === 'relationships')) {
      if (cleanContent.includes('problem') || cleanContent.includes('issue')) {
        insights.push("There are some relationship dynamics I'm working to understand better.");
      } else {
        insights.push("My relationships continue to be an important part of my life.");
      }
    }
    
    if (themes.some(t => t.theme === 'stress_anxiety')) {
      insights.push("I'm learning to recognize and address the stress patterns in my life.");
    }
    
    if (themes.some(t => t.theme === 'personal_growth')) {
      insights.push("I'm committed to continuing my personal development journey.");
    }
    
    if (insights.length > 0) {
      return insights[Math.floor(Math.random() * insights.length)];
    }
    
    return null;
  }

  getClosingSentence(tone, wordCount) {
    const closings = {
      'positive': [
        "Overall, I'm feeling hopeful and looking forward to what comes next.",
        "I'm grateful for the opportunity to process these thoughts and feel more positive about things.",
        "There's a sense of optimism in how I'm approaching these matters."
      ],
      'negative': [
        "While things feel challenging right now, I'm taking it one step at a time.",
        "It's been tough, but talking through these feelings helps me process them better.",
        "I'm working through these difficulties and trying to be patient with myself."
      ],
      'neutral': [
        "I'm taking time to sit with these thoughts and see how things develop.",
        "It feels good to have expressed these thoughts and given them some attention.",
        "I'm continuing to reflect on these matters as I move forward."
      ]
    };
    
    // For longer conversations, add more substantive closings
    if (wordCount > 100) {
      const substantiveClosings = [
        "This conversation has helped me gain some clarity on what I'm experiencing and how I want to move forward.",
        "I appreciate having the space to work through these thoughts and feelings in a meaningful way.",
        "Taking time for this kind of reflection feels important for my overall well-being and growth."
      ];
      
      const allClosings = [...(closings[tone] || closings['neutral']), ...substantiveClosings];
      return allClosings[Math.floor(Math.random() * allClosings.length)];
    }
    
    const options = closings[tone] || closings['neutral'];
    return options[Math.floor(Math.random() * options.length)];
  }

  createChronologicalSummary(allMessages, meaningfulMessages) {
    if (meaningfulMessages.length === 0) {
      return "Had a brief check-in today but didn't dive into anything significant.";
    }

    // Get user messages with their sequence and content
    const userMessages = allMessages
      .filter(msg => msg.sender === 'user')
      .map(msg => msg.text.trim())
      .filter(text => !this.isSimpleGreeting(text) && text.length > 3);

    if (userMessages.length === 0) {
      return "Had a brief check-in today but didn't dive into anything significant.";
    }

    // Create a flowing summary of what was discussed
    let summary = this.createFlowingSummary(userMessages);
    
    return summary;
  }

  createFlowingSummary(userMessages) {
    const conversationFlow = [];
    
    for (let i = 0; i < userMessages.length; i++) {
      const message = userMessages[i];
      const messageType = this.categorizeMessage(message);
      const content = this.extractKeyContent(message);
      
      if (content) {
        conversationFlow.push({
          type: messageType,
          content: content,
          original: message,
          position: i === 0 ? 'first' : i === userMessages.length - 1 ? 'last' : 'middle'
        });
      }
    }

    // Build natural summary
    return this.buildNaturalSummary(conversationFlow);
  }

  categorizeMessage(message) {
    const lower = message.toLowerCase();
    
    if (this.isResearchQuery(message)) return 'question';
    if (lower.includes('feel') || lower.includes('feeling')) return 'emotion';
    if (lower.includes('work') || lower.includes('job')) return 'work';
    if (lower.includes('stress') || lower.includes('anxious') || lower.includes('worried')) return 'stress';
    if (lower.includes('relationship') || lower.includes('family') || lower.includes('friend')) return 'relationship';
    if (lower.includes('help') || lower.includes('advice')) return 'seeking_help';
    if (lower.includes('thank') || lower.includes('appreciate')) return 'gratitude';
    if (lower.includes('better') || lower.includes('good') || lower.includes('improve')) return 'positive';
    
    return 'general';
  }

  extractKeyContent(message) {
    // Remove filler words and extract the essence
    const cleanMessage = message
      .replace(/^(well|so|um|like|you know|i mean|basically)\s+/i, '')
      .replace(/\s+(you know|like|um|well)\s+/gi, ' ')
      .trim();

    if (cleanMessage.length < 10) return null;
    
    // Simplify and extract key points
    return cleanMessage;
  }

  buildNaturalSummary(conversationFlow) {
    if (conversationFlow.length === 0) {
      return "Had a brief check-in today but didn't dive into anything significant.";
    }

    let summary = '';
    
    // Start with what initiated the conversation
    const first = conversationFlow[0];
    if (first.type === 'emotion') {
      summary += "Started by sharing how I've been feeling. ";
    } else if (first.type === 'work') {
      summary += "Talked about what's been happening at work. ";
    } else if (first.type === 'stress') {
      summary += "Opened up about some stress and anxiety I've been experiencing. ";
    } else if (first.type === 'question') {
      summary += "Asked some questions about things I wanted to understand better. ";
    } else {
      summary += "Shared what's been on my mind lately. ";
    }

    // Add the main topics discussed
    const mainTopics = this.identifyMainTopics(conversationFlow);
    if (mainTopics.length > 0) {
      summary += this.describeTopics(mainTopics) + " ";
    }

    // Add how the conversation progressed
    if (conversationFlow.length > 2) {
      const progression = this.describeProgression(conversationFlow);
      if (progression) {
        summary += progression + " ";
      }
    }

    // End with the overall outcome
    const last = conversationFlow[conversationFlow.length - 1];
    const outcome = this.describeOutcome(last, conversationFlow);
    if (outcome) {
      summary += outcome;
    }

    return summary.trim();
  }

  identifyMainTopics(conversationFlow) {
    const topics = {};
    
    conversationFlow.forEach(item => {
      if (topics[item.type]) {
        topics[item.type]++;
      } else {
        topics[item.type] = 1;
      }
    });

    // Return topics sorted by frequency
    return Object.entries(topics)
      .filter(([type, count]) => type !== 'general' && count > 0)
      .sort(([,a], [,b]) => b - a)
      .map(([type]) => type);
  }

  describeTopics(mainTopics) {
    const topicDescriptions = {
      'emotion': 'Went deep into my emotions and feelings',
      'work': 'Discussed work situations and professional challenges',
      'stress': 'Talked through stress and anxiety',
      'relationship': 'Shared about relationships and personal connections',
      'question': 'Explored some topics I was curious about',
      'seeking_help': 'Asked for guidance and advice',
      'positive': 'Focused on positive aspects and improvements'
    };

    if (mainTopics.length === 1) {
      return topicDescriptions[mainTopics[0]] || 'talked about various things';
    } else if (mainTopics.length === 2) {
      const first = topicDescriptions[mainTopics[0]] || 'discussed some topics';
      const second = topicDescriptions[mainTopics[1]] || 'other matters';
      return `${first}, then moved into ${second}`;
    } else {
      return 'covered several different topics including emotions, practical matters, and personal reflections';
    }
  }

  describeProgression(conversationFlow) {
    const hasEmotion = conversationFlow.some(item => item.type === 'emotion');
    const hasStress = conversationFlow.some(item => item.type === 'stress');
    const hasPositive = conversationFlow.some(item => item.type === 'positive');
    const hasQuestions = conversationFlow.some(item => item.type === 'question');

    if (hasStress && hasPositive) {
      return "The conversation helped me work through some difficulties and find a more positive perspective.";
    } else if (hasEmotion && hasQuestions) {
      return "I was able to explore both my feelings and get some clarity on things I was wondering about.";
    } else if (conversationFlow.length > 3) {
      return "We covered quite a bit of ground and I felt heard throughout the conversation.";
    }

    return null;
  }

  describeOutcome(lastItem, allItems) {
    const hasGratitude = allItems.some(item => item.type === 'gratitude');
    const hasPositive = allItems.some(item => item.type === 'positive');
    const hasStress = allItems.some(item => item.type === 'stress');

    if (hasGratitude) {
      return "I felt grateful for the conversation and the space to process these thoughts.";
    } else if (hasPositive) {
      return "I'm feeling more optimistic after talking things through.";
    } else if (hasStress) {
      return "While some challenges remain, it helped to express these concerns.";
    } else {
      return "It was good to have this conversation and reflect on these matters.";
    }
  }

  createResearchReflection(topics) {
    if (topics.length === 1) {
      return `Showed interest in learning about ${topics[0]}.`;
    } else {
      return `Explored a few different topics including ${topics[0]} and others.`;
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

  /**
   * Analyze reflection content to extract mood and insights
   */
  analyzeReflection(reflection) {
    const lowerReflection = reflection.toLowerCase();
    
    // Simple mood analysis based on keywords
    const moodKeywords = {
      'Happy': ['happy', 'joy', 'excited', 'great', 'amazing', 'wonderful', 'fantastic', 'good', 'positive', 'optimistic'],
      'Sad': ['sad', 'depressed', 'down', 'upset', 'hurt', 'disappointed', 'gloomy', 'blue', 'melancholy'],
      'Anxious': ['anxious', 'worried', 'nervous', 'stressed', 'overwhelmed', 'panic', 'fear', 'concerned'],
      'Angry': ['angry', 'frustrated', 'irritated', 'mad', 'furious', 'annoyed', 'rage'],
      'Peaceful': ['calm', 'peaceful', 'relaxed', 'serene', 'tranquil', 'content', 'balanced'],
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

    // Calculate score (0-100) based on mood and content positivity
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

    // Extract simple insights (key phrases)
    const insights = [];
    if (lowerReflection.includes('work')) insights.push('Work-related discussion');
    if (lowerReflection.includes('relationship') || lowerReflection.includes('family')) insights.push('Relationship focus');
    if (lowerReflection.includes('health') || lowerReflection.includes('sleep')) insights.push('Health consideration');
    if (lowerReflection.includes('future') || lowerReflection.includes('plan')) insights.push('Future planning');
    if (lowerReflection.includes('learn') || lowerReflection.includes('growth')) insights.push('Personal growth');

    return {
      mood: detectedMood,
      score: Math.round(score),
      insights: insights.length > 0 ? insights : ['General reflection']
    };
  }
}

export default new ReflectionService();
