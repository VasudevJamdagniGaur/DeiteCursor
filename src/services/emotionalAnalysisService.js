class EmotionalAnalysisService {
  constructor() {
    this.baseURL = 'https://b5z7d285vvdqfz-11434.proxy.runpod.net/';
  }

  async analyzeEmotionalScores(messages) {
    console.log('🧠 Starting emotional analysis...');
    console.log('🔍 EMOTIONAL DEBUG: messages type:', typeof messages, 'length:', messages?.length);
    
    try {
      // Use the CORS proxy server
      const response = await fetch(this.analysisEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
          messages: messages
          })
        });

      if (!response.ok) {
        throw new Error(`Proxy server error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log('✅ EMOTIONAL DEBUG: Received analysis from proxy:', data);
      
      if (data.success && data.analysis) {
        return data.analysis;
        } else {
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

export default new EmotionalAnalysisService();