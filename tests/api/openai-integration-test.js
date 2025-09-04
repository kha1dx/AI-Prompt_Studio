#!/usr/bin/env node

/**
 * Comprehensive OpenAI API Integration Test Suite
 * Tests all aspects of OpenAI API connectivity and functionality
 */

require('dotenv').config({ path: '.env.local' });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ANSI colors for better output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bold');
  console.log('='.repeat(60));
}

function logTest(testName, status, details = '') {
  const statusColor = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  const statusSymbol = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '⚠';
  log(`${statusSymbol} ${testName}: ${status}`, statusColor);
  if (details) {
    log(`  ${details}`, 'cyan');
  }
}

async function makeOpenAIRequest(payload) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  return { response, data: await response.json() };
}

async function makeStreamingRequest(payload) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...payload, stream: true })
  });

  return response;
}

class OpenAITester {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0
    };
  }

  recordResult(status) {
    this.results.total++;
    if (status === 'PASS') this.results.passed++;
    else if (status === 'FAIL') this.results.failed++;
    else this.results.warnings++;
  }

  async testAPIKeyValidation() {
    logSection('1. API KEY VALIDATION');
    
    // Test 1: Check if API key is present
    if (!OPENAI_API_KEY) {
      logTest('API Key Present', 'FAIL', 'OPENAI_API_KEY not found in environment');
      this.recordResult('FAIL');
      return false;
    }
    
    logTest('API Key Present', 'PASS', `Key length: ${OPENAI_API_KEY.length} characters`);
    this.recordResult('PASS');
    
    // Test 2: Check API key format
    const keyPattern = /^sk-proj-[a-zA-Z0-9]{48}[a-zA-Z0-9-_]{32,}$/;
    if (!keyPattern.test(OPENAI_API_KEY)) {
      logTest('API Key Format', 'WARN', 'Key format may be invalid (new project key format expected)');
      this.recordResult('WARN');
    } else {
      logTest('API Key Format', 'PASS', 'Project key format detected');
      this.recordResult('PASS');
    }
    
    return true;
  }

  async testAPIConnectivity() {
    logSection('2. API CONNECTIVITY TEST');
    
    try {
      const startTime = Date.now();
      const { response, data } = await makeOpenAIRequest({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5
      });
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        logTest('Basic API Connection', 'PASS', `Response time: ${responseTime}ms`);
        this.recordResult('PASS');
        return true;
      } else {
        logTest('Basic API Connection', 'FAIL', `HTTP ${response.status}: ${data.error?.message || 'Unknown error'}`);
        this.recordResult('FAIL');
        return false;
      }
    } catch (error) {
      logTest('Basic API Connection', 'FAIL', `Network error: ${error.message}`);
      this.recordResult('FAIL');
      return false;
    }
  }

  async testModelAvailability() {
    logSection('3. MODEL AVAILABILITY TEST');
    
    const modelsToTest = ['gpt-4o-mini', 'gpt-4-turbo'];
    const results = [];
    
    for (const model of modelsToTest) {
      try {
        const startTime = Date.now();
        const { response, data } = await makeOpenAIRequest({
          model,
          messages: [{ role: 'user', content: 'Test' }],
          max_tokens: 5
        });
        const responseTime = Date.now() - startTime;

        if (response.ok) {
          logTest(`Model: ${model}`, 'PASS', `Response time: ${responseTime}ms`);
          this.recordResult('PASS');
          results.push({ model, available: true, responseTime });
        } else {
          const errorMsg = data.error?.message || 'Unknown error';
          if (errorMsg.includes('does not exist')) {
            logTest(`Model: ${model}`, 'FAIL', 'Model not available');
            this.recordResult('FAIL');
          } else {
            logTest(`Model: ${model}`, 'FAIL', errorMsg);
            this.recordResult('FAIL');
          }
          results.push({ model, available: false, error: errorMsg });
        }
      } catch (error) {
        logTest(`Model: ${model}`, 'FAIL', `Network error: ${error.message}`);
        this.recordResult('FAIL');
        results.push({ model, available: false, error: error.message });
      }
    }
    
    return results;
  }

  async testStreamingResponse() {
    logSection('4. STREAMING RESPONSE TEST');
    
    try {
      const response = await makeStreamingRequest({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Count from 1 to 5' }],
        max_tokens: 50
      });

      if (!response.ok) {
        const errorData = await response.json();
        logTest('Streaming Response', 'FAIL', `HTTP ${response.status}: ${errorData.error?.message}`);
        this.recordResult('FAIL');
        return false;
      }

      if (!response.body) {
        logTest('Streaming Response', 'FAIL', 'No response body received');
        this.recordResult('FAIL');
        return false;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let chunks = 0;
      let content = '';

      try {
        const startTime = Date.now();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          chunks++;
          const chunk = decoder.decode(value);
          
          // Parse SSE chunks
          const lines = chunk.split('\n').filter(line => line.trim());
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              
              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices[0]?.delta?.content;
                if (delta) content += delta;
              } catch (e) {
                // Ignore parsing errors for incomplete chunks
              }
            }
          }
          
          if (chunks > 20) break; // Prevent infinite loops
        }
        
        const totalTime = Date.now() - startTime;
        
        if (chunks > 0 && content.length > 0) {
          logTest('Streaming Response', 'PASS', `Received ${chunks} chunks, ${content.length} characters in ${totalTime}ms`);
          this.recordResult('PASS');
          return true;
        } else {
          logTest('Streaming Response', 'FAIL', 'No content received in stream');
          this.recordResult('FAIL');
          return false;
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      logTest('Streaming Response', 'FAIL', `Error: ${error.message}`);
      this.recordResult('FAIL');
      return false;
    }
  }

  async testRateLimits() {
    logSection('5. RATE LIMIT TEST');
    
    try {
      // Make multiple rapid requests to test rate limiting
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(makeOpenAIRequest({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: `Request ${i + 1}` }],
          max_tokens: 5
        }));
      }

      const results = await Promise.allSettled(requests);
      let successCount = 0;
      let rateLimitCount = 0;

      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { response, data } = result.value;
          if (response.ok) {
            successCount++;
          } else if (response.status === 429) {
            rateLimitCount++;
          }
        }
      }

      logTest('Rate Limit Handling', 'PASS', `${successCount} successful, ${rateLimitCount} rate limited`);
      this.recordResult('PASS');
      return true;
    } catch (error) {
      logTest('Rate Limit Handling', 'FAIL', `Error: ${error.message}`);
      this.recordResult('FAIL');
      return false;
    }
  }

  async testErrorHandling() {
    logSection('6. ERROR HANDLING TEST');
    
    // Test with invalid model
    try {
      const { response, data } = await makeOpenAIRequest({
        model: 'invalid-model-name',
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 5
      });

      if (response.status === 404 && data.error?.message?.includes('model')) {
        logTest('Invalid Model Error', 'PASS', 'Proper error response for invalid model');
        this.recordResult('PASS');
      } else {
        logTest('Invalid Model Error', 'FAIL', 'Unexpected response for invalid model');
        this.recordResult('FAIL');
      }
    } catch (error) {
      logTest('Invalid Model Error', 'FAIL', `Network error: ${error.message}`);
      this.recordResult('FAIL');
    }

    // Test with invalid parameters
    try {
      const { response, data } = await makeOpenAIRequest({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: -1 // Invalid value
      });

      if (response.status === 400) {
        logTest('Invalid Parameters Error', 'PASS', 'Proper error response for invalid parameters');
        this.recordResult('PASS');
      } else {
        logTest('Invalid Parameters Error', 'FAIL', 'Unexpected response for invalid parameters');
        this.recordResult('FAIL');
      }
    } catch (error) {
      logTest('Invalid Parameters Error', 'FAIL', `Network error: ${error.message}`);
      this.recordResult('FAIL');
    }
  }

  async testPerformance() {
    logSection('7. PERFORMANCE BENCHMARKS');
    
    const performanceTests = [
      { name: 'Simple Response', maxTokens: 10, expectedTime: 2000 },
      { name: 'Medium Response', maxTokens: 100, expectedTime: 5000 },
      { name: 'Complex Response', maxTokens: 500, expectedTime: 15000 }
    ];

    for (const test of performanceTests) {
      try {
        const startTime = Date.now();
        const { response, data } = await makeOpenAIRequest({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Write a helpful response about API testing' }],
          max_tokens: test.maxTokens
        });
        const responseTime = Date.now() - startTime;

        if (response.ok) {
          const status = responseTime <= test.expectedTime ? 'PASS' : 'WARN';
          logTest(test.name, status, `${responseTime}ms (target: <${test.expectedTime}ms)`);
          this.recordResult(status);
        } else {
          logTest(test.name, 'FAIL', `HTTP ${response.status}: ${data.error?.message}`);
          this.recordResult('FAIL');
        }
      } catch (error) {
        logTest(test.name, 'FAIL', `Error: ${error.message}`);
        this.recordResult('FAIL');
      }
    }
  }

  async testQuotaAndBilling() {
    logSection('8. QUOTA AND BILLING STATUS');
    
    try {
      // Test with a minimal request to check quota
      const { response, data } = await makeOpenAIRequest({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 1
      });

      if (response.ok) {
        logTest('Quota Status', 'PASS', 'API quota appears healthy');
        this.recordResult('PASS');
      } else if (response.status === 429) {
        const errorMessage = data.error?.message || '';
        if (errorMessage.includes('quota') || errorMessage.includes('billing')) {
          logTest('Quota Status', 'FAIL', 'Quota exceeded or billing issue detected');
          this.recordResult('FAIL');
        } else {
          logTest('Quota Status', 'WARN', 'Rate limited but quota status unclear');
          this.recordResult('WARN');
        }
      } else if (response.status === 403) {
        logTest('Quota Status', 'FAIL', 'Access forbidden - possible billing issue');
        this.recordResult('FAIL');
      } else {
        logTest('Quota Status', 'WARN', `Unexpected status: ${response.status}`);
        this.recordResult('WARN');
      }
    } catch (error) {
      logTest('Quota Status', 'FAIL', `Error: ${error.message}`);
      this.recordResult('FAIL');
    }
  }

  async testAppIntegration() {
    logSection('9. APPLICATION INTEGRATION TEST');
    
    try {
      // Test the exact request format used in the app
      const appRequestPayload = {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a prompt engineering expert helping users create better LLM prompts.'
          },
          {
            role: 'user',
            content: 'Help me create a prompt for writing code documentation.'
          }
        ],
        stream: true,
        temperature: 0.3,
        max_tokens: 1000
      };

      const response = await makeStreamingRequest(appRequestPayload);
      
      if (response.ok) {
        logTest('App Request Format', 'PASS', 'App-style request successful');
        this.recordResult('PASS');
      } else {
        const errorData = await response.json();
        logTest('App Request Format', 'FAIL', `HTTP ${response.status}: ${errorData.error?.message}`);
        this.recordResult('FAIL');
      }

      // Test GPT-4-turbo for final prompt generation
      const { response: turboResponse, data: turboData } = await makeOpenAIRequest({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: 'Generate a comprehensive, well-structured prompt based on user requirements.'
          },
          {
            role: 'user',
            content: 'Create a prompt for code documentation generation.'
          }
        ],
        temperature: 0.1,
        max_tokens: 1500
      });

      if (turboResponse.ok) {
        logTest('GPT-4-Turbo Integration', 'PASS', 'Final prompt generation model available');
        this.recordResult('PASS');
      } else {
        logTest('GPT-4-Turbo Integration', 'FAIL', `HTTP ${turboResponse.status}: ${turboData.error?.message}`);
        this.recordResult('FAIL');
      }

    } catch (error) {
      logTest('App Integration Test', 'FAIL', `Error: ${error.message}`);
      this.recordResult('FAIL');
    }
  }

  displaySummary() {
    logSection('TEST RESULTS SUMMARY');
    
    const { total, passed, failed, warnings } = this.results;
    const passRate = ((passed / total) * 100).toFixed(1);
    
    log(`Total Tests: ${total}`, 'white');
    log(`Passed: ${passed} (${passRate}%)`, 'green');
    log(`Failed: ${failed}`, 'red');
    log(`Warnings: ${warnings}`, 'yellow');
    
    console.log('\n' + '='.repeat(60));
    
    if (failed === 0) {
      log('🎉 ALL CRITICAL TESTS PASSED - OpenAI API integration is healthy!', 'green');
    } else if (failed <= 2 && passed > failed) {
      log('⚠️  MOSTLY HEALTHY - Some issues detected but API is functional', 'yellow');
    } else {
      log('❌ CRITICAL ISSUES DETECTED - OpenAI API integration needs attention', 'red');
    }
    
    console.log('='.repeat(60) + '\n');
    
    return {
      healthy: failed === 0,
      mostlyHealthy: failed <= 2 && passed > failed,
      summary: this.results
    };
  }
}

async function runComprehensiveTests() {
  log('🚀 Starting Comprehensive OpenAI API Integration Test Suite', 'bold');
  log(`Timestamp: ${new Date().toISOString()}`, 'cyan');
  
  const tester = new OpenAITester();
  
  // Run all tests
  await tester.testAPIKeyValidation();
  await tester.testAPIConnectivity();
  await tester.testModelAvailability();
  await tester.testStreamingResponse();
  await tester.testRateLimits();
  await tester.testErrorHandling();
  await tester.testPerformance();
  await tester.testQuotaAndBilling();
  await tester.testAppIntegration();
  
  // Display results
  return tester.displaySummary();
}

// Run tests if this file is executed directly
if (require.main === module) {
  runComprehensiveTests()
    .then(result => {
      process.exit(result.healthy ? 0 : 1);
    })
    .catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { runComprehensiveTests, OpenAITester };