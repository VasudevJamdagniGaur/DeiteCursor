const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Ollama configuration
const OLLAMA_BASE_URL = 'http://localhost:11434';
const MODEL_NAME = 'mistral:instruct';
const KEEP_ALIVE_INTERVAL = 4 * 60 * 1000; // 4 minutes in milliseconds

/**
 * Ollama Warm-up System
 * 
 * This system prevents cold start delays by:
 * 1. Preloading the model into GPU memory on server startup
 * 2. Keeping the model warm with periodic ping requests
 * 3. Ensuring instant responses for first user messages
 */

class OllamaWarmup {
  constructor() {
    this.isWarmedUp = false;
    this.keepAliveInterval = null;
    this.startupAttempts = 0;
    this.maxStartupAttempts = 3;
  }

  /**
   * Initialize the warm-up system
   * Runs model preloading and starts keep-alive ping
   */
  async initialize() {
    console.log('🔥 Model warm-up started');
    
    try {
      // Step 1: Preload the model into GPU memory
      await this.preloadModel();
      
      // Step 2: Start keep-alive ping system
      this.startKeepAlive();
      
      console.log('✅ Model is active in GPU memory');
      this.isWarmedUp = true;
      
    } catch (error) {
      console.error('❌ Warm-up failed:', error.message);
      
      // Retry mechanism for startup failures
      if (this.startupAttempts < this.maxStartupAttempts) {
        this.startupAttempts++;
        console.log(`🔄 Retrying warm-up (attempt ${this.startupAttempts}/${this.maxStartupAttempts})...`);
        setTimeout(() => this.initialize(), 5000); // Retry after 5 seconds
      } else {
        console.error('❌ Max warm-up attempts reached. Server will continue without warm-up.');
      }
    }
  }

  /**
   * Preload the model into GPU memory using ollama run command
   * This eliminates the cold start delay for first user requests
   */
  async preloadModel() {
    return new Promise((resolve, reject) => {
      console.log(`🚀 Preloading ${MODEL_NAME} into GPU memory...`);
      
      // Use ollama run command to preload the model
      // The command runs in background and loads model into GPU memory
      const ollamaProcess = spawn('ollama', ['run', MODEL_NAME, 'Hello'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: true
      });

      let output = '';
      let errorOutput = '';

      // Capture output for debugging
      ollamaProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      ollamaProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      // Wait for model to load (typically 20-40 seconds)
      const timeout = setTimeout(() => {
        ollamaProcess.kill();
        reject(new Error('Model preload timeout - Ollama may not be running'));
      }, 60000); // 60 second timeout

      ollamaProcess.on('close', (code) => {
        clearTimeout(timeout);
        
        if (code === 0 || output.includes('Hello') || output.includes('response')) {
          console.log('✅ Model successfully preloaded into GPU memory');
          resolve();
        } else {
          console.error('❌ Model preload failed:', errorOutput);
          reject(new Error(`Ollama process exited with code ${code}`));
        }
      });

      ollamaProcess.on('error', (error) => {
        clearTimeout(timeout);
        console.error('❌ Failed to start Ollama process:', error.message);
        reject(error);
      });
    });
  }

  /**
   * Start the keep-alive ping system
   * Sends periodic requests to keep the model active in GPU memory
   */
  startKeepAlive() {
    console.log(`🔄 Starting keep-alive ping every ${KEEP_ALIVE_INTERVAL / 1000 / 60} minutes`);
    
    // Send initial ping immediately
    this.sendKeepAlivePing();
    
    // Set up recurring ping
    this.keepAliveInterval = setInterval(() => {
      this.sendKeepAlivePing();
    }, KEEP_ALIVE_INTERVAL);
  }

  /**
   * Send a keep-alive ping to Ollama API
   * Uses a minimal prompt to keep the model active without consuming resources
   */
  async sendKeepAlivePing() {
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          prompt: 'ping',
          stream: false,
          options: {
            temperature: 0.1,
            max_tokens: 1 // Minimal response to save resources
          }
        })
      });

      if (response.ok) {
        console.log('💓 Keep-alive ping successful - model remains active');
      } else {
        console.warn('⚠️ Keep-alive ping failed - model may have unloaded');
      }
    } catch (error) {
      console.warn('⚠️ Keep-alive ping error:', error.message);
    }
  }

  /**
   * Stop the keep-alive system (for graceful shutdown)
   */
  stop() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      console.log('🛑 Keep-alive system stopped');
    }
  }

  /**
   * Check if the model is warmed up
   */
  isModelWarmedUp() {
    return this.isWarmedUp;
  }
}

// Initialize the warm-up system
const ollamaWarmup = new OllamaWarmup();

// Start warm-up in background (non-blocking)
ollamaWarmup.initialize().catch(error => {
  console.error('❌ Warm-up initialization failed:', error.message);
});

/**
 * API Routes
 * These routes integrate with your existing chat services
 */

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    modelWarmedUp: ollamaWarmup.isModelWarmedUp(),
    timestamp: new Date().toISOString()
  });
});

// Chat endpoint (integrates with your existing ChatService)
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('💬 Processing chat message:', message);

    // Use Ollama API directly for chat responses
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        prompt: message,
        stream: false,
        options: {
          temperature: 0.7,
          max_tokens: 500
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    
    res.json({
      response: data.response,
      modelWarmedUp: ollamaWarmup.isModelWarmedUp()
    });

  } catch (error) {
    console.error('❌ Chat error:', error.message);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

// Emotional analysis endpoint (integrates with your existing EmotionalAnalysisService)
app.post('/api/emotional-analysis', async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    console.log('🧠 Processing emotional analysis for', messages.length, 'messages');

    // Create analysis prompt
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
{"happiness": X, "energy": Y, "anxiety": Z, "stress": W}`;

    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        prompt: analysisPrompt,
        stream: false,
        options: {
          temperature: 0.3,
          max_tokens: 200
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Parse the JSON response
    let analysisResult;
    try {
      analysisResult = JSON.parse(data.response);
    } catch (parseError) {
      // Fallback if JSON parsing fails
      analysisResult = {
        happiness: 50,
        energy: 50,
        anxiety: 30,
        stress: 30
      };
    }

    res.json({
      analysis: analysisResult,
      modelWarmedUp: ollamaWarmup.isModelWarmedUp()
    });

  } catch (error) {
    console.error('❌ Emotional analysis error:', error.message);
    res.status(500).json({ error: 'Failed to process emotional analysis' });
  }
});

// Pattern analysis endpoint (integrates with your existing PatternAnalysisService)
app.post('/api/pattern-analysis', async (req, res) => {
  try {
    const { chatData, days } = req.body;
    
    if (!chatData) {
      return res.status(400).json({ error: 'Chat data is required' });
    }

    console.log('🔍 Processing pattern analysis for', days || 30, 'days');

    // Create analysis prompt (simplified version of your existing prompt)
    const analysisPrompt = `Analyze the following chat data and identify emotional patterns, triggers, and insights.

CHAT DATA:
${JSON.stringify(chatData, null, 2)}

Return a JSON object with this structure:
{
  "triggers": {
    "stress": ["trigger1", "trigger2"],
    "joy": ["joy1", "joy2"],
    "distraction": ["distraction1", "distraction2"]
  },
  "insights": {
    "primaryStressSource": "main stress source",
    "mainJoySource": "main joy source",
    "behavioralPattern": "observed pattern"
  },
  "recommendations": [
    "recommendation1",
    "recommendation2",
    "recommendation3"
  ]
}`;

    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        prompt: analysisPrompt,
        stream: false,
        options: {
          temperature: 0.3,
          max_tokens: 1000
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Parse the JSON response
    let analysisResult;
    try {
      analysisResult = JSON.parse(data.response);
    } catch (parseError) {
      // Fallback if JSON parsing fails
      analysisResult = {
        triggers: { stress: [], joy: [], distraction: [] },
        insights: { primaryStressSource: "Unknown", mainJoySource: "Unknown", behavioralPattern: "No clear pattern" },
        recommendations: ["Focus on self-care", "Practice mindfulness", "Maintain healthy routines"]
      };
    }

    res.json({
      analysis: analysisResult,
      modelWarmedUp: ollamaWarmup.isModelWarmedUp()
    });

  } catch (error) {
    console.error('❌ Pattern analysis error:', error.message);
    res.status(500).json({ error: 'Failed to process pattern analysis' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Deite backend server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`💬 Chat API: http://localhost:${PORT}/api/chat`);
  console.log(`🧠 Emotional Analysis API: http://localhost:${PORT}/api/emotional-analysis`);
  console.log(`🔍 Pattern Analysis API: http://localhost:${PORT}/api/pattern-analysis`);
});

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server gracefully...');
  ollamaWarmup.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server gracefully...');
  ollamaWarmup.stop();
  process.exit(0);
});

module.exports = app;
