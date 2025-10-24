// Test script to debug the RunPod connection issue
console.log('🔍 Testing RunPod connection...');

async function testRunPodConnection() {
  try {
    console.log('1️⃣ Testing basic connection...');
    
    // Test 1: Basic connection test
    const response = await fetch('https://v1jsqencdtvwvq-11434.proxy.runpod.net/api/tags', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('✅ Basic connection status:', response.status);
    const data = await response.json();
    console.log('✅ Available models:', data);
    
    // Test 2: Generate API test
    console.log('2️⃣ Testing generate API...');
    
    const generateResponse = await fetch('https://v1jsqencdtvwvq-11434.proxy.runpod.net/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3:70b',
        prompt: 'Hello, how are you?',
        stream: false,
        options: {
          temperature: 0.7,
          max_tokens: 50
        }
      })
    });
    
    console.log('✅ Generate API status:', generateResponse.status);
    
    if (generateResponse.ok) {
      const generateData = await generateResponse.json();
      console.log('✅ Generate response:', generateData);
    } else {
      const errorText = await generateResponse.text();
      console.error('❌ Generate API error:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Error type:', error.name);
    
    // Check if it's a CORS error
    if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
      console.error('🚨 CORS ERROR DETECTED! This is likely the issue.');
      console.error('🚨 The browser is blocking requests to RunPod due to CORS policy.');
    }
  }
}

// Run the test
testRunPodConnection();
