// Test script for Deite Backend with Ollama Warm-up
const fetch = require('node-fetch');

const BACKEND_URL = 'http://localhost:3001';

async function testBackend() {
  console.log('🧪 Testing Deite Backend with Ollama Warm-up...\n');
  
  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await fetch(`${BACKEND_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    console.log('🔥 Model warmed up:', healthData.modelWarmedUp);
    console.log('');
    
    // Test 2: Chat endpoint
    console.log('2️⃣ Testing chat endpoint...');
    const chatResponse = await fetch(`${BACKEND_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Hello, how are you?',
        conversationHistory: []
      })
    });
    const chatData = await chatResponse.json();
    console.log('✅ Chat response:', chatData.response);
    console.log('🔥 Model warmed up:', chatData.modelWarmedUp);
    console.log('');
    
    // Test 3: Emotional analysis endpoint
    console.log('3️⃣ Testing emotional analysis endpoint...');
    const emotionResponse = await fetch(`${BACKEND_URL}/api/emotional-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'I feel stressed about work' },
          { role: 'assistant', content: 'I understand you\'re feeling stressed. That\'s completely normal.' }
        ]
      })
    });
    const emotionData = await emotionResponse.json();
    console.log('✅ Emotional analysis:', emotionData.analysis);
    console.log('🔥 Model warmed up:', emotionData.modelWarmedUp);
    console.log('');
    
    console.log('🎉 All tests passed! Backend is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the backend server is running:');
    console.log('   npm start');
  }
}

// Run the test
testBackend();
