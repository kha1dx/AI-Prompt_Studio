#!/usr/bin/env node

/**
 * Quick Model Availability Test
 * Tests which models are actually available with the current API key
 */

require('dotenv').config({ path: '.env.local' });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function testAvailableModels() {
  console.log('🔍 Testing Available Models...\n');
  
  try {
    // First, get list of available models
    console.log('📋 Fetching available models...');
    const modelsResponse = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      }
    });

    if (!modelsResponse.ok) {
      console.error('❌ Failed to fetch models:', await modelsResponse.text());
      return;
    }

    const modelsData = await modelsResponse.json();
    const availableModels = modelsData.data
      .filter(model => model.id.includes('gpt'))
      .map(model => model.id)
      .sort();

    console.log('✅ Available GPT Models:');
    availableModels.forEach(model => console.log(`  - ${model}`));
    
    // Test a few common models
    const modelsToTest = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo-preview', 'gpt-4o'];
    
    console.log('\n🧪 Testing Model Access...');
    
    for (const model of modelsToTest) {
      if (!availableModels.includes(model)) {
        console.log(`⚠️  ${model}: Not in available models list`);
        continue;
      }
      
      try {
        const testResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 5
          })
        });

        if (testResponse.ok) {
          console.log(`✅ ${model}: Working`);
        } else {
          const error = await testResponse.json();
          console.log(`❌ ${model}: ${error.error?.message || 'Unknown error'}`);
        }
      } catch (error) {
        console.log(`❌ ${model}: Network error - ${error.message}`);
      }
    }

    // Suggest working alternatives
    console.log('\n💡 Suggested Configuration:');
    if (availableModels.includes('gpt-3.5-turbo')) {
      console.log('  - Use "gpt-3.5-turbo" instead of "gpt-4o-mini"');
    }
    if (availableModels.includes('gpt-4')) {
      console.log('  - Use "gpt-4" instead of "gpt-4-turbo"');
    }
    if (availableModels.includes('gpt-4-turbo-preview')) {
      console.log('  - Use "gpt-4-turbo-preview" instead of "gpt-4-turbo"');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAvailableModels();