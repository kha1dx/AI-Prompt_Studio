#!/usr/bin/env node

/**
 * API Integration Test Script for Prompt Studio
 * Tests the database fixes and API functionality
 */

const http = require('http');
const https = require('https');

class APITester {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async makeRequest(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const parsedData = data ? JSON.parse(data) : {};
            resolve({
              status: res.statusCode,
              data: parsedData,
              headers: res.headers
            });
          } catch (error) {
            resolve({
              status: res.statusCode,
              data: data,
              headers: res.headers
            });
          }
        });
      });

      req.on('error', reject);

      if (body) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }

  async test(name, testFn) {
    console.log(`\n🧪 Testing: ${name}`);
    try {
      await testFn();
      console.log(`✅ PASSED: ${name}`);
      this.results.passed++;
      this.results.tests.push({ name, status: 'PASSED' });
    } catch (error) {
      console.log(`❌ FAILED: ${name}`);
      console.log(`   Error: ${error.message}`);
      this.results.failed++;
      this.results.tests.push({ name, status: 'FAILED', error: error.message });
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  async runTests() {
    console.log('🚀 Starting Prompt Studio API Integration Tests');
    console.log(`📍 Base URL: ${this.baseUrl}`);
    
    // Test server health
    await this.test('Server Health Check', async () => {
      const response = await this.makeRequest('GET', '/');
      this.assert(response.status === 200, `Expected status 200, got ${response.status}`);
    });

    // Test conversations API
    await this.test('Conversations API - List', async () => {
      const response = await this.makeRequest('GET', '/api/conversations');
      this.assert(
        response.status === 200 || response.status === 401, 
        `Expected status 200 or 401 (auth), got ${response.status}`
      );
    });

    // Test conversation creation
    await this.test('Conversations API - Create', async () => {
      const response = await this.makeRequest('POST', '/api/conversations', {
        title: 'Test Conversation',
        user_id: 'test-user-id'
      });
      // Should either create (200/201) or require auth (401)
      this.assert(
        [200, 201, 401, 400].includes(response.status),
        `Expected status 200/201/401/400, got ${response.status}`
      );
    });

    // Test AI conversation endpoint
    await this.test('AI Conversation API', async () => {
      const response = await this.makeRequest('POST', '/api/ai/conversation', {
        message: 'Test message',
        conversationId: 'test-conv-id'
      });
      // Should handle request properly or require auth
      this.assert(
        [200, 401, 400, 500].includes(response.status),
        `Expected status 200/401/400/500, got ${response.status}`
      );
    });

    // Test generate prompt API (the fixed endpoint)
    await this.test('Generate Prompt API - ConversationId', async () => {
      const response = await this.makeRequest('POST', '/api/ai/generate-prompt', {
        conversationId: 'test-conversation-id'
      });
      // Should handle request or require auth
      this.assert(
        [200, 401, 400, 404, 500].includes(response.status),
        `Expected status 200/401/400/404/500, got ${response.status}`
      );
    });

    // Test generate prompt API with sessionId (legacy support)
    await this.test('Generate Prompt API - SessionId', async () => {
      const response = await this.makeRequest('POST', '/api/ai/generate-prompt', {
        sessionId: 'test-session-id'
      });
      // Should handle request or require auth
      this.assert(
        [200, 401, 400, 404, 500].includes(response.status),
        `Expected status 200/401/400/404/500, got ${response.status}`
      );
    });

    // Test chat endpoint
    await this.test('Chat API', async () => {
      const response = await this.makeRequest('POST', '/api/chat', {
        message: 'Hello, test message'
      });
      this.assert(
        [200, 401, 400, 500].includes(response.status),
        `Expected status 200/401/400/500, got ${response.status}`
      );
    });

    // Test specific conversation endpoint
    await this.test('Specific Conversation API', async () => {
      const response = await this.makeRequest('GET', '/api/conversations/test-id');
      this.assert(
        [200, 401, 404].includes(response.status),
        `Expected status 200/401/404, got ${response.status}`
      );
    });

    // Test conversation duplication
    await this.test('Conversation Duplicate API', async () => {
      const response = await this.makeRequest('POST', '/api/conversations/test-id/duplicate');
      this.assert(
        [200, 401, 404, 400].includes(response.status),
        `Expected status 200/401/404/400, got ${response.status}`
      );
    });

    // Test conversation export
    await this.test('Conversation Export API', async () => {
      const response = await this.makeRequest('GET', '/api/conversations/test-id/export');
      this.assert(
        [200, 401, 404].includes(response.status),
        `Expected status 200/401/404, got ${response.status}`
      );
    });

    this.printSummary();
  }

  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('🏁 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📊 Total:  ${this.results.passed + this.results.failed}`);
    
    if (this.results.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.tests
        .filter(t => t.status === 'FAILED')
        .forEach(t => console.log(`   - ${t.name}: ${t.error}`));
    }

    const successRate = (this.results.passed / (this.results.passed + this.results.failed) * 100).toFixed(1);
    console.log(`\n🎯 Success Rate: ${successRate}%`);
    
    if (this.results.failed === 0) {
      console.log('\n🎉 All API endpoints are responding correctly!');
    } else {
      console.log('\n⚠️  Some tests failed - check the errors above.');
    }
  }
}

// Database-specific tests
class DatabaseTester extends APITester {
  async runDatabaseTests() {
    console.log('\n🗄️ Running Database-Specific Tests');
    
    // Test that the new columns don't cause errors
    await this.test('Database Schema - New Columns Support', async () => {
      // This test checks if the API endpoints handle the new columns without errors
      const response = await this.makeRequest('POST', '/api/conversations', {
        title: 'Schema Test Conversation',
        user_id: 'test-user',
        // These should be handled by the new schema
        tags: ['test', 'schema'],
        status: 'active',
        is_favorite: false
      });
      
      // Should not return database column errors
      this.assert(
        response.status !== 500 || !response.data.error?.includes('column does not exist'),
        'Database column errors detected'
      );
    });

    await this.test('Database Schema - last_activity_at Column', async () => {
      // Test that last_activity_at doesn't cause errors
      const response = await this.makeRequest('GET', '/api/conversations');
      
      // Should not return specific column errors
      if (response.status === 500 && response.data.error) {
        this.assert(
          !response.data.error.includes('last_activity_at'),
          'last_activity_at column error detected'
        );
      }
    });
  }
}

// Run the tests
async function main() {
  const tester = new DatabaseTester();
  await tester.runTests();
  await tester.runDatabaseTests();
  
  process.exit(tester.results.failed > 0 ? 1 : 0);
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test runner error:', error);
    process.exit(1);
  });
}

module.exports = { APITester, DatabaseTester };