import { getCurrentUser } from './authService';
import firestoreService from './firestoreService';
import { getDateId } from '../utils/dateUtils';

class ChatService {
  constructor() {
    this.baseURL = 'https://uklqo1rhs5bebp-11434.proxy.runpod.net/';
    this.modelName = 'llama3:70b';
    this.visionModelName = 'llama3.2-vision:11b';
    // Optional: Add your Serper API key here for better results
    // Get free API key at: https://serper.dev (2,500 free searches/month)
    this.serperApiKey = null; // Set this if you want to use Serper API
  }

  /**
   * Detect if message contains URLs/links
   */
  hasUrl(message) {
    const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/i;
    return urlPattern.test(message);
  }

  /**
   * Extract URLs from message
   */
  extractUrls(message) {
    const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/gi;
    return message.match(urlPattern) || [];
  }

  /**
   * Convert image file to base64
   */
  async imageToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Ollama expects just the base64 string without the data URL prefix
        const result = reader.result;
        if (result.includes(',')) {
          const base64 = result.split(',')[1];
          resolve(base64);
        } else {
          resolve(result);
        }
      };
      reader.onerror = (error) => {
        console.error('❌ FileReader error:', error);
        reject(error);
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Fetch metadata from a URL (for Instagram Reels, memes, etc.)
   * Extracts title, description, and image from Open Graph tags
   */
  async fetchUrlMetadata(url) {
    try {
      console.log('🔗 Fetching metadata from URL:', url);
      
      // Use a CORS proxy to fetch the page
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error('Failed to fetch page');
      }
      
      const data = await response.json();
      const htmlContent = data.contents;
      
      // Extract metadata from Open Graph tags
      const metadata = {
        title: null,
        description: null,
        image: null,
        videoUrl: null,
        siteName: null
      };
      
      // Extract title (prefer og:title, fallback to <title>)
      const ogTitleMatch = htmlContent.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
      const titleMatch = htmlContent.match(/<title>([^<]+)<\/title>/i);
      if (ogTitleMatch) {
        metadata.title = ogTitleMatch[1];
      } else if (titleMatch) {
        metadata.title = titleMatch[1];
      }
      
      // Extract description
      const descMatch = htmlContent.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i) ||
                       htmlContent.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
      if (descMatch) {
        metadata.description = descMatch[1];
      }
      
      // Extract video URL (for reels/videos)
      const videoMatch = htmlContent.match(/<meta\s+property="og:video"\s+content="([^"]+)"/i) ||
                        htmlContent.match(/<meta\s+property="og:video:url"\s+content="([^"]+)"/i);
      if (videoMatch) {
        metadata.videoUrl = videoMatch[1];
      }
      
      // Extract thumbnail/image
      const imageMatch = htmlContent.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
      if (imageMatch) {
        metadata.image = imageMatch[1];
      }
      
      // Extract site name
      const siteMatch = htmlContent.match(/<meta\s+property="og:site_name"\s+content="([^"]+)"/i);
      if (siteMatch) {
        metadata.siteName = siteMatch[1];
      }
      
      console.log('🔗 Metadata extracted:', metadata);
      return metadata;
    } catch (error) {
      console.error('❌ Error fetching URL metadata:', error);
      return null;
    }
  }

  /**
   * Check if URL is an Instagram link (post, reel, or story)
   */
  isInstagramLink(url) {
    const instagramPatterns = [
      /instagram\.com\/(reel|p|tv|stories)\//i,
      /instagram\.com\/[^\/]+\/(reel|p|tv)\//i
    ];
    
    return instagramPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Check if URL is a social media post/reel/meme link
   */
  isSocialMediaLink(url) {
    const socialPatterns = [
      /instagram\.com\/(reel|p|tv)\//i,
      /twitter\.com\//i,
      /x\.com\//i,
      /tiktok\.com\//i,
      /reddit\.com\//i,
      /youtube\.com\//i,
      /youtu\.be\//i,
      /facebook\.com\//i,
      /imgur\.com\//i,
      /9gag\.com\//i
    ];
    
    return socialPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Fetch Instagram post/reel data from Ensemble Data API
   */
  async fetchInstagramPostData(instagramUrl) {
    try {
      console.log('📸 Fetching Instagram post data from Ensemble Data API:', instagramUrl);
      
      const apiUrl = `https://api.ensembledata.com/instagram/post?url=${encodeURIComponent(instagramUrl)}`;
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'X-API-Key': 'XxrDGV8x0zDWIg2Y'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Ensemble Data API error:', response.status, errorText);
        throw new Error(`API request failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Instagram post data received from API');
      
      // Extract the data we need
      const postData = {
        caption: data.caption || null,
        comments: data.comments || [],
        user: {
          username: data.user?.username || data.username || null,
          profilePicture: data.user?.profile_picture || data.profile_picture || null,
          followers: data.user?.followers || data.followers || null
        },
        images: [],
        videos: [],
        type: data.type || 'unknown' // 'image', 'video', 'carousel', etc.
      };
      
      // Extract images (for posts) or video thumbnails (for reels)
      if (data.images && Array.isArray(data.images)) {
        postData.images = data.images.slice(0, 3); // Get first 2-3 images
      } else if (data.image) {
        postData.images = [data.image];
      } else if (data.thumbnail) {
        postData.images = [data.thumbnail];
      }
      
      // Extract videos
      if (data.videos && Array.isArray(data.videos)) {
        postData.videos = data.videos.slice(0, 3);
      } else if (data.video) {
        postData.videos = [data.video];
      }
      
      // Extract comments (ensure they're in a usable format)
      if (Array.isArray(data.comments)) {
        postData.comments = data.comments.map(comment => ({
          text: comment.text || comment.comment || comment,
          username: comment.username || comment.user?.username || 'unknown',
          likes: comment.likes || 0
        }));
      }
      
      console.log('📸 Extracted post data:', {
        hasCaption: !!postData.caption,
        commentsCount: postData.comments.length,
        imagesCount: postData.images.length,
        username: postData.user.username
      });
      
      return postData;
    } catch (error) {
      console.error('❌ Error fetching Instagram post data:', error);
      return null;
    }
  }

  /**
   * Fetch image from URL and convert to base64
   */
  async fetchImageAsBase64(imageUrl) {
    try {
      console.log('📸 Fetching image from URL:', imageUrl);
      
      // Use a CORS proxy to fetch images
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(imageUrl)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }
      
      const data = await response.json();
      const htmlContent = data.contents;
      
      // Try to extract image URL from HTML (for Instagram, etc.)
      // This is a simplified approach - you might need more sophisticated parsing
      const imgMatch = htmlContent.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i) ||
                      htmlContent.match(/<img[^>]+src="([^"]+)"/i);
      
      if (imgMatch && imgMatch[1]) {
        const actualImageUrl = imgMatch[1];
        // Fetch the actual image
        const imageResponse = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(actualImageUrl)}`);
        const imageData = await imageResponse.json();
        
        // Convert to base64
        const base64Response = await fetch(actualImageUrl);
        const blob = await base64Response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
      
      // If direct image URL, fetch it
      const imageResponse = await fetch(imageUrl);
      const blob = await imageResponse.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('❌ Error fetching image:', error);
      return null;
    }
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

  /**
   * Get user profile context from localStorage
   */
  getUserProfileContext() {
    try {
      // Get current user from authService
      const user = getCurrentUser();
      
      if (!user || !user.uid) {
        return null;
      }
      
      const profileContext = {
        name: user.displayName || null,
        age: localStorage.getItem(`user_age_${user.uid}`) || null,
        gender: localStorage.getItem(`user_gender_${user.uid}`) || null,
        bio: localStorage.getItem(`user_bio_${user.uid}`) || null
      };
      
      // Only return if we have at least some information
      if (profileContext.name || profileContext.age || profileContext.gender || profileContext.bio) {
        return profileContext;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting user profile context:', error);
      return null;
    }
  }

  /**
   * Analyze image using vision model and get detailed description
   */
  async analyzeImageWithVision(imageBase64, userMessage = '') {
    try {
      console.log('👁️ VISION: Analyzing image with vision model...');
      console.log('👁️ VISION: Image base64 length:', imageBase64?.length || 0);
      console.log('👁️ VISION: Using model:', this.visionModelName);
      
      // Ensure base64 is clean (no data URL prefix)
      let cleanBase64 = imageBase64;
      if (imageBase64.includes(',')) {
        cleanBase64 = imageBase64.split(',')[1];
      }
      
      if (!cleanBase64 || cleanBase64.length < 100) {
        throw new Error('Invalid or too small base64 image');
      }
      
      const visionPrompt = `Analyze this image in COMPLETE DETAIL. Describe:
- What you see (objects, people, text, scenes, colors, layout)
- The context and setting
- Any text visible in the image (exact words if readable)
- The mood, tone, or emotion conveyed
- If it's a meme, explain the joke, format, and why it's funny
- If it's a screenshot, describe what's on screen
- Any cultural references, trends, or context
- Every detail that would help someone understand what this image is about

Be thorough and detailed. This description will be used to generate a response.`;

      const apiUrl = `${this.baseURL}api/generate`;
      const requestBody = {
        model: this.visionModelName,
        prompt: visionPrompt,
        images: [cleanBase64],
        stream: false,
        options: {
          temperature: 0.3, // Lower temp for more accurate descriptions
          num_predict: 500 // Longer description
        }
      };

      console.log('👁️ VISION: Sending request to:', apiUrl);
      console.log('👁️ VISION: Request body keys:', Object.keys(requestBody));

      // Add timeout to vision model call (30 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      let response;
      try {
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Vision model request timed out after 30 seconds');
        }
        throw fetchError;
      }

      console.log('👁️ VISION: Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ VISION: Error response:', errorText);
        throw new Error(`Vision model failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('👁️ VISION: Response keys:', Object.keys(data));
      
      const imageDescription = data.response || data.text || data.output || '';
      
      if (!imageDescription || imageDescription.trim().length === 0) {
        throw new Error('Empty description from vision model');
      }
      
      console.log('✅ VISION: Image analysis complete');
      console.log('📝 VISION: Description length:', imageDescription.length);
      console.log('📝 VISION: Description preview:', imageDescription.substring(0, 200));
      
      return imageDescription;
    } catch (error) {
      console.error('❌ VISION: Error analyzing image:', error);
      console.error('❌ VISION: Error details:', error.message, error.stack);
      throw error; // Re-throw to be handled by caller
    }
  }

  async sendMessage(userMessage, conversationHistory = [], onToken = null, imageFile = null, imageBase64 = null) {
    console.log('🚀 CHAT DEBUG: Starting sendMessage with:', userMessage);
    console.log('🚀 CHAT DEBUG: Using URL:', this.baseURL);
    
    try {
      // Check if we have an image (file or base64) or URL
      let hasImage = false;
      let finalImageBase64 = imageBase64;
      let imageDescription = null; // Declare early so it can be set for social media links
      
      // Convert image file to base64 if provided
      if (imageFile) {
        console.log('📸 Image file provided, converting to base64...');
        finalImageBase64 = await this.imageToBase64(imageFile);
        hasImage = true;
      } else if (imageBase64) {
        console.log('📸 Image base64 provided');
        hasImage = true;
      } else if (this.hasUrl(userMessage)) {
        // Check if URL points to an image or social media post
        const urls = this.extractUrls(userMessage);
        console.log('🔗 URLs detected in message:', urls);
        
        // Check if any URL is an Instagram link (priority - use Ensemble Data API)
        const instagramUrl = urls.find(url => this.isInstagramLink(url));
        
        if (instagramUrl) {
          // Handle Instagram posts/reels/stories with Ensemble Data API
          console.log('📸 Instagram link detected, fetching data from Ensemble Data API...');
          const instagramData = await this.fetchInstagramPostData(instagramUrl);
          
          if (instagramData) {
            // Build comprehensive description from Instagram data
            let linkDescription = `The user shared an Instagram ${instagramData.type === 'video' || instagramUrl.includes('/reel/') ? 'reel' : 'post'} from @${instagramData.user.username || 'unknown'}. `;
            
            // Add caption
            if (instagramData.caption) {
              linkDescription += `Caption: "${instagramData.caption}". `;
            }
            
            // Add user info
            if (instagramData.user.followers) {
              linkDescription += `User has ${instagramData.user.followers} followers. `;
            }
            
            // Add comments (especially funny ones)
            if (instagramData.comments && instagramData.comments.length > 0) {
              // Sort comments by likes to find the funniest/most popular ones
              const sortedComments = [...instagramData.comments].sort((a, b) => (b.likes || 0) - (a.likes || 0));
              const topComments = sortedComments.slice(0, 3);
              
              linkDescription += `Comments (${instagramData.comments.length} total): `;
              topComments.forEach((comment, index) => {
                if (comment.text) {
                  linkDescription += `"${comment.text}" (by @${comment.username}, ${comment.likes || 0} likes). `;
                }
              });
            }
            
            // Analyze images if available (for posts or video thumbnails)
            if (instagramData.images && instagramData.images.length > 0) {
              try {
                console.log(`📸 Analyzing ${instagramData.images.length} image(s) from Instagram post...`);
                const imageDescriptions = [];
                
                // Analyze up to 2-3 images
                for (let i = 0; i < Math.min(instagramData.images.length, 3); i++) {
                  const imageUrl = instagramData.images[i];
                  const thumbnailBase64 = await this.fetchImageAsBase64(imageUrl);
                  if (thumbnailBase64) {
                    const imgDescription = await this.analyzeImageWithVision(thumbnailBase64, userMessage);
                    imageDescriptions.push(imgDescription);
                  }
                }
                
                if (imageDescriptions.length > 0) {
                  linkDescription += `Visual content: ${imageDescriptions.join(' | ')}`;
                }
              } catch (error) {
                console.log('⚠️ Could not analyze images, using text data only:', error);
              }
            }
            
            imageDescription = linkDescription;
            hasImage = true; // Treat as having image context
            console.log('✅ Instagram post data processed');
          } else {
            console.log('⚠️ Could not fetch Instagram data from API, falling back to metadata extraction...');
            // Fallback: try regular metadata extraction
            const urlMetadata = await this.fetchUrlMetadata(instagramUrl);
            if (urlMetadata) {
              let linkDescription = `The user shared an Instagram post. `;
              if (urlMetadata.title) linkDescription += `Title: "${urlMetadata.title}". `;
              if (urlMetadata.description) linkDescription += `Description: "${urlMetadata.description}". `;
              imageDescription = linkDescription;
              hasImage = true;
            }
          }
        } else {
          // Check if any URL is a social media link (non-Instagram)
          const socialMediaUrl = urls.find(url => this.isSocialMediaLink(url));
          
          if (socialMediaUrl) {
            // Handle other social media posts/reels/memes specially
            console.log('📹 Social media link detected, fetching metadata...');
            const urlMetadata = await this.fetchUrlMetadata(socialMediaUrl);
            
            if (urlMetadata) {
              // Create a detailed description from metadata
              let linkDescription = `The user shared a link from ${urlMetadata.siteName || 'social media'}. `;
              
              if (urlMetadata.title) {
                linkDescription += `Title: "${urlMetadata.title}". `;
              }
              
              if (urlMetadata.description) {
                linkDescription += `Description: "${urlMetadata.description}". `;
              }
              
              // If it's a video/reel, mention that
              if (urlMetadata.videoUrl || socialMediaUrl.includes('/reel/') || socialMediaUrl.includes('/tv/')) {
                linkDescription += `This is a video/reel. `;
              }
              
              // If we have a thumbnail, analyze it for visual context
              if (urlMetadata.image) {
                try {
                  console.log('📸 Analyzing thumbnail from metadata...');
                  const thumbnailBase64 = await this.fetchImageAsBase64(urlMetadata.image);
                  if (thumbnailBase64) {
                    const thumbnailDescription = await this.analyzeImageWithVision(thumbnailBase64, userMessage);
                    linkDescription += `Visual content from thumbnail: ${thumbnailDescription}`;
                  }
                } catch (error) {
                  console.log('⚠️ Could not analyze thumbnail, using metadata only:', error);
                  // Still use metadata even if thumbnail analysis fails
                }
              }
              
              imageDescription = linkDescription;
              hasImage = true; // Treat as having image context
              console.log('✅ Social media link metadata processed');
            } else {
              console.log('⚠️ Could not fetch link metadata, trying to fetch as image...');
              // Fallback: try to fetch as regular image
              const fetchedImage = await this.fetchImageAsBase64(socialMediaUrl);
              if (fetchedImage) {
                finalImageBase64 = fetchedImage;
                hasImage = true;
                console.log('✅ Successfully fetched image from URL');
              }
            }
          } else {
            // Regular image URL handling (direct image links)
            for (const url of urls) {
              const fetchedImage = await this.fetchImageAsBase64(url);
              if (fetchedImage) {
                finalImageBase64 = fetchedImage;
                hasImage = true;
                console.log('✅ Successfully fetched image from URL');
                break;
              }
            }
          }
        }
      }
      
      // If we have an image but no description yet (regular images, not social media links), analyze it with vision model
      if (hasImage && finalImageBase64 && !imageDescription) {
        console.log('📸 Image detected - starting two-step process...');
        try {
          imageDescription = await this.analyzeImageWithVision(finalImageBase64, userMessage);
          
          if (!imageDescription || imageDescription.trim().length === 0) {
            console.log('⚠️ Vision analysis returned empty, falling back to regular processing');
            imageDescription = null;
          } else {
            console.log('✅ Image description received, will send to llama3:70b');
          }
        } catch (visionError) {
          console.error('❌ Vision analysis failed:', visionError);
          console.log('⚠️ Falling back to regular processing without image context');
          imageDescription = null;
          // Continue with regular processing - don't throw error
        }
      }
      
      // If we already have imageDescription from social media metadata, use it
      if (imageDescription) {
        console.log('📸 Using image description from metadata/vision analysis');
      }
      
      // Always use llama3:70b for final response
      const modelToUse = this.modelName; // llama3:70b
      const hasImageContext = !!imageDescription;
      
      console.log('🚀 CHAT DEBUG: Using model:', modelToUse);
      console.log('🚀 CHAT DEBUG: Has image context:', hasImageContext);
      
      // Get user profile context
      const userProfile = this.getUserProfileContext();
      
      // Check if this is an entertainment topic (only for non-vision messages)
      const isEntertainment = !hasImageContext && this.isEntertainmentTopic(userMessage);
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
        searchContext += '\n- Keep messages SHORT and CONTROLLED (2-4 sentences max)';
        searchContext += '\n- Show enthusiasm and personality while staying factual';
        searchContext += '\n- AVOID DRAMATIC LINES: Keep it casual and realistic, not overly dramatic';
        searchContext += '\n- AVOID IMAGINARY STATEMENTS: Do NOT say things like "I\'ve seen people share..." or "People say..." or make up statements about what other people think or do - only use facts from search results';
        searchContext += '\n- STAY REALISTIC AND GROUNDED: Match the user\'s vibe, don\'t overdo it - keep responses natural and authentic';
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
        
        // Increase response length for entertainment topics with search results (but keep it controlled)
        responseLength = 250; // Reduced to encourage shorter, more controlled responses
      } else if (isEntertainment) {
        // Entertainment topic but no search results
        searchContext = '\n\nNOTE: This appears to be an entertainment topic, but no current information was found.';
        searchContext += '\n- Still engage warmly and enthusiastically';
        searchContext += '\n- Be honest that you don\'t have current information';
        searchContext += '\n- Ask the user to share what they know or what they\'re interested in';
        searchContext += '\n- Assume Indian context (Bollywood, Indian celebrities) unless user specifies otherwise';
      }
      
      // Build user profile context string
      let userContext = '';
      if (userProfile) {
        userContext = '\n\n👤 USER PROFILE INFORMATION:\n';
        if (userProfile.name) {
          userContext += `- Name: ${userProfile.name}\n`;
        }
        if (userProfile.age) {
          userContext += `- Age: ${userProfile.age} years old\n`;
        }
        if (userProfile.gender) {
          userContext += `- Gender: ${userProfile.gender}\n`;
        }
        if (userProfile.bio) {
          userContext += `- About: ${userProfile.bio}\n`;
        }
        const userName = userProfile.name || 'they';
        userContext += `\nIMPORTANT: Use the user's name (${userName}) naturally in conversations when appropriate. Reference their age, gender, or bio context when relevant to make responses more personalized and meaningful.`;
      }
      
      // Create the prompt based on whether we have image context
      let simplePrompt;
      
      if (hasImageContext && imageDescription) {
        // Check if this is Instagram data (has comments, user info, etc.)
        const isInstagramData = imageDescription.includes('Instagram') && 
                               (imageDescription.includes('Comments') || imageDescription.includes('@'));
        
        if (isInstagramData) {
          // Special handling for Instagram posts with comments
          simplePrompt = `You are Deite, a quirky Gen-Z friend who drops fire one-liners. The user just shared an Instagram post/reel, and here's what it contains:${userContext}

📸 INSTAGRAM POST DATA:
${imageDescription}

${userMessage ? `\nUser's message: "${userMessage}"` : ''}

CRITICAL RESPONSE RULES - INSTAGRAM QUIRKY ONE-LINER MODE:
- Respond with ONLY ONE funny, quirky, Gen-Z style one-liner (1 sentence max)
- The one-liner MUST be DIRECTLY RELATED to the specific Instagram post content above
- Reference the CAPTION, COMMENTS, or USER INFO from the post
- If there are FUNNY COMMENTS mentioned, you can QUOTE them in your response like: "The way @[username] said '[comment text]' and I'm deceased fr" or "Not @[username] commenting '[comment text]' and being absolutely right periodt" or "The way '[comment text]' is sending me no cap"
- Use Gen-Z slang naturally: "no cap", "fr", "slay", "vibe", "periodt", "bestie", "lowkey", "highkey", "it's giving", "not me", "say less", "that's fire", "go off", "deadass", "bet", "ngl", "tbh", "fr fr", "that's valid", "mood", "same", "facts", "ngl that's wild", "okay but fr", "I'm deceased", "this is sending me", "the way I just-", "the way @[username] said", "not @[username]", etc.
- Be QUIRKY and FUNNY - react to the caption, quote funny comments, or roast the content
- If comments are mentioned, prioritize quoting the FUNNIEST ones in your response
- DO NOT give generic reactions - your one-liner must reference the SPECIFIC CONTENT (caption/comments/user) from the Instagram post
- DO NOT explain the joke, DO NOT analyze, DO NOT be therapeutic
- Just drop the one-liner that directly relates to the Instagram post content and leave it - let it hit like a reaction meme
- Match the energy: if it's chaotic, be chaotic; if it's relatable, relate hard
- Think: "What would I comment on THIS specific Instagram post?" - that's your response

${conversationContext}Human: ${userMessage || 'Check this out!'}
Assistant:`;
        } else {
          // Regular image/meme handling
          simplePrompt = `You are Deite, a savage Gen-Z friend who drops fire one-liners. The user just shared an image/meme, and here's what it contains:${userContext}

📸 IMAGE ANALYSIS:
${imageDescription}

${userMessage ? `\nUser's message: "${userMessage}"` : ''}

CRITICAL RESPONSE RULES - SAVAGE ONE-LINER MODE:
- Respond with ONLY ONE funny, savage, Gen-Z style one-liner (1 sentence max)
- The one-liner MUST be DIRECTLY RELATED to the specific content of the meme/image above
- Reference specific elements from the image: characters, text, jokes, situations, or themes shown in the meme
- Make it a PUNCHLINE that reacts to the ACTUAL CONTENT of the meme - not a generic reaction
- Use Gen-Z slang naturally: "no cap", "fr", "slay", "vibe", "periodt", "bestie", "lowkey", "highkey", "it's giving", "not me", "say less", "that's fire", "go off", "deadass", "bet", "ngl", "tbh", "fr fr", "that's valid", "mood", "same", "facts", "ngl that's wild", "okay but fr", "I'm deceased", "this is sending me", "the way I just-", etc.
- Be SAVAGE and FUNNY - roast the specific joke/content, relate to the specific situation, or drop a witty observation about what's actually in the meme
- DO NOT give generic reactions - your one-liner must reference the SPECIFIC CONTENT of the meme/image
- DO NOT explain the joke, DO NOT analyze, DO NOT be therapeutic
- Just drop the one-liner that directly relates to the meme content and leave it - let it hit like a reaction meme
- Match the energy: if it's chaotic, be chaotic; if it's relatable, relate hard
- Think: "What would I comment specifically about THIS meme's content?" - that's your response

${conversationContext}Human: ${userMessage || 'Check this out!'}
Assistant:`;
        }
      } else {
        // Regular message prompt - savage one-liner mode
        simplePrompt = `You are Deite, a savage Gen-Z friend who drops fire one-liners.${userContext}

IMPORTANT CONTEXT: The user is from India and prefers Indian entertainment context. When discussing entertainment topics, prioritize:
- Indian celebrities, Bollywood, Tollywood, Kollywood actors/actresses
- Indian TV shows, web series, and movies
- Indian music, singers, and artists
- Indian social media influencers and trends
- Indian entertainment news and gossip
- Focus on Indian context unless the user specifically asks about international/Western entertainment

CRITICAL RESPONSE RULES - SAVAGE ONE-LINER MODE:
- Respond with ONLY ONE funny, savage, Gen-Z style one-liner (1 sentence max)
- Make it a PUNCHLINE - like a reaction meme, not an explanation
- Use Gen-Z slang naturally: "no cap", "fr", "slay", "vibe", "periodt", "bestie", "lowkey", "highkey", "it's giving", "not me", "say less", "that's fire", "go off", "deadass", "bet", "ngl", "tbh", "fr fr", "that's valid", "mood", "same", "facts", "ngl that's wild", "okay but fr", "I'm deceased", "this is sending me", "the way I just-", etc.
- Be SAVAGE and FUNNY - roast it, relate to it, or drop a witty observation
- DO NOT explain the joke, DO NOT analyze, DO NOT be therapeutic
- Just drop the one-liner and leave it - let it hit like a reaction meme
- For entertainment topics: Use REAL information from web search below, but present it as a savage one-liner
- Match the energy: if it's chaotic, be chaotic; if it's relatable, relate hard
- Think: "What would I comment on this?" - that's your response

${searchContext}
${conversationContext}Human: ${userMessage}
Assistant:`;
      }

      // Prepare API request
      const apiUrl = `${this.baseURL}api/generate`;
      
      console.log('📤 CHAT DEBUG: Full API URL:', apiUrl);
      console.log('📤 CHAT DEBUG: Prompt length:', simplePrompt.length);
      console.log('📤 CHAT DEBUG: Using model:', modelToUse);
      console.log('📤 CHAT DEBUG: Has image context:', hasImageContext);
      
      const requestBody = {
        model: modelToUse,
        prompt: simplePrompt,
        stream: !!onToken, // Enable streaming if callback provided
        options: {
          temperature: 0.9, // Higher temp for more creative, savage one-liners
          num_predict: 100 // Short one-liners only (max 100 tokens = ~1 sentence)
        }
      };
      
      // Note: We don't send images to llama3:70b - only the text description from vision model
      
      console.log('📤 CHAT DEBUG: Sending request to:', apiUrl);
      
      // Add timeout to prevent hanging requests (60 seconds for chat)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      let response;
      try {
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.error('❌ CHAT DEBUG: Request timed out after 60 seconds');
          throw new Error('Request timed out. The RunPod server may be slow or unavailable. Please try again.');
        }
        // Check for network errors
        if (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('NetworkError')) {
          console.error('❌ CHAT DEBUG: Network error - RunPod server may be unreachable');
          throw new Error('Unable to connect to the AI server. Please check your internet connection and try again.');
        }
        throw fetchError;
      }

      console.log('📥 CHAT DEBUG: Response status:', response.status);
      console.log('📥 CHAT DEBUG: Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ CHAT DEBUG: Error response:', errorText);
        
        // Provide more specific error messages
        if (response.status === 404) {
          throw new Error('AI model not found. Please check if the model is available on RunPod.');
        } else if (response.status === 500 || response.status === 502 || response.status === 503) {
          throw new Error('AI server is temporarily unavailable. Please try again in a moment.');
        } else if (response.status === 504) {
          throw new Error('Request timed out. The AI server is taking too long to respond.');
        }
        
        throw new Error(`Model ${modelToUse} failed: ${response.status} ${response.statusText}`);
      }
      
      // Handle streaming response
      if (onToken && response.body) {
        console.log('🌊 CHAT DEBUG: Processing streaming response from', modelToUse);
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        
        // Add timeout for streaming (90 seconds total)
        const streamTimeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            console.error('❌ CHAT DEBUG: Streaming timeout after 90 seconds');
            reader.cancel();
            reject(new Error('Streaming response timed out. The AI server may be slow. Please try again.'));
          }, 90000);
        });
        
        try {
          while (true) {
            const { done, value } = await Promise.race([
              reader.read(),
              streamTimeoutPromise
            ]);
            
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
          } else {
            throw new Error('Streaming completed but no response received');
          }
          
        } catch (streamError) {
          console.error('❌ Streaming error for', modelToUse, ':', streamError);
          
          // Provide more helpful error messages
          if (streamError.message.includes('timeout')) {
            throw streamError;
          } else if (streamError.name === 'AbortError' || streamError.message.includes('canceled')) {
            throw new Error('Stream was canceled. The connection may have been interrupted.');
          }
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

  async generateDayDescription(dayData, type, periodText, userCharacterCount = null) {
    try {
      console.log(`🤖 Generating ${type} day description for`, dayData.date);
      
      // Calculate user character count if not provided
      let actualUserCharacterCount = userCharacterCount;
      if (actualUserCharacterCount === null && dayData.date) {
        try {
          const user = getCurrentUser();
          if (user) {
            // Convert date to dateId format
            let dateId;
            if (dayData.date instanceof Date) {
              dateId = getDateId(dayData.date);
            } else if (typeof dayData.date === 'string') {
              // Check if it's already in YYYY-MM-DD format
              if (/^\d{4}-\d{2}-\d{2}$/.test(dayData.date)) {
                dateId = dayData.date;
              } else {
                // Try parsing as date string
                const dateObj = new Date(dayData.date);
                dateId = getDateId(dateObj);
              }
            } else if (dayData.timestamp) {
              // If timestamp is available, use that
              const dateObj = new Date(dayData.timestamp);
              dateId = getDateId(dateObj);
            } else {
              // Fallback: try to parse as date
              const dateObj = new Date(dayData.date);
              dateId = getDateId(dateObj);
            }
            
            // Fetch user messages for that day
            const messagesResult = await firestoreService.getChatMessagesNew(user.uid, dateId);
            if (messagesResult.success && messagesResult.messages) {
              // Calculate total character count from user messages
              actualUserCharacterCount = messagesResult.messages
                .filter(msg => msg.sender === 'user' && msg.text)
                .reduce((total, msg) => total + msg.text.length, 0);
              console.log(`📊 User wrote ${actualUserCharacterCount} characters on ${dayData.date} (dateId: ${dateId})`);
            }
          }
        } catch (error) {
          console.warn('⚠️ Could not fetch user messages for character count:', error);
        }
      }
      
      // Calculate character limit (2x user character count)
      const maxReflectionCharacters = actualUserCharacterCount ? actualUserCharacterCount * 2 : null;
      
      if (maxReflectionCharacters) {
        console.log(`📊 Reflection limit: ${maxReflectionCharacters} characters (2x user input: ${actualUserCharacterCount})`);
      }
      
      // Estimate max tokens from character count (conservative: 3 chars per token)
      const estimatedMaxTokens = maxReflectionCharacters ? Math.floor(maxReflectionCharacters / 3) : 200;
      
      const characterLimitInstruction = maxReflectionCharacters 
        ? `\n\nCRITICAL CHARACTER LIMIT: The response must NEVER exceed ${maxReflectionCharacters} characters (which is 2x the ${actualUserCharacterCount} characters the user wrote on this day). Always stay within this strict character limit.`
        : '';
      
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

Keep the response warm, natural, and empathetic (3-5 sentences). Focus on meaning and emotional cause, not numbers.${characterLimitInstruction}`;

      // Use sendMessage but with token limit
      const response = await this.sendMessage(prompt);
      let description = response.trim();
      
      // Enforce character limit: description must not exceed 2x user character count
      if (maxReflectionCharacters && description.length > maxReflectionCharacters) {
        console.warn(`⚠️ Generated description (${description.length} chars) exceeds limit (${maxReflectionCharacters} chars). Truncating...`);
        // Truncate to the character limit, trying to end at a sentence boundary
        description = description.substring(0, maxReflectionCharacters);
        // Try to find the last sentence ending (., !, ?) before the limit
        const lastSentenceEnd = Math.max(
          description.lastIndexOf('.'),
          description.lastIndexOf('!'),
          description.lastIndexOf('?')
        );
        if (lastSentenceEnd > maxReflectionCharacters * 0.7) {
          // If we found a sentence end reasonably close to the limit, use it
          description = description.substring(0, lastSentenceEnd + 1);
        }
        console.log(`✅ Truncated description to ${description.length} characters (within ${maxReflectionCharacters} limit)`);
      }
      
      console.log(`📖 Generated ${type} day description: ${description.length} characters${maxReflectionCharacters ? ` (limit: ${maxReflectionCharacters})` : ''}`);
      return description;
    } catch (error) {
      console.error(`❌ Error generating ${type} day description:`, error);
      return `You experienced ${type === 'best' ? 'a significantly positive day' : 'a challenging emotional period'} during ${periodText}. Reflect on what contributed to this experience and how it relates to your ongoing emotional journey.`;
    }
  }
}

export default new ChatService();