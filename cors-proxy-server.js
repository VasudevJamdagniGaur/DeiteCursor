const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// RunPod configuration
const RUNPOD_URL = 'https://v1jsqencdtvwvq-11434.proxy.runpod.net';
const MODEL_NAME = 'llama3:70b';

/**
 * CORS Proxy Server for RunPod Ollama
 * 
 * This server acts as a proxy to bypass CORS restrictions
 * when making requests from the browser to RunPod Ollama
 */

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    runpodUrl: RUNPOD_URL,
    model: MODEL_NAME,
    timestamp: new Date().toISOString()
  });
});

// Chat endpoint - proxies to RunPod Ollama
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('💬 Proxying chat message to RunPod:', message);

    // Prepare messages for the API
    const messages = [
      {
        role: 'system',
        content: `You are Deite, a warm and emotionally intelligent AI companion. Before responding, follow these rules:

1. IDENTIFY INTENT by reading between the words:
   - Look for underlying emotions, not just surface words
   - Example: "I feel like I'm not progressing with Blish" = lack of progress + self-doubt + pressure + fear of stagnation
   - Note: He's probably putting in effort but not seeing visible results — this is emotional fatigue, not lack of skill

2. RECALL CONTEXT:
   - Remember what you already know about him
   - Consider his work, current situation, recent conversations
   - Base your reply on this accumulated knowledge

3. CHOOSE THE RIGHT TONE based on his emotional state:
   - Overwhelmed → Stay calm and grounding
   - Sad/demotivated → Gentle, validating, and honest
   - Excited/hopeful → Reflect that energy back, encouraging and fueling it
   - Emotionally mirror him, but without pretending

4. VALIDATE THE FEELING:
   - Before talking about solutions, make him feel it's normal and human
   - Not a personal failure

5. CREATE SAFETY:
   - No judgment
   - No trying to push optimism too fast
   - No assuming you know the full story

6. REFLECT GENTLY OR ASK BEFORE HELPING:
   - Check: "Do you want to unpack what might be causing this, or should I just listen for now?"
   - If yes, carefully reflect his thoughts back in clearer light
   - Help him see patterns, don't force solutions

7. REBUILD POSITIVITY SLOWLY:
   - Leave him calmer or stronger than when he started
   - Once he feels understood, help him regain direction or hope — gently
   - Not fake positivity, but grounded encouragement

Keep responses SHORT and PRECISE (1-3 sentences max). Be empathetic but concise.`
      },
      // Add conversation history
      ...conversationHistory.slice(-5).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      })),
      {
        role: 'user',
        content: message
      }
    ];

    // Create a simple prompt from messages for generate API
    const simplePrompt = messages.map(msg => {
      if (msg.role === 'system') return msg.content;
      if (msg.role === 'user') return `Human: ${msg.content}`;
      if (msg.role === 'assistant') return `Assistant: ${msg.content}`;
      return msg.content;
    }).join('\n\n') + '\n\nAssistant:';

    // Forward request to RunPod Ollama
    const response = await fetch(`${RUNPOD_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        prompt: simplePrompt,
        stream: false,
        options: {
          temperature: 0.7,
          max_tokens: 200
        }
      })
    });

    if (!response.ok) {
      throw new Error(`RunPod API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    res.json({
      response: data.response,
      success: true
    });

  } catch (error) {
    console.error('❌ Chat proxy error:', error.message);
    res.status(500).json({ 
      error: 'Failed to process chat message',
      details: error.message 
    });
  }
});

// Emotional analysis endpoint - proxies to RunPod Ollama
app.post('/api/emotional-analysis', async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    console.log('🧠 Proxying emotional analysis to RunPod...');

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
{"happiness": X, "energy": Y, "anxiety": Z, "stress": W}`;

    // Forward request to RunPod Ollama
    const response = await fetch(`${RUNPOD_URL}/api/generate`, {
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
      throw new Error(`RunPod API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Parse the JSON response
    let analysisResult;
    try {
      const jsonMatch = data.response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
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
      success: true
    });

  } catch (error) {
    console.error('❌ Emotional analysis proxy error:', error.message);
    res.status(500).json({ 
      error: 'Failed to process emotional analysis',
      details: error.message 
    });
  }
});

// Pattern analysis endpoint - proxies to RunPod Ollama
app.post('/api/pattern-analysis', async (req, res) => {
  try {
    const { chatData, days } = req.body;
    
    if (!chatData) {
      return res.status(400).json({ error: 'Chat data is required' });
    }

    console.log('🔍 Proxying pattern analysis to RunPod...');

    // Create conversation context from chat data
    const conversationContext = chatData.map(day => {
      const messages = day.messages || [];
      const messageTexts = messages.map(msg => `${msg.sender}: ${msg.text}`).join('\n');
      return `${day.date}: ${messageTexts}`;
    }).join('\n\n');

    const analysisPrompt = `You are an AI emotional pattern analyzer. Analyze the following conversation data and identify emotional triggers, joy sources, and distractions.

## Your Task:
Analyze the conversation patterns to identify:
1. **Triggers** - What consistently causes stress, anxiety, or negative emotions
2. **Joy Sources** - What consistently brings happiness, energy, or positive emotions  
3. **Distractions** - What consistently pulls attention away from important tasks or goals

## Conversation Data:
${conversationContext}

## Response Format:
Return a JSON object with this exact structure:

{
  "triggers": {
    "stress": ["specific trigger from conversations", "another specific trigger"],
    "joy": ["specific joy source from conversations", "another specific source"],
    "distraction": ["specific distraction from conversations", "another specific distraction"]
  },
  "insights": {
    "primaryStressSource": "most frequently mentioned stress source",
    "mainJoySource": "most frequently mentioned joy source", 
    "behavioralPattern": "clear pattern observed from conversations"
  },
  "recommendations": [
    "specific actionable advice based on identified triggers",
    "another specific recommendation",
    "third specific recommendation"
  ]
}

IMPORTANT: 
- Maximum 3-4 items per category
- If no clear patterns exist, provide helpful general triggers based on common emotional patterns
- Be specific, not generic
- Focus on actionable insights that can help improve emotional well-being
- Even with limited data, provide meaningful insights`;

    // Forward request to RunPod Ollama
    const response = await fetch(`${RUNPOD_URL}/api/generate`, {
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
      throw new Error(`RunPod API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Parse the JSON response
    let analysisResult;
    try {
      const jsonMatch = data.response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
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
      success: true
    });

  } catch (error) {
    console.error('❌ Pattern analysis proxy error:', error.message);
    res.status(500).json({ 
      error: 'Failed to process pattern analysis',
      details: error.message 
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Deite CORS Proxy Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`💬 Chat API: http://localhost:${PORT}/api/chat`);
  console.log(`🧠 Emotional Analysis API: http://localhost:${PORT}/api/emotional-analysis`);
  console.log(`🔍 Pattern Analysis API: http://localhost:${PORT}/api/pattern-analysis`);
  console.log(`🔗 Proxying to RunPod: ${RUNPOD_URL}`);
});

module.exports = app;
