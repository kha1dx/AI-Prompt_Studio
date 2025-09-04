#!/usr/bin/env node

/**
 * OpenAI API Contract Testing Suite
 * Validates API responses against expected schemas and formats
 */

require('dotenv').config({ path: '.env.local' });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ANSI colors
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

class ContractTester {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      violations: []
    };
  }

  recordResult(testName, passed, details = '') {
    this.results.total++;
    if (passed) {
      this.results.passed++;
      log(`✓ ${testName}: PASS`, 'green');
    } else {
      this.results.failed++;
      this.results.violations.push({ test: testName, details });
      log(`✗ ${testName}: FAIL - ${details}`, 'red');
    }
    if (details && passed) {
      log(`  ${details}`, 'cyan');
    }
  }

  async makeRequest(payload) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    return { response, data };
  }

  validateResponseStructure(data, testName) {
    const requiredFields = ['id', 'object', 'created', 'model', 'choices'];
    const missingFields = requiredFields.filter(field => !(field in data));
    
    this.recordResult(
      `${testName} - Response Structure`,
      missingFields.length === 0,
      missingFields.length > 0 ? `Missing fields: ${missingFields.join(', ')}` : 'All required fields present'
    );

    return missingFields.length === 0;
  }

  validateChoicesStructure(choices, testName) {
    if (!Array.isArray(choices) || choices.length === 0) {
      this.recordResult(`${testName} - Choices Array`, false, 'Choices should be non-empty array');
      return false;
    }

    const choice = choices[0];
    const requiredChoiceFields = ['index', 'message', 'finish_reason'];
    const missingChoiceFields = requiredChoiceFields.filter(field => !(field in choice));
    
    this.recordResult(
      `${testName} - Choice Structure`,
      missingChoiceFields.length === 0,
      missingChoiceFields.length > 0 ? `Missing choice fields: ${missingChoiceFields.join(', ')}` : 'Choice structure valid'
    );

    if (choice.message) {
      const requiredMessageFields = ['role', 'content'];
      const missingMessageFields = requiredMessageFields.filter(field => !(field in choice.message));
      
      this.recordResult(
        `${testName} - Message Structure`,
        missingMessageFields.length === 0,
        missingMessageFields.length > 0 ? `Missing message fields: ${missingMessageFields.join(', ')}` : 'Message structure valid'
      );
    }

    return missingChoiceFields.length === 0;
  }

  validateUsageStructure(usage, testName) {
    if (!usage) {
      this.recordResult(`${testName} - Usage Info`, false, 'Usage information missing');
      return false;
    }

    const requiredUsageFields = ['prompt_tokens', 'completion_tokens', 'total_tokens'];
    const missingUsageFields = requiredUsageFields.filter(field => !(field in usage));
    
    this.recordResult(
      `${testName} - Usage Structure`,
      missingUsageFields.length === 0,
      missingUsageFields.length > 0 ? `Missing usage fields: ${missingUsageFields.join(', ')}` : 'Usage structure valid'
    );

    // Validate token counts are positive integers
    const validTokens = requiredUsageFields.every(field => {
      const value = usage[field];
      return typeof value === 'number' && value >= 0 && Number.isInteger(value);
    });

    this.recordResult(
      `${testName} - Token Counts`,
      validTokens,
      validTokens ? 'All token counts are valid positive integers' : 'Invalid token count values'
    );

    return missingUsageFields.length === 0 && validTokens;
  }

  async testBasicResponseContract() {
    log('\n📋 Basic Response Contract Test', 'blue');
    log('=' .repeat(50), 'blue');

    try {
      const { response, data } = await this.makeRequest({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10
      });

      if (!response.ok) {
        this.recordResult('Basic Response', false, `HTTP ${response.status}: ${data.error?.message}`);
        return false;
      }

      this.validateResponseStructure(data, 'Basic Response');
      this.validateChoicesStructure(data.choices, 'Basic Response');
      this.validateUsageStructure(data.usage, 'Basic Response');

      // Validate specific field types
      this.recordResult(
        'Basic Response - Field Types',
        typeof data.id === 'string' && 
        typeof data.object === 'string' && 
        typeof data.created === 'number' &&
        typeof data.model === 'string',
        'ID, object, created, and model fields have correct types'
      );

      return true;
    } catch (error) {
      this.recordResult('Basic Response', false, `Network error: ${error.message}`);
      return false;
    }
  }

  async testStreamingResponseContract() {
    log('\n🌊 Streaming Response Contract Test', 'blue');
    log('=' .repeat(50), 'blue');

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Count from 1 to 3' }],
          max_tokens: 50,
          stream: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        this.recordResult('Streaming Response', false, `HTTP ${response.status}: ${errorData.error?.message}`);
        return false;
      }

      // Validate streaming response headers
      const contentType = response.headers.get('content-type');
      this.recordResult(
        'Streaming - Content Type',
        contentType && contentType.includes('text/plain'),
        `Content-Type: ${contentType}`
      );

      // Parse streaming chunks
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let chunkCount = 0;
      let hasValidChunk = false;

      try {
        while (chunkCount < 10) { // Limit to prevent infinite loops
          const { done, value } = await reader.read();
          if (done) break;
          
          chunkCount++;
          const chunk = decoder.decode(value);
          
          // Validate SSE format
          const lines = chunk.split('\n').filter(line => line.trim());
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                this.recordResult('Streaming - Done Signal', true, 'Received [DONE] signal');
                reader.releaseLock();
                return true;
              }
              
              try {
                const parsed = JSON.parse(data);
                
                // Validate streaming chunk structure
                if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
                  hasValidChunk = true;
                  
                  // Check required streaming fields
                  const hasRequiredFields = 'id' in parsed && 'object' in parsed && 'created' in parsed;
                  if (hasRequiredFields) {
                    this.recordResult('Streaming - Chunk Structure', true, 'Valid streaming chunk structure');
                  }
                }
              } catch (parseError) {
                // Some chunks might be incomplete, that's normal
              }
            }
          }
        }

        reader.releaseLock();
        
        this.recordResult(
          'Streaming - Valid Chunks',
          hasValidChunk,
          hasValidChunk ? 'Received valid streaming chunks' : 'No valid streaming chunks received'
        );

        return hasValidChunk;
      } finally {
        if (reader.locked) {
          reader.releaseLock();
        }
      }
    } catch (error) {
      this.recordResult('Streaming Response', false, `Error: ${error.message}`);
      return false;
    }
  }

  async testErrorResponseContract() {
    log('\n❌ Error Response Contract Test', 'blue');
    log('=' .repeat(50), 'blue');

    // Test with invalid model
    try {
      const { response, data } = await this.makeRequest({
        model: 'invalid-model-name',
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 10
      });

      if (response.ok) {
        this.recordResult('Error Response - Invalid Model', false, 'Expected error response but got success');
        return false;
      }

      // Validate error response structure
      const hasErrorField = 'error' in data;
      this.recordResult(
        'Error Response - Structure',
        hasErrorField,
        hasErrorField ? 'Error field present' : 'Error field missing'
      );

      if (data.error) {
        const errorFields = ['message', 'type'];
        const hasRequiredErrorFields = errorFields.every(field => field in data.error);
        
        this.recordResult(
          'Error Response - Error Fields',
          hasRequiredErrorFields,
          hasRequiredErrorFields ? 'Error has required fields' : `Missing error fields: ${errorFields.filter(f => !(f in data.error)).join(', ')}`
        );

        // Validate error message is descriptive
        const hasDescriptiveMessage = data.error.message && data.error.message.length > 10;
        this.recordResult(
          'Error Response - Message Quality',
          hasDescriptiveMessage,
          hasDescriptiveMessage ? 'Error message is descriptive' : 'Error message too short or missing'
        );
      }

      return true;
    } catch (error) {
      this.recordResult('Error Response Contract', false, `Network error: ${error.message}`);
      return false;
    }
  }

  async testParameterValidation() {
    log('\n🔧 Parameter Validation Contract Test', 'blue');
    log('=' .repeat(50), 'blue');

    // Test temperature bounds
    const temperatureTests = [
      { temp: -0.1, shouldFail: true, name: 'Negative Temperature' },
      { temp: 0.0, shouldFail: false, name: 'Zero Temperature' },
      { temp: 1.0, shouldFail: false, name: 'Max Temperature' },
      { temp: 2.1, shouldFail: true, name: 'Excessive Temperature' }
    ];

    for (const test of temperatureTests) {
      try {
        const { response, data } = await this.makeRequest({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Test' }],
          max_tokens: 10,
          temperature: test.temp
        });

        const actuallyFailed = !response.ok;
        const testPassed = actuallyFailed === test.shouldFail;
        
        this.recordResult(
          `Parameter Validation - ${test.name}`,
          testPassed,
          testPassed ? 
            `Correctly ${test.shouldFail ? 'rejected' : 'accepted'} temperature ${test.temp}` :
            `Expected ${test.shouldFail ? 'failure' : 'success'} but got ${actuallyFailed ? 'failure' : 'success'}`
        );
      } catch (error) {
        this.recordResult(`Parameter Validation - ${test.name}`, false, `Network error: ${error.message}`);
      }
    }

    // Test max_tokens validation
    try {
      const { response, data } = await this.makeRequest({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: -1
      });

      this.recordResult(
        'Parameter Validation - Negative Max Tokens',
        !response.ok,
        !response.ok ? 'Correctly rejected negative max_tokens' : 'Should have rejected negative max_tokens'
      );
    } catch (error) {
      this.recordResult('Parameter Validation - Negative Max Tokens', false, `Network error: ${error.message}`);
    }
  }

  async testModelSpecificContracts() {
    log('\n🤖 Model-Specific Contract Tests', 'blue');
    log('=' .repeat(50), 'blue');

    const modelsToTest = ['gpt-4o-mini', 'gpt-4-turbo'];

    for (const model of modelsToTest) {
      try {
        const { response, data } = await this.makeRequest({
          model,
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 10
        });

        if (response.ok) {
          // Validate model name in response matches request
          const responseModel = data.model;
          const modelMatches = responseModel.startsWith(model) || responseModel === model;
          
          this.recordResult(
            `Model Contract - ${model}`,
            modelMatches,
            modelMatches ? `Response model: ${responseModel}` : `Expected ${model}, got ${responseModel}`
          );
        } else {
          this.recordResult(`Model Contract - ${model}`, false, `HTTP ${response.status}: ${data.error?.message}`);
        }
      } catch (error) {
        this.recordResult(`Model Contract - ${model}`, false, `Network error: ${error.message}`);
      }
    }
  }

  async testAppSpecificContracts() {
    log('\n📱 Application-Specific Contract Tests', 'blue');
    log('=' .repeat(50), 'blue');

    // Test the exact request format used by the app
    const appConfigs = [
      {
        name: 'Chat Conversation',
        config: {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a prompt engineering expert helping users create better LLM prompts.'
            },
            {
              role: 'user',
              content: 'Help me create a prompt for writing documentation.'
            }
          ],
          temperature: 0.3,
          max_tokens: 1000
        }
      },
      {
        name: 'Final Prompt Generation',
        config: {
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
        }
      }
    ];

    for (const { name, config } of appConfigs) {
      try {
        const { response, data } = await this.makeRequest(config);

        if (response.ok) {
          // Validate response has content
          const hasContent = data.choices?.[0]?.message?.content;
          const contentLength = hasContent ? data.choices[0].message.content.length : 0;
          
          this.recordResult(
            `App Contract - ${name}`,
            hasContent && contentLength > 10,
            hasContent ? `Generated ${contentLength} characters` : 'No content generated'
          );

          // Validate usage tracking
          const hasUsage = data.usage && data.usage.total_tokens > 0;
          this.recordResult(
            `App Contract - ${name} Usage`,
            hasUsage,
            hasUsage ? `Used ${data.usage.total_tokens} tokens` : 'Usage information missing'
          );
        } else {
          this.recordResult(`App Contract - ${name}`, false, `HTTP ${response.status}: ${data.error?.message}`);
        }
      } catch (error) {
        this.recordResult(`App Contract - ${name}`, false, `Network error: ${error.message}`);
      }
    }
  }

  generateReport() {
    const { total, passed, failed, violations } = this.results;
    const passRate = ((passed / total) * 100).toFixed(1);

    log('\n📊 CONTRACT TEST RESULTS SUMMARY', 'bold');
    log('=' .repeat(60), 'blue');

    log(`Total Contract Tests: ${total}`, 'white');
    log(`Passed: ${passed} (${passRate}%)`, 'green');
    log(`Failed: ${failed}`, 'red');

    if (violations.length > 0) {
      log('\n❌ Contract Violations:', 'red');
      violations.forEach((violation, index) => {
        log(`  ${index + 1}. ${violation.test}: ${violation.details}`, 'red');
      });
    }

    log('\n🎯 Contract Compliance Assessment:', 'bold');
    
    if (failed === 0) {
      log('✅ FULLY COMPLIANT: All API contracts are satisfied', 'green');
    } else if (passRate >= 90) {
      log('✅ MOSTLY COMPLIANT: Minor contract violations detected', 'green');
    } else if (passRate >= 80) {
      log('⚠️  PARTIALLY COMPLIANT: Some contract violations need attention', 'yellow');
    } else {
      log('❌ NON-COMPLIANT: Significant contract violations detected', 'red');
    }

    return {
      total,
      passed,
      failed,
      passRate: parseFloat(passRate),
      compliant: failed === 0,
      violations,
      summary: failed === 0 ? 'COMPLIANT' : passRate >= 80 ? 'MOSTLY_COMPLIANT' : 'NON_COMPLIANT'
    };
  }
}

async function runContractTests() {
  if (!OPENAI_API_KEY) {
    log('❌ OPENAI_API_KEY not found in environment', 'red');
    process.exit(1);
  }

  log('🚀 Starting OpenAI API Contract Testing Suite', 'bold');
  log(`Timestamp: ${new Date().toISOString()}`, 'cyan');

  const tester = new ContractTester();

  try {
    await tester.testBasicResponseContract();
    await tester.testStreamingResponseContract();
    await tester.testErrorResponseContract();
    await tester.testParameterValidation();
    await tester.testModelSpecificContracts();
    await tester.testAppSpecificContracts();
    
    return tester.generateReport();
  } catch (error) {
    log(`❌ Contract testing failed: ${error.message}`, 'red');
    throw error;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runContractTests()
    .then(report => {
      process.exit(report.compliant || report.summary === 'MOSTLY_COMPLIANT' ? 0 : 1);
    })
    .catch(error => {
      console.error('Contract testing suite failed:', error);
      process.exit(1);
    });
}

module.exports = { runContractTests, ContractTester };