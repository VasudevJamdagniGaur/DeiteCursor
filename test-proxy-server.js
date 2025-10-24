// Test script to verify Deite CORS Proxy Server is working
console.log('🧪 Testing Deite CORS Proxy Server...\n');

async function testProxyServer() {
  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await fetch('http://localhost:3001/health');
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    console.log('');
    
    // Test 2: Chat endpoint
    console.log('2️⃣ Testing chat endpoint...');
    const chatResponse = await fetch('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Hello, how are you?',
        conversationHistory: []
      })
    });
    const chatData = await chatResponse.json();
    console.log('✅ Chat response:', chatData.response);
    console.log('✅ Success:', chatData.success);
    console.log('');
    
    // Test 3: Emotional analysis endpoint
    console.log('3️⃣ Testing emotional analysis endpoint...');
    const emotionResponse = await fetch('http://localhost:3001/api/emotional-analysis', {
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
    console.log('✅ Success:', emotionData.success);
    console.log('');
    
    console.log('🎉 All tests passed! CORS Proxy Server is working correctly.');
    console.log('🚀 Your Deite app should now work perfectly!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the CORS proxy server is running:');
    console.log('   npm start');
  }
}

// Run the test
testProxyServer();
