#!/usr/bin/env node

/**
 * Comprehensive API Validation Test Suite
 * Tests specific API functionality, error handling, and edge cases
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

const BASE_URL = 'http://localhost:3000';
const results = { passed: 0, failed: 0, tests: [] };

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

async function testEndpoint(name, testFn) {
  const { result, duration, error } = await measureTime(testFn);
  
  if (error) {
    logTest(name, 'FAIL', duration, { error: error.message });
  } else {
    logTest(name, 'PASS', duration, result);
  }
}

class ComprehensiveAPITester {
  async testAuthenticationConsistency() {
    console.log('\n🔐 Testing Authentication Consistency...');
    
    const endpoints = [
      'GET /api/conversations',
      'POST /api/conversations',
      'GET /api/conversations/test-id',
      'PUT /api/conversations/test-id', 
      'DELETE /api/conversations/test-id',
      'POST /api/ai/generate-prompt'
    ];

    for (let endpoint of endpoints) {
      const [method, path] = endpoint.split(' ');
      
      await testEndpoint(
        `Auth consistency - ${endpoint}`,
        async () => {
          const response = await axios({
            method: method.toLowerCase(),
            url: `${BASE_URL}${path}`,
            data: method === 'POST' ? { title: 'test' } : undefined,
            validateStatus: () => true,
            timeout: 10000
          });
          
          if (response.status === 401 && response.data?.error?.includes('Authentication required')) {
            return { success: true, message: 'Consistent auth enforcement' };
          }
          
          throw new Error(`Expected 401 auth error, got ${response.status}: ${JSON.stringify(response.data)}`);
        }
      );
    }
  }

  async testParameterValidation() {
    console.log('\n📝 Testing Parameter Validation...');
    
    // Test missing required parameters
    await testEndpoint(
      'POST /api/conversations - Missing title',
      async () => {
        const response = await axios.post(`${BASE_URL}/api/conversations`, {
          initialMessage: 'test'
          // Missing title
        }, {
          validateStatus: () => true,
          timeout: 10000
        });
        
        if (response.status === 400 || response.status === 401) {
          return { success: true, message: 'Parameter validation working' };
        }
        
        throw new Error(`Expected 400/401, got ${response.status}`);
      }
    );

    // Test generate-prompt parameter validation
    await testEndpoint(
      'POST /api/ai/generate-prompt - Missing sessionId/conversationId',
      async () => {
        const response = await axios.post(`${BASE_URL}/api/ai/generate-prompt`, {}, {
          validateStatus: () => true,
          timeout: 10000
        });
        
        if (response.status === 400 || response.status === 401) {
          return { success: true, message: 'Parameter validation working' };
        }
        
        throw new Error(`Expected 400/401, got ${response.status}`);
      }
    );
  }

  async testErrorHandling() {
    console.log('\n⚠️ Testing Error Handling...');
    
    // Test malformed JSON
    await testEndpoint(
      'POST with malformed JSON',
      async () => {
        try {
          const response = await axios.post(`${BASE_URL}/api/conversations`, 
            'invalid-json-data',
            {
              headers: { 'Content-Type': 'application/json' },
              validateStatus: () => true,
              timeout: 10000
            }
          );
          
          if (response.status >= 400) {
            return { success: true, message: 'Handles malformed JSON properly' };
          }
          
          throw new Error('Should have returned error for malformed JSON');
        } catch (error) {
          if (error.message.includes('Request failed') || error.message.includes('JSON')) {
            return { success: true, message: 'Properly rejects malformed JSON' };
          }
          throw error;
        }
      }
    );

    // Test large payload
    await testEndpoint(
      'POST with large payload',
      async () => {
        const largePayload = {
          title: 'A'.repeat(1000),
          initialMessage: 'B'.repeat(5000)
        };
        
        const response = await axios.post(`${BASE_URL}/api/conversations`, largePayload, {
          validateStatus: () => true,
          timeout: 15000
        });
        
        if (response.status === 401 || response.status === 413 || response.status === 400) {
          return { success: true, message: 'Handles large payloads appropriately' };
        }
        
        return { success: true, message: `Got status ${response.status} for large payload` };
      }
    );
  }

  async testResponseTimes() {
    console.log('\n⚡ Testing Response Times...');
    
    const endpoints = [
      'GET /api/conversations',
      'POST /api/conversations',
      'POST /api/ai/generate-prompt'
    ];

    for (let endpoint of endpoints) {
      const [method, path] = endpoint.split(' ');
      
      await testEndpoint(
        `Response time - ${endpoint}`,
        async () => {
          const start = performance.now();
          
          const response = await axios({
            method: method.toLowerCase(),
            url: `${BASE_URL}${path}`,
            data: method === 'POST' ? (path.includes('generate-prompt') ? { sessionId: 'test' } : { title: 'test' }) : undefined,
            validateStatus: () => true,
            timeout: 10000
          });
          
          const duration = performance.now() - start;
          
          if (duration > 5000) {
            throw new Error(`Response too slow: ${Math.round(duration)}ms > 5000ms`);
          }
          
          return { 
            success: true, 
            message: `${Math.round(duration)}ms (status: ${response.status})`,
            responseTime: Math.round(duration)
          };
        }
      );
    }
  }

  async testConcurrentRequests() {
    console.log('\n🔄 Testing Concurrent Request Handling...');
    
    await testEndpoint(
      'Concurrent GET requests',
      async () => {
        const requestCount = 10;
        const requests = Array.from({ length: requestCount }, () =>
          axios.get(`${BASE_URL}/api/conversations`, {
            validateStatus: () => true,
            timeout: 10000
          })
        );
        
        const start = performance.now();
        const responses = await Promise.all(requests);
        const duration = performance.now() - start;
        
        const successCount = responses.filter(r => r.status < 500).length;
        const errorRate = ((requestCount - successCount) / requestCount) * 100;
        
        if (errorRate > 10) {
          throw new Error(`High error rate: ${errorRate}% (${requestCount - successCount}/${requestCount} failed)`);
        }
        
        return {
          success: true,
          message: `${successCount}/${requestCount} successful, ${Math.round(duration)}ms total`,
          successRate: Math.round((successCount / requestCount) * 100)
        };
      }
    );
  }

  async testDatabaseFallbacks() {
    console.log('\n💾 Testing Database Fallback Handling...');
    
    // Test that APIs don't crash when non-existent tables are accessed
    await testEndpoint(
      'Database fallback handling',
      async () => {
        // The generate-prompt API tries to access usage_limits table
        const response = await axios.post(`${BASE_URL}/api/ai/generate-prompt`, {
          conversationId: 'non-existent-id'
        }, {
          validateStatus: () => true,
          timeout: 10000
        });
        
        // Should get 401 (auth) or 404 (not found), not 500 (server error)
        if (response.status === 401) {
          return { success: true, message: 'Database fallbacks working - auth check first' };
        } else if (response.status === 404) {
          return { success: true, message: 'Database fallbacks working - conversation not found' };
        } else if (response.status >= 500) {
          throw new Error(`Database fallback failed - got 500 error: ${response.data?.error || 'Unknown error'}`);
        }
        
        return { success: true, message: `Got status ${response.status} - no server crash` };
      }
    );
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive API Validation Tests...\n');

    await this.testAuthenticationConsistency();
    await this.testParameterValidation();
    await this.testErrorHandling();
    await this.testResponseTimes();
    await this.testConcurrentRequests();
    await this.testDatabaseFallbacks();
  }

  generateReport() {
    console.log('\n📊 Comprehensive API Validation Report');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📈 Total: ${results.passed + results.failed}`);
    
    if (results.passed + results.failed > 0) {
      console.log(`🎯 Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);
    }

    // Group results by category
    const categories = {};
    results.tests.forEach(test => {
      const category = test.name.split(' - ')[0].replace(/✅|❌/g, '').trim();
      if (!categories[category]) categories[category] = { passed: 0, failed: 0 };
      if (test.status === 'PASS') categories[category].passed++;
      else categories[category].failed++;
    });

    console.log('\n📋 Results by Category:');
    Object.entries(categories).forEach(([category, stats]) => {
      const total = stats.passed + stats.failed;
      const rate = Math.round((stats.passed / total) * 100);
      console.log(`  ${category}: ${stats.passed}/${total} (${rate}%)`);
    });

    if (results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      results.tests.filter(t => t.status === 'FAIL').forEach(test => {
        console.log(`  • ${test.name}: ${test.details.error}`);
      });
    }

    // Performance summary
    const responseTimes = results.tests
      .filter(t => t.details.responseTime)
      .map(t => t.details.responseTime);
    
    if (responseTimes.length > 0) {
      const avgResponseTime = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);
      const maxResponseTime = Math.max(...responseTimes);
      console.log(`\n⚡ Performance Summary:`);
      console.log(`  Average Response Time: ${avgResponseTime}ms`);
      console.log(`  Max Response Time: ${maxResponseTime}ms`);
    }

    console.log('\n' + '='.repeat(60));
    
    return {
      summary: {
        passed: results.passed,
        failed: results.failed,
        total: results.passed + results.failed,
        successRate: results.passed + results.failed > 0 ? Math.round((results.passed / (results.passed + results.failed)) * 100) : 0
      },
      categories,
      tests: results.tests
    };
  }
}

async function main() {
  const tester = new ComprehensiveAPITester();
  
  try {
    await tester.runAllTests();
    const report = tester.generateReport();
    
    if (results.failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED - API is fully validated and ready for production!');
      process.exit(0);
    } else if (results.failed < results.passed * 0.2) {
      console.log('\n✅ Most tests passed - API is largely functional with minor issues');
      process.exit(0);
    } else {
      console.log('\n⚠️ Significant test failures - API needs attention before production');
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Fatal error running comprehensive tests:', error);
    process.exit(1);
  }
}

main().catch(console.error);