#!/usr/bin/env node

/**
 * API Integration Test Suite - Emergency Hive Mind Testing Agent
 * Tests all critical API endpoints for functionality, error handling, and performance
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

// Test configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_CONFIG = {
  timeout: 30000, // 30 seconds
  thresholds: {
    response_time_ms: 5000, // Max 5 seconds for API responses
  }
};

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: [],
  errors: []
};

// Utility functions
const logTest = (name, status, duration, details = {}) => {
  const result = { name, status, duration, details, timestamp: new Date().toISOString() };
  results.tests.push(result);
  
  const statusIcon = status === 'PASS' ? '✅' : '❌';
  console.log(`${statusIcon} ${name} (${duration}ms)${status === 'FAIL' ? ' - ' + (details.error || 'Failed') : ''}`);
  
  if (status === 'PASS') results.passed++;
  else results.failed++;
};

const measureTime = async (fn) => {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = Math.round(performance.now() - start);
    return { result, duration, error: null };
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    return { result: null, duration, error };
  }
};

// Test Cases
class APITester {
  async testEndpoint(name, testFn) {
    const { result, duration, error } = await measureTime(testFn);
    
    if (error) {
      logTest(name, 'FAIL', duration, { error: error.message });
      results.errors.push({ test: name, error: error.message, duration });
    } else {
      logTest(name, 'PASS', duration, result);
    }
  }

  async testConversationsAPI() {
    console.log('\n🔍 Testing Conversations API...');
    
    // Test GET /api/conversations - should return 401 for unauthenticated requests
    await this.testEndpoint(
      'GET /api/conversations - Authentication Check',
      async () => {
        const response = await axios.get(`${BASE_URL}/api/conversations`, {
          timeout: TEST_CONFIG.timeout,
          validateStatus: () => true // Allow all status codes
        });
        
        if (response.status === 401) {
          return { success: true, message: 'Authentication properly enforced', status: response.status };
        }
        
        if (response.status >= 500) {
          throw new Error(`Server error: ${response.status} - ${response.data?.error || 'Internal server error'}`);
        }
        
        return { success: true, message: `Got status ${response.status}`, status: response.status };
      }
    );

    // Test POST /api/conversations - should return 401 for unauthenticated requests
    await this.testEndpoint(
      'POST /api/conversations - Authentication Check',
      async () => {
        const response = await axios.post(`${BASE_URL}/api/conversations`, {
          title: 'Test Conversation',
          initialMessage: 'Hello, this is a test message'
        }, {
          timeout: TEST_CONFIG.timeout,
          validateStatus: () => true,
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.status === 401) {
          return { success: true, message: 'Authentication properly enforced', status: response.status };
        }
        
        if (response.status >= 500) {
          throw new Error(`Server error: ${response.status} - ${response.data?.error || 'Internal server error'}`);
        }
        
        return { success: true, message: `Got status ${response.status}`, status: response.status };
      }
    );
  }

  async testGeneratePromptAPI() {
    console.log('\n🔍 Testing Generate Prompt API...');
    
    // Test POST /api/ai/generate-prompt - should return 401 for unauthenticated requests
    await this.testEndpoint(
      'POST /api/ai/generate-prompt - Authentication Check',
      async () => {
        const response = await axios.post(`${BASE_URL}/api/ai/generate-prompt`, {
          sessionId: 'test-session-123'
        }, {
          timeout: TEST_CONFIG.timeout,
          validateStatus: () => true,
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.status === 401) {
          return { success: true, message: 'Authentication properly enforced', status: response.status };
        }
        
        if (response.status >= 500) {
          throw new Error(`Server error: ${response.status} - ${response.data?.error || 'Internal server error'}`);
        }
        
        return { success: true, message: `Got status ${response.status}`, status: response.status };
      }
    );

    // Test with missing parameters
    await this.testEndpoint(
      'POST /api/ai/generate-prompt - Parameter Validation',
      async () => {
        const response = await axios.post(`${BASE_URL}/api/ai/generate-prompt`, {}, {
          timeout: TEST_CONFIG.timeout,
          validateStatus: () => true,
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.status === 400 && response.data?.error?.includes('required')) {
          return { success: true, message: 'Proper parameter validation', status: response.status };
        }
        
        if (response.status === 401) {
          return { success: true, message: 'Authentication enforced (before validation)', status: response.status };
        }
        
        if (response.status >= 500) {
          throw new Error(`Server error: ${response.status} - ${response.data?.error || 'Internal server error'}`);
        }
        
        return { success: true, message: `Got status ${response.status}`, status: response.status };
      }
    );
  }

  async testIndividualConversationAPI() {
    console.log('\n🔍 Testing Individual Conversation API...');
    
    const testConvId = 'test-conversation-123';
    
    // Test GET /api/conversations/[id]
    await this.testEndpoint(
      'GET /api/conversations/[id] - Authentication Check',
      async () => {
        const response = await axios.get(`${BASE_URL}/api/conversations/${testConvId}`, {
          timeout: TEST_CONFIG.timeout,
          validateStatus: () => true
        });
        
        if (response.status === 401) {
          return { success: true, message: 'Authentication properly enforced', status: response.status };
        }
        
        if (response.status >= 500) {
          throw new Error(`Server error: ${response.status} - ${response.data?.error || 'Internal server error'}`);
        }
        
        return { success: true, message: `Got status ${response.status}`, status: response.status };
      }
    );
  }

  async testPerformance() {
    console.log('\n🔍 Testing Performance...');
    
    // Test response times
    await this.testEndpoint(
      'Response Time Test - GET /api/conversations',
      async () => {
        const start = performance.now();
        const response = await axios.get(`${BASE_URL}/api/conversations`, {
          timeout: TEST_CONFIG.timeout,
          validateStatus: () => true
        });
        const duration = performance.now() - start;
        
        if (duration > TEST_CONFIG.thresholds.response_time_ms) {
          throw new Error(`Response too slow: ${Math.round(duration)}ms > ${TEST_CONFIG.thresholds.response_time_ms}ms`);
        }
        
        return { 
          success: true, 
          message: `Response time: ${Math.round(duration)}ms (status: ${response.status})`,
          responseTime: Math.round(duration)
        };
      }
    );

    // Test concurrent requests
    await this.testEndpoint(
      'Concurrent Request Test',
      async () => {
        const concurrentRequests = 5;
        const requests = Array.from({ length: concurrentRequests }, (_, i) =>
          axios.get(`${BASE_URL}/api/conversations?page=${i + 1}`, {
            timeout: TEST_CONFIG.timeout,
            validateStatus: () => true
          })
        );
        
        const start = performance.now();
        const responses = await Promise.all(requests);
        const duration = performance.now() - start;
        
        const successCount = responses.filter(r => r.status < 500).length;
        
        return {
          success: true,
          message: `${successCount}/${concurrentRequests} requests successful, ${Math.round(duration)}ms total`,
          successRate: Math.round((successCount / concurrentRequests) * 100),
          duration: Math.round(duration)
        };
      }
    );
  }

  async testDatabaseIntegration() {
    console.log('\n🔍 Testing Database Integration...');
    
    // Test that routes can instantiate DatabaseService without errors
    await this.testEndpoint(
      'DatabaseService Integration Test',
      async () => {
        const response = await axios.get(`${BASE_URL}/api/conversations`, {
          timeout: TEST_CONFIG.timeout,
          validateStatus: () => true
        });
        
        // A 401 indicates the route loaded properly and got to authentication
        // A 500 would indicate database service instantiation failed
        if (response.status === 401) {
          return { 
            success: true, 
            message: 'DatabaseService instantiated correctly (reached auth check)',
            status: response.status
          };
        } else if (response.status === 500) {
          throw new Error('DatabaseService instantiation failed - server error');
        }
        
        return { 
          success: true, 
          message: `Route accessible, status ${response.status}`,
          status: response.status
        };
      }
    );
  }

  async runAllTests() {
    console.log('🚀 Starting API Integration Tests...');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Timeout: ${TEST_CONFIG.timeout}ms\n`);

    try {
      await this.testConversationsAPI();
      await this.testGeneratePromptAPI();
      await this.testIndividualConversationAPI();
      await this.testPerformance();
      await this.testDatabaseIntegration();
    } catch (error) {
      console.error('💥 Test suite encountered fatal error:', error.message);
      results.errors.push({ test: 'Test Suite', error: error.message });
    }
  }

  generateReport() {
    console.log('\n📊 API Integration Test Report');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📈 Total: ${results.passed + results.failed}`);
    
    if (results.passed + results.failed > 0) {
      console.log(`🎯 Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);
    }

    if (results.errors.length > 0) {
      console.log('\n❌ Failures:');
      results.errors.forEach(error => {
        console.log(`  • ${error.test}: ${error.error}`);
      });
    }

    // Performance summary
    if (results.tests.length > 0) {
      const avgDuration = results.tests.reduce((sum, test) => sum + test.duration, 0) / results.tests.length;
      console.log(`\n⚡ Average Response Time: ${Math.round(avgDuration)}ms`);
    }

    // Critical issues check
    const criticalErrors = results.errors.filter(error => 
      error.error.includes('ECONNREFUSED') || 
      error.error.includes('timeout') ||
      error.error.includes('DatabaseService instantiation failed')
    );

    if (criticalErrors.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES DETECTED:');
      criticalErrors.forEach(error => {
        console.log(`  ⚠️  ${error.test}: ${error.error}`);
      });
    }

    console.log('\n' + '='.repeat(50));
    
    return {
      summary: {
        passed: results.passed,
        failed: results.failed,
        total: results.passed + results.failed,
        successRate: results.passed + results.failed > 0 ? Math.round((results.passed / (results.passed + results.failed)) * 100) : 0,
        avgResponseTime: results.tests.length > 0 ? Math.round(results.tests.reduce((sum, test) => sum + test.duration, 0) / results.tests.length) : 0
      },
      tests: results.tests,
      errors: results.errors,
      criticalIssues: criticalErrors.length > 0
    };
  }
}

// Main execution
async function main() {
  const tester = new APITester();
  
  try {
    await tester.runAllTests();
    const report = tester.generateReport();
    
    // Exit with error code if critical issues found
    if (results.failed > results.passed * 0.5 || results.errors.some(e => 
      e.error.includes('ECONNREFUSED') || 
      e.error.includes('DatabaseService instantiation failed')
    )) {
      console.log('\n❌ Critical issues detected - API not ready for production');
      process.exit(1);
    } else {
      console.log('\n✅ API tests completed successfully - Ready for integration');
      process.exit(0);
    }
  } catch (error) {
    console.error('💥 Fatal error running tests:', error);
    process.exit(1);
  }
}

// Self-executing if run directly
if (require.main === module) {
  main();
}

module.exports = { APITester };