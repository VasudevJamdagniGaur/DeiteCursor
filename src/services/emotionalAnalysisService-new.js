class EmotionalAnalysisService {
  constructor() {
    // Updated to use the new backend server with warm-up system
    this.baseURL = 'http://localhost:3001';
    this.backendAnalysisEndpoint = `${this.baseURL}/api/emotional-analysis`;
  }

  async analyzeEmotionalScores(messages) {
    console.log('🧠 Starting emotional analysis...');
    console.log('🔍 EMOTIONAL DEBUG: messages type:', typeof messages, 'length:', messages?.length);
    
    try {
      // Use the new backend API with warm-up system
      const response = await fetch(this.backendAnalysisEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages
        })
      });

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log('✅ EMOTIONAL DEBUG: Received analysis from backend:', data);
      console.log('✅ EMOTIONAL DEBUG: Model warmed up:', data.modelWarmedUp);
      
      return data.analysis || {
        happiness: 50,
        energy: 50,
        anxiety: 30,
        stress: 30
      };
      
    } catch (error) {
      console.error('❌ EMOTIONAL DEBUG: Error in analyzeEmotionalScores:', error);
      
      // Return default scores if analysis fails
      return {
        happiness: 50,
        energy: 50,
        anxiety: 30,
        stress: 30
      };
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
}

export default EmotionalAnalysisService;
