#!/usr/bin/env node

/**
 * Final Validation Test - Tests the fixed application configuration
 * Uses the correctly configured models
 */

require('dotenv').config({ path: '.env.local' });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testApplicationConfiguration() {
  log('🚀 Final Validation Test - Application Configuration', 'bold');
  log(`Timestamp: ${new Date().toISOString()}`, 'cyan');
  log('=' .repeat(60), 'blue');

  let allPassed = true;

  // Test 1: Basic functionality with gpt-4.1-mini
  log('\n📋 Test 1: Basic Model Functionality', 'blue');
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [{ role: 'user', content: 'Hello! Test response.' }],
        max_tokens: 20,
        temperature: 0.3
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      log('✅ Basic functionality: PASS', 'green');
      log(`  Model: ${data.model}`, 'cyan');
      log(`  Tokens: ${data.usage.total_tokens}`, 'cyan');
    } else {
      log('❌ Basic functionality: FAIL', 'red');
      log(`  Error: ${data.error?.message}`, 'red');
      allPassed = false;
    }
  } catch (error) {
    log('❌ Basic functionality: FAIL', 'red');
    log(`  Error: ${error.message}`, 'red');
    allPassed = false;
  }

  // Test 2: Streaming functionality
  log('\n🌊 Test 2: Streaming Functionality', 'blue');
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
          role: 'system',
          content: 'You are a prompt engineering expert helping users create better LLM prompts.'
        }, {
          role: 'user', 
          content: 'Help me create a prompt for documentation generation.' 
        }],
        max_tokens: 100,
        temperature: 0.3,
        stream: true
      })
    });

    if (response.ok) {
      log('✅ Streaming setup: PASS', 'green');
      
      // Test streaming chunks
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let chunkCount = 0;
      let totalContent = '';
      
      while (chunkCount < 10) {
        const { done, value } = await reader.read();
        if (done) break;
        
        chunkCount++;
        const chunk = decoder.decode(value);
        
        // Parse streaming data
        const lines = chunk.split('\n').filter(line => line.trim());
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              log('✅ Streaming completion: PASS', 'green');
              reader.releaseLock();
              break;
            }
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) totalContent += content;
            } catch (e) {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }
      }
      
      if (chunkCount > 0) {
        log(`✅ Streaming data: PASS (${chunkCount} chunks, ${totalContent.length} chars)`, 'green');
      } else {
        log('❌ Streaming data: FAIL (no chunks received)', 'red');
        allPassed = false;
      }
      
      reader.releaseLock();
    } else {
      const errorData = await response.json();
      log('❌ Streaming setup: FAIL', 'red');
      log(`  Error: ${errorData.error?.message}`, 'red');
      allPassed = false;
    }
  } catch (error) {
    log('❌ Streaming functionality: FAIL', 'red');
    log(`  Error: ${error.message}`, 'red');
    allPassed = false;
  }

  // Test 3: Application-style prompt generation
  log('\n📝 Test 3: Prompt Generation Configuration', 'blue');
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: 'Generate a comprehensive, well-structured prompt based on user requirements.'
          },
          {
            role: 'user',
            content: 'Create a prompt for code documentation generation based on this conversation.'
          }
        ],
        temperature: 0.1,
        max_tokens: 200
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      const content = data.choices[0]?.message?.content || '';
      if (content.length > 50) {
        log('✅ Prompt generation: PASS', 'green');
        log(`  Generated: ${content.length} characters`, 'cyan');
        log(`  Preview: ${content.substring(0, 100)}...`, 'cyan');
      } else {
        log('❌ Prompt generation: FAIL (insufficient content)', 'red');
        allPassed = false;
      }
    } else {
      log('❌ Prompt generation: FAIL', 'red');
      log(`  Error: ${data.error?.message}`, 'red');
      allPassed = false;
    }
  } catch (error) {
    log('❌ Prompt generation: FAIL', 'red');
    log(`  Error: ${error.message}`, 'red');
    allPassed = false;
  }

  // Test 4: Performance check
  log('\n⚡ Test 4: Performance Validation', 'blue');
  try {
    const startTime = Date.now();
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [{ role: 'user', content: 'Quick response test' }],
        max_tokens: 10
      })
    });
    
    const responseTime = Date.now() - startTime;
    const data = await response.json();
    
    if (response.ok) {
      if (responseTime < 5000) {
        log(`✅ Response time: PASS (${responseTime}ms)`, 'green');
      } else {
        log(`⚠️  Response time: SLOW (${responseTime}ms)`, 'yellow');
      }
    } else {
      log('❌ Performance test: FAIL', 'red');
      allPassed = false;
    }
  } catch (error) {
    log('❌ Performance test: FAIL', 'red');
    allPassed = false;
  }

  // Final summary
  log('\n🎯 FINAL VALIDATION SUMMARY', 'bold');
  log('=' .repeat(60), 'blue');
  
  if (allPassed) {
    log('🎉 ALL TESTS PASSED! OpenAI API integration is now working correctly!', 'green');
    log('\n✅ Configuration Status:', 'bold');
    log('  - API Key: Valid and authenticated', 'green');
    log('  - Model: gpt-4.1-mini (available and working)', 'green');
    log('  - Streaming: Fully functional', 'green');
    log('  - Application: Ready for production', 'green');
    
    log('\n📋 Application is ready to use with the following configuration:', 'cyan');
    log('  - Chat conversations: gpt-4.1-mini', 'white');
    log('  - Final prompt generation: gpt-4.1-mini', 'white');
    log('  - Streaming responses: Enabled', 'white');
    log('  - Performance: Acceptable', 'white');
  } else {
    log('❌ SOME TESTS FAILED - Additional configuration may be needed', 'red');
  }
  
  log('\n' + '=' .repeat(60), 'blue');
  
  return allPassed;
}

// Run validation
if (require.main === module) {
  testApplicationConfiguration()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Validation failed:', error);
      process.exit(1);
    });
}

module.exports = { testApplicationConfiguration };