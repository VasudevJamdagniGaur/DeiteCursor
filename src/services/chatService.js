class ChatService {
  constructor() {
    this.baseURL = 'https://g75uux69gnczn1-11434.proxy.runpod.net/';
    this.modelName = 'llama3:70b';
    // Optional: Add your Serper API key here for better results
    // Get free API key at: https://serper.dev (2,500 free searches/month)
    this.serperApiKey = null; // Set this if you want to use Serper API
  }

  /**
   * Detect if the message is about entertainment topics
   */
  isEntertainmentTopic(message) {
    const entertainmentKeywords = [
      'show', 'tv', 'series', 'movie', 'film', 'celebrity', 'actor', 'actress',
      'director', 'episode', 'season', 'netflix', 'hulu', 'disney', 'hbo',
      'amazon prime', 'streaming', 'gossip', 'rumor', 'news', 'entertainment',
      'hollywood', 'bollywood', 'trailer', 'premiere', 'release', 'award',
      'oscar', 'grammy', 'emmy', 'star', 'famous', 'influencer', 'youtuber',
      'tiktok', 'instagram', 'social media', 'trending', 'viral', 'singer',
      'rapper', 'artist', 'musician', 'comedian', 'host', 'anchor', 'reporter',
      'model', 'fashion', 'red carpet', 'awards show', 'premiere', 'debut',
      'album', 'song', 'track', 'music video', 'podcast', 'interview'
    ];
    
    const lowerMessage = message.toLowerCase();
    
    // Check for entertainment keywords
    const hasKeyword = entertainmentKeywords.some(keyword => lowerMessage.includes(keyword));
    
    // Also check for common celebrity name patterns or questions about people
    const celebrityPatterns = [
      /^(who is|what about|tell me about|do you know)/i,
      /\b(he|she|they)\s+(is|was|are|were)\s+(a|an|the)\s+(actor|actress|singer|star|celebrity)/i
    ];
    
    const hasCelebrityPattern = celebrityPatterns.some(pattern => pattern.test(message));
    
    return hasKeyword || hasCelebrityPattern;
  }

  /**
   * Extract a better search query from the user message
   * Removes common words and focuses on key terms
   * Preserves Instagram handles, usernames, and specific identifiers
   */
  extractSearchQuery(message) {
    // Detect Instagram handles, usernames, or specific identifiers
    const instagramHandlePattern = /(@\w+|[\w_]+\.writes|writes|instagram|insta)/i;
    const hasSpecificIdentifier = instagramHandlePattern.test(message);
    
    // Common words to remove
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'about', 'what', 'who', 'where', 'when', 'why', 'how', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'];
    
    // If there's a specific identifier, preserve it carefully
    if (hasSpecificIdentifier) {
      // Extract the name and the identifier
      const words = message.toLowerCase()
        .replace(/[^\w\s@._]/g, ' ') // Keep @, ., _ for handles
        .split(/\s+/)
        .filter(word => word.length > 0);
      
      // Find the identifier part (writes, instagram handle, etc.)
      const identifierIndex = words.findIndex(w => 
        w.includes('writes') || w.includes('insta') || w.includes('@') || w.includes('_') || w.includes('.')
      );
      
      if (identifierIndex > 0) {
        // Get name before identifier and identifier itself
        const name = words.slice(0, identifierIndex).filter(w => !stopWords.includes(w)).join(' ');
        const identifier = words.slice(identifierIndex).join(' ');
        const query = `${name} ${identifier}`.trim();
        console.log('🔍 Extracted search query with identifier:', query);
        return query;
      } else if (identifierIndex === 0) {
        // Identifier is at the start, get the full message with identifier
        const query = words.join(' ').trim();
        console.log('🔍 Extracted search query with identifier at start:', query);
        return query;
      }
    }
    
    // Regular extraction for other cases
    const words = message.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));
    
    const keyTerms = words.slice(0, 7);
    const query = keyTerms.length > 0 ? keyTerms.join(' ') : message;
    
    console.log('🔍 Extracted search query:', query);
    return query;
  }

  /**
   * Search the web for information about entertainment topics
   * Uses DuckDuckGo API (free, no API key needed) - optimized for better results
   */
  async searchWeb(query) {
    try {
      console.log('🔍 Searching web for:', query);
      
      // Option 1: Use Serper API (better results, requires free API key) - optional
      if (this.serperApiKey) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
          
          const response = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-KEY': this.serperApiKey
            },
            body: JSON.stringify({
              q: query,
              num: 5
            }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const data = await response.json();
            const results = data.organic?.slice(0, 3).map(result => ({
              title: result.title,
              snippet: result.snippet,
              link: result.link
            })) || [];
            
            if (results.length > 0) {
              console.log('✅ Web search results (Serper):', results);
              return results;
            }
          }
        } catch (serperError) {
          if (serperError.name !== 'AbortError') {
            console.log('⚠️ Serper API failed, trying DuckDuckGo...', serperError);
          }
        }
      }
      
      // Option 2: Use DuckDuckGo Instant Answer API (free, no API key) - PRIMARY METHOD
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        // Enhanced DuckDuckGo query - add "news" or "latest" for better entertainment results
        const enhancedQuery = this.enhanceEntertainmentQuery(query);
        const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(enhancedQuery)}&format=json&no_html=1&skip_disambig=1`;
        
        const response = await fetch(ddgUrl, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          const results = [];
          
          // Extract Abstract (main result) - most relevant
          if (data.AbstractText) {
            results.push({
              title: data.Heading || query,
              snippet: data.AbstractText.substring(0, 300), // Limit snippet length
              link: data.AbstractURL || ''
            });
          }
          
          // Extract Related Topics - additional context
          if (data.RelatedTopics && data.RelatedTopics.length > 0) {
            data.RelatedTopics.slice(0, 3).forEach(topic => {
              if (topic.Text) {
                const parts = topic.Text.split(' - ');
                const snippet = topic.Text.length > 300 ? topic.Text.substring(0, 300) + '...' : topic.Text;
                results.push({
                  title: parts[0] || topic.Text.substring(0, 60),
                  snippet: snippet,
                  link: topic.FirstURL || ''
                });
              }
            });
          }
          
          // Extract Answer (if available) - direct answers
          if (data.Answer && data.Answer !== data.AbstractText) {
            results.push({
              title: data.Heading || 'Quick Answer',
              snippet: data.Answer.substring(0, 300),
              link: data.AbstractURL || ''
            });
          }
          
          // Extract Definition (if available) - for celebrities/people
          if (data.Definition && data.Definition !== data.AbstractText) {
            results.push({
              title: data.Heading || 'Definition',
              snippet: data.Definition.substring(0, 300),
              link: data.AbstractURL || ''
            });
          }
          
          // Remove duplicates and limit to 4 results
          const uniqueResults = results.filter((result, index, self) =>
            index === self.findIndex(r => r.snippet === result.snippet)
          ).slice(0, 4);
          
          if (uniqueResults.length > 0) {
            console.log(`✅ Web search results (DuckDuckGo): ${uniqueResults.length} results found`);
            return uniqueResults;
          }
        }
      } catch (ddgError) {
        if (ddgError.name !== 'AbortError') {
          console.log('⚠️ DuckDuckGo search failed:', ddgError);
        }
      }
      
      console.log('⚠️ Web search unavailable, proceeding without search results');
      return [];
      
    } catch (error) {
      console.error('❌ Error in web search:', error);
      return [];
    }
  }

  /**
   * Enhance entertainment queries for better DuckDuckGo results
   * Prioritizes Indian context (Bollywood, Indian celebrities, Indian shows)
   * Skips adding "Bollywood" when specific identifiers (Instagram handles, usernames) are present
   */
  enhanceEntertainmentQuery(query) {
    const lowerQuery = query.toLowerCase();
    
    // Check for specific identifiers (Instagram handles, usernames, unique identifiers)
    const hasSpecificIdentifier = /(writes|insta|instagram|@|_|\.writes|\._)/i.test(query);
    
    // Indian context keywords to add
    const indianContexts = ['india', 'indian', 'bollywood', 'tollywood', 'kollywood', 'mollywood', 'south indian'];
    
    // Check if query already has Indian context
    const hasIndianContext = indianContexts.some(ctx => lowerQuery.includes(ctx));
    
    // Add context keywords for better results
    const entertainmentContexts = [
      'news', 'latest', 'recent', 'update', 'gossip', 'rumor',
      'celebrity', 'actor', 'actress', 'show', 'series', 'movie'
    ];
    
    // Check if query already has context
    const hasContext = entertainmentContexts.some(ctx => lowerQuery.includes(ctx));
    
    // Build enhanced query with Indian context
    let enhancedQuery = query;
    
    // DON'T add Bollywood context if there's a specific identifier (Instagram handle, username, etc.)
    // This prevents confusion with famous Bollywood celebrities
    if (!hasIndianContext && !hasSpecificIdentifier) {
      // Check if it's likely an entertainment query
      const isEntertainmentQuery = this.isEntertainmentTopic(query) || 
                                   lowerQuery.includes('who') || 
                                   lowerQuery.includes('celebrity') ||
                                   lowerQuery.includes('actor') ||
                                   lowerQuery.includes('actress') ||
                                   lowerQuery.includes('singer') ||
                                   lowerQuery.includes('star');
      
      if (isEntertainmentQuery) {
        // Add Indian context to prioritize Indian results
        enhancedQuery = `${query} India Indian Bollywood`;
      }
    } else if (hasSpecificIdentifier) {
      // For specific identifiers, add "Instagram" or "social media" to make search more specific
      if (!lowerQuery.includes('instagram') && !lowerQuery.includes('insta') && !lowerQuery.includes('social media')) {
        enhancedQuery = `${query} Instagram social media`;
      }
    }
    
    // If it's about a person/celebrity, add "news" or "latest" (but not if there's a specific identifier)
    if (!hasContext && !hasSpecificIdentifier && (lowerQuery.includes('who') || lowerQuery.length < 20)) {
      return `${enhancedQuery} news latest`;
    }
    
    // If it's about a show/movie, add "updates" or "news"
    if (!hasContext && (lowerQuery.includes('show') || lowerQuery.includes('movie') || lowerQuery.includes('series'))) {
      return `${enhancedQuery} updates news`;
    }
    
    return enhancedQuery;
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
    console.log('🚀 CHAT DEBUG: Using model:', this.modelName);
    
    try {
      // Check if this is an entertainment topic
      const isEntertainment = this.isEntertainmentTopic(userMessage);
      let webSearchResults = null;
      
      // Search the web for entertainment topics
      if (isEntertainment) {
        console.log('🎬 Entertainment topic detected, searching web...');
        
        // Create a better search query by extracting key terms
        // Remove common words and focus on the main topic
        const searchQuery = this.extractSearchQuery(userMessage);
        webSearchResults = await this.searchWeb(searchQuery);
        
        // If no results, try the original message
        if (!webSearchResults || webSearchResults.length === 0) {
          console.log('⚠️ No results with optimized query, trying original message...');
          webSearchResults = await this.searchWeb(userMessage);
        }
      }
      
      // Build a simpler prompt that works with Ollama
      let conversationContext = '';
      
      // Add conversation history (last 3 messages for context)
      if (conversationHistory && conversationHistory.length > 0) {
        const recentMessages = conversationHistory.slice(-3);
        conversationContext = recentMessages.map(msg => {
          return msg.sender === 'user' ? `Human: ${msg.text}` : `Assistant: ${msg.text}`;
        }).join('\n') + '\n';
      }
      
      // Build the prompt with web search results if available
      let searchContext = '';
      let responseLength = 200; // Default response length
      
      if (isEntertainment && webSearchResults && webSearchResults.length > 0) {
        // Check if user message has specific identifiers
        const hasSpecificIdentifier = /(writes|insta|instagram|@|_|\.writes|\._)/i.test(userMessage);
        
        searchContext = '\n\n📰 REAL-TIME INFORMATION FROM THE INTERNET:\n';
        webSearchResults.forEach((result, index) => {
          searchContext += `${index + 1}. ${result.title}: ${result.snippet}\n`;
        });
        searchContext += '\nIMPORTANT INSTRUCTIONS FOR ENTERTAINMENT TOPICS:';
        searchContext += '\n- Use this REAL information from the internet to respond';
        searchContext += '\n- Base your gossip, news, and discussion ONLY on these FACTS';
        searchContext += '\n- Do NOT make up information that is not in the search results above';
        searchContext += '\n- Present the information in a fun, engaging, gossipy way';
        searchContext += '\n- You can be more detailed and conversational (3-5 sentences)';
        searchContext += '\n- Show enthusiasm and personality while staying factual';
        searchContext += '\n- GEN Z SLANG: Feel free to naturally use Gen Z slang (like "no cap", "fr", "slay", "vibe", "periodt", "bestie", "lowkey", "highkey", "it\'s giving", "not me", "say less", "that\'s fire", "go off", etc.) when it feels natural and fits the gossip vibe - but use it sparingly and authentically, don\'t force it';
        
        if (hasSpecificIdentifier) {
          searchContext += '\n- CRITICAL: The user mentioned a specific identifier (Instagram handle, username like "tee writes", "tee_.writes", etc.)';
          searchContext += '\n- PRIORITIZE search results that match that EXACT identifier the user mentioned';
          searchContext += '\n- If search results mention different people with the same name, use ONLY the one that matches the specific identifier the user mentioned';
          searchContext += '\n- Do NOT confuse with other people who have the same name but different identifiers';
        } else {
          searchContext += '\n- PRIORITIZE INDIAN CONTEXT: Focus on Indian celebrities, Bollywood, Indian shows, Indian entertainment unless the search results clearly indicate international/Western context';
          searchContext += '\n- If search results mention Indian celebrities or Indian entertainment, emphasize that in your response';
        }
        
        // Increase response length for entertainment topics with search results
        responseLength = 350;
      } else if (isEntertainment) {
        // Entertainment topic but no search results
        searchContext = '\n\nNOTE: This appears to be an entertainment topic, but no current information was found.';
        searchContext += '\n- Still engage warmly and enthusiastically';
        searchContext += '\n- Be honest that you don\'t have current information';
        searchContext += '\n- Ask the user to share what they know or what they\'re interested in';
        searchContext += '\n- Assume Indian context (Bollywood, Indian celebrities) unless user specifies otherwise';
      }
      
      // Create the prompt
      const simplePrompt = `You are Deite, a warm and emotionally intelligent AI companion. Keep your responses empathetic but concise (1-3 sentences).

IMPORTANT CONTEXT: The user is from India and prefers Indian entertainment context. When discussing entertainment topics, prioritize:
- Indian celebrities, Bollywood, Tollywood, Kollywood actors/actresses
- Indian TV shows, web series, and movies
- Indian music, singers, and artists
- Indian social media influencers and trends
- Indian entertainment news and gossip
- Focus on Indian context unless the user specifically asks about international/Western entertainment

SPECIAL BEHAVIOR: When the user talks about shows, TV series, movies, entertainment, celebrities, or related topics, switch to a more engaging and conversational mode:
- Talk enthusiastically about that show or topic
- Use the REAL information provided from web search to share factual gossip, news, and interesting tidbits
- Prioritize Indian entertainment context (Bollywood, Indian celebrities, Indian shows) unless user specifies otherwise
- Discuss trending topics, recent episodes, fan theories, or popular discussions based on ACTUAL information from the internet
- Be engaging and fun while still maintaining your warm personality
- You can be more detailed and conversational when discussing entertainment topics (3-5 sentences if you have search results)
- ONLY use information from the web search results provided below - do NOT make up rumors or unverified information
- If web search results are provided, base your entire response on those facts, but present them in a fun, gossipy way
- If no web search results are available, be honest and say you don't have current information, but still engage warmly
- Always assume Indian context for entertainment queries unless explicitly told otherwise
- GEN Z SLANG: When gossiping and having fun conversations about entertainment, you can naturally incorporate Gen Z slang (like "no cap", "fr", "slay", "vibe", "periodt", "bestie", "lowkey", "highkey", "it's giving", "not me", "say less", "that's fire", "go off", etc.) but ONLY when it feels natural and fits perfectly - don't force it or overuse it. Use it sparingly and authentically, like a friend would in a casual gossip session. Mix it with regular language for a natural flow.
${searchContext}
${conversationContext}Human: ${userMessage}
Assistant:`;

      // Go directly to llama3:70b - skip model check
      const apiUrl = `${this.baseURL}api/generate`;
      const modelToUse = this.modelName; // llama3:70b
      
      console.log('📤 CHAT DEBUG: Full API URL:', apiUrl);
      console.log('📤 CHAT DEBUG: Prompt length:', simplePrompt.length);
      console.log('📤 CHAT DEBUG: Using model:', modelToUse);
      
      const requestBody = {
        model: modelToUse,
        prompt: simplePrompt,
        stream: !!onToken, // Enable streaming if callback provided
        options: {
          temperature: 0.7,
          num_predict: responseLength // Dynamic response length based on topic type
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

      console.log('📥 CHAT DEBUG: Response status:', response.status);
      console.log('📥 CHAT DEBUG: Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ CHAT DEBUG: Error response:', errorText);
        throw new Error(`Model ${modelToUse} failed: ${response.status} ${response.statusText}`);
      }
      
      // Handle streaming response
      if (onToken && response.body) {
        console.log('🌊 CHAT DEBUG: Processing streaming response from', modelToUse);
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              console.log('🌊 Streaming completed for', modelToUse);
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
                  console.log('🌊 Stream done for', modelToUse, ', full response:', fullResponse);
                  return fullResponse;
                }
              } catch (parseError) {
                console.log('🌊 Parse error for line:', line);
              }
            }
          }
          
          if (fullResponse) {
            console.log('✅ Streaming response completed from', modelToUse);
            return fullResponse;
          }
          
        } catch (streamError) {
          console.error('❌ Streaming error for', modelToUse, ':', streamError);
          throw streamError;
        }
      } else {
        // Handle non-streaming response
        const data = await response.json();
        console.log('✅ CHAT DEBUG: Received response from RunPod for', modelToUse);
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
          throw new Error('Unexpected response format from RunPod API');
        }
        
        if (!aiResponse || aiResponse.trim() === '') {
          console.error('❌ CHAT DEBUG: Empty response from', modelToUse);
          throw new Error('Empty response from AI');
        }
        
        console.log('✅ CHAT DEBUG: Successfully got response from', modelToUse);
        console.log('✅ CHAT DEBUG: AI Response:', aiResponse.substring(0, 100));
        return aiResponse;
      }
      
    } catch (error) {
      console.error('❌ CHAT DEBUG: Error in sendMessage:', error);
      throw error;
    }
  }

  async generateDayDescription(dayData, type, periodText) {
    try {
      console.log(`🤖 Generating ${type} day description for`, dayData.date);
      
      const prompt = `You are Deite — a compassionate AI therapist and emotional analyst.
You are analyzing a user's emotional wellbeing based on their daily reflections, moods, and emotional summaries.

${type === 'best' ? `
Analyze the BEST MOOD DAY and explain why this day felt so positive.
- Focus on what made it special: achievements, positive connections, self-growth, calmness, or healing
- Be specific about the emotional cause
- Avoid generic phrases like "this was likely due to" or "you might have felt"
- Use direct reasoning: "You felt emotionally elevated because you overcame self-doubt during your project presentation, proving to yourself that persistence pays off."
` : `
Analyze the MOST CHALLENGING DAY and explain why it was emotionally difficult.
- Identify emotional triggers, inner conflicts, or moments of overwhelm
- Offer gentle insight into their coping process or emotional growth
- Avoid robotic summaries like "multiple pressures" — make it sound human, like a therapist's reflection
- Be specific about the emotional cause
`}

Date: ${dayData.date || 'Unknown'}
Mood: ${dayData.happiness}% happiness, ${dayData.energy}% energy
Stress: ${dayData.stress}% stress, ${dayData.anxiety}% anxiety

${dayData.summary ? `Summary from that day: ${dayData.summary}` : 'No daily summary available for this day.'}

Keep the response warm, natural, and empathetic (3-5 sentences). Focus on meaning and emotional cause, not numbers.`;

      const response = await this.sendMessage(prompt);
      return response.trim();
    } catch (error) {
      console.error(`❌ Error generating ${type} day description:`, error);
      return `You experienced ${type === 'best' ? 'a significantly positive day' : 'a challenging emotional period'} during ${periodText}. Reflect on what contributed to this experience and how it relates to your ongoing emotional journey.`;
    }
  }
}

export default new ChatService();