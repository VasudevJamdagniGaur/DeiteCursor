class EmotionalAnalysisService {
  constructor() {
    // Updated to use RunPod Ollama directly
    this.baseURL = 'https://v1jsqencdtvwvq-11434.proxy.runpod.net';
    this.modelName = 'llama3:70b'; // Using the available model from your RunPod
  }

  async analyzeEmotionalScores(messages) {
    console.log('🧠 Starting emotional analysis...');
    console.log('🔍 EMOTIONAL DEBUG: messages type:', typeof messages, 'length:', messages?.length);
    
    try {
      // Handle edge cases
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        console.log('⚠️ EMOTIONAL DEBUG: No messages provided, returning default scores');
        return {
          happiness: 50,
          energy: 50,
          anxiety: 30,
          stress: 30
        };
      }
      
      // Create conversation transcript
      const conversationTranscript = messages.map(msg => 
        `${msg.role}: ${msg.content}`
      ).join('\n');

      const analysisPrompt = `You are an emotion analyzer. Analyze the conversation below and return ONLY a JSON object with emotional scores.

CRITICAL RULES - MUST FOLLOW:
1. Each score MUST be a number between 1 and 100 (NOT 0, minimum is 1)
2. Happiness (1-100): positive emotions, joy, satisfaction, contentment
3. Energy (1-100): vitality, motivation, activity level, enthusiasm
4. Anxiety (1-100): worry, fear, nervousness, unease
5. Stress (1-100): pressure, overwhelm, burden, tension
6. If happiness is high (>70), stress and anxiety should be low (<40)
7. If stress or anxiety is high (>60), happiness should be moderate to low (<50)
8. Each number must be an integer (whole number, no decimals)
9. NEVER return 0 for any value - minimum is 1

CONVERSATION:
${conversationTranscript}

Return ONLY valid JSON with integers between 1-100, no explanation, no extra text:
{"happiness": X, "energy": Y, "anxiety": Z, "stress": W}

Example valid responses:
{"happiness": 65, "energy": 58, "anxiety": 32, "stress": 28}
{"happiness": 38, "energy": 42, "anxiety": 55, "stress": 48}`;

      console.log('📤 EMOTIONAL DEBUG: Sending request to RunPod Ollama...');

      // Use RunPod Ollama API directly
      const response = await fetch(`${this.baseURL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.modelName,
          prompt: analysisPrompt,
          stream: false,
          options: {
            temperature: 0.3,
            max_tokens: 200
          }
        })
      });

      if (!response.ok) {
        throw new Error(`RunPod Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ EMOTIONAL DEBUG: Received response from RunPod:', data);

      if (data.response) {
        const responseText = data.response.trim();
        console.log('📝 EMOTIONAL DEBUG: Raw response text:', responseText);
        
        // Try to extract JSON from the response
        let jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[0];
          console.log('📝 EMOTIONAL DEBUG: Extracted JSON string:', jsonStr);
          
          try {
            const analysisResult = JSON.parse(jsonStr);
            console.log('✅ EMOTIONAL DEBUG: Parsed analysis result:', analysisResult);
            
            // Validate the result
            if (this.isValidAnalysisResult(analysisResult)) {
              console.log('✅ EMOTIONAL DEBUG: Valid analysis result:', analysisResult);
              return analysisResult;
            } else {
              console.log('⚠️ EMOTIONAL DEBUG: Invalid analysis result, using defaults');
              return this.getDefaultScores();
            }
          } catch (parseError) {
            console.error('❌ EMOTIONAL DEBUG: JSON parse error:', parseError);
            console.log('📝 EMOTIONAL DEBUG: Failed to parse:', jsonStr);
            return this.getDefaultScores();
          }
        } else {
          console.log('⚠️ EMOTIONAL DEBUG: No JSON found in response, using defaults');
          return this.getDefaultScores();
        }
      } else {
        console.log('⚠️ EMOTIONAL DEBUG: No response field in data, using defaults');
        return this.getDefaultScores();
      }
      
    } catch (error) {
      console.error('❌ EMOTIONAL DEBUG: Error in analyzeEmotionalScores:', error);
      return this.getDefaultScores();
    }
  }

  isValidAnalysisResult(result) {
    if (!result || typeof result !== 'object') {
      return false;
    }
    
    const requiredFields = ['happiness', 'energy', 'anxiety', 'stress'];
    for (const field of requiredFields) {
      if (typeof result[field] !== 'number' || result[field] < 1 || result[field] > 100) {
        return false;
      }
    }
    
    return true;
  }

  getDefaultScores() {
    return {
      happiness: 50,
      energy: 50,
      anxiety: 30,
      stress: 30
    };
  }
}

export default EmotionalAnalysisService;