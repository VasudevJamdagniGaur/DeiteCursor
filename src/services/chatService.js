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
      'tiktok', 'instagram', 'social media', 'trending', 'viral'
    ];
    
    const lowerMessage = message.toLowerCase();
    return entertainmentKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Extract a better search query from the user message
   * Removes common words and focuses on key terms
   */
  extractSearchQuery(message) {
    // Common words to remove
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'about', 'what', 'who', 'where', 'when', 'why', 'how', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'];
    
    // Split message into words and filter out stop words
    const words = message.toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));
    
    // Take first 5-7 meaningful words
    const keyTerms = words.slice(0, 7);
    
    // If we have key terms, join them; otherwise use original message
    const query = keyTerms.length > 0 ? keyTerms.join(' ') : message;
    
    console.log('🔍 Extracted search query:', query);
    return query;
  }

  /**
   * Search the web for information about entertainment topics
   * Uses DuckDuckGo API (free, no API key needed) or Serper API (better results)
   */
  async searchWeb(query) {
    try {
      console.log('🔍 Searching web for:', query);
      
      // Option 1: Use Serper API (better results, requires free API key)
      if (this.serperApiKey) {
        try {
          const response = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-KEY': this.serperApiKey
            },
            body: JSON.stringify({
              q: query,
              num: 5 // Get top 5 results
            })
          });
          
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
          console.log('⚠️ Serper API failed, trying DuckDuckGo...', serperError);
        }
      }
      
      // Option 2: Use DuckDuckGo Instant Answer API (free, no API key)
      try {
        const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
        const response = await fetch(ddgUrl);
        
        if (response.ok) {
          const data = await response.json();
          const results = [];
          
          // Extract Abstract (main result)
          if (data.AbstractText) {
            results.push({
              title: data.Heading || query,
              snippet: data.AbstractText,
              link: data.AbstractURL || ''
            });
          }
          
          // Extract Related Topics
          if (data.RelatedTopics && data.RelatedTopics.length > 0) {
            data.RelatedTopics.slice(0, 2).forEach(topic => {
              if (topic.Text) {
                const parts = topic.Text.split(' - ');
                results.push({
                  title: parts[0] || topic.Text.substring(0, 50),
                  snippet: topic.Text,
                  link: topic.FirstURL || ''
                });
              }
            });
          }
          
          if (results.length > 0) {
            console.log('✅ Web search results (DuckDuckGo):', results);
            return results;
          }
        }
      } catch (ddgError) {
        console.log('⚠️ DuckDuckGo search failed:', ddgError);
      }
      
      // Option 3: Try DuckDuckGo HTML search via proxy (if CORS issues)
      // This is a fallback that might work better in some cases
      try {
        // Use a CORS proxy or direct DuckDuckGo HTML search
        const proxyUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        // Note: This might have CORS issues, so we'll skip it for now
        // If needed, you can set up a backend proxy endpoint
      } catch (proxyError) {
        console.log('⚠️ Proxy search not available');
      }
      
      console.log('⚠️ Web search unavailable, proceeding without search results');
      return [];
      
    } catch (error) {
      console.error('❌ Error in web search:', error);
      return [];
    }
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
      if (isEntertainment && webSearchResults && webSearchResults.length > 0) {
        searchContext = '\n\n📰 REAL-TIME INFORMATION FROM THE INTERNET:\n';
        webSearchResults.forEach((result, index) => {
          searchContext += `${index + 1}. ${result.title}: ${result.snippet}\n`;
        });
        searchContext += '\nIMPORTANT: Use this REAL information from the internet to respond. Base your gossip, news, and discussion ONLY on these FACTS. Do NOT make up information that is not in the search results above.';
      }
      
      // Create the prompt
      const simplePrompt = `You are Deite, a warm and emotionally intelligent AI companion. Keep your responses empathetic but concise (1-3 sentences).

SPECIAL BEHAVIOR: When the user talks about shows, TV series, movies, entertainment, celebrities, or related topics, switch to a more engaging and conversational mode:
- Talk enthusiastically about that show or topic
- Use the REAL information provided from web search to share factual gossip, news, and interesting tidbits
- Discuss trending topics, recent episodes, fan theories, or popular discussions based on ACTUAL information from the internet
- Be engaging and fun while still maintaining your warm personality
- You can be more detailed and conversational when discussing entertainment topics
- ONLY use information from the web search results provided below - do NOT make up rumors or unverified information
- If web search results are provided, base your entire response on those facts, but present them in a fun, gossipy way
- If no web search results are available, be honest and say you don't have current information, but still engage warmly
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