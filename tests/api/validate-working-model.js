#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function testWorkingModel() {
  console.log('🧪 Testing gpt-4.1-mini model...\n');
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [{ 
          role: 'user', 
          content: 'Hello! Please respond with a brief greeting to confirm the API is working.' 
        }],
        max_tokens: 50,
        temperature: 0.3
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS: Model gpt-4.1-mini is working!');
      console.log('📝 Response:', data.choices[0]?.message?.content);
      console.log('📊 Usage:', data.usage);
      console.log('⏱️  Model:', data.model);
      
      // Test streaming as well
      console.log('\n🌊 Testing streaming...');
      const streamResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: [{ 
            role: 'user', 
            content: 'Count from 1 to 3' 
          }],
          max_tokens: 20,
          stream: true
        })
      });

      if (streamResponse.ok) {
        console.log('✅ Streaming works too!');
        
        // Read a few chunks
        const reader = streamResponse.body.getReader();
        const decoder = new TextDecoder();
        let chunks = 0;
        
        while (chunks < 5) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks++;
          const chunk = decoder.decode(value);
          if (chunk.includes('data: ')) {
            console.log(`📦 Chunk ${chunks}:`, chunk.substring(0, 100));
          }
        }
        reader.releaseLock();
      } else {
        console.log('❌ Streaming failed:', await streamResponse.text());
      }
      
    } else {
      console.log('❌ FAILED:', data.error?.message || 'Unknown error');
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
}

testWorkingModel();