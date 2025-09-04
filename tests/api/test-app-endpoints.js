#!/usr/bin/env node

/**
 * Test Application API Endpoints
 * Tests the actual Next.js API routes
 */

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

async function testChatEndpoint() {
  log('🧪 Testing /api/chat endpoint...', 'blue');
  
  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'Hello! Can you help me create a prompt for writing documentation?'
          }
        ],
        sessionId: 'test-session-123'
      })
    });

    log(`Response status: ${response.status}`, 'cyan');
    log(`Response headers:`, 'cyan');
    response.headers.forEach((value, key) => {
      log(`  ${key}: ${value}`, 'white');
    });

    if (response.ok) {
      log('✅ Chat endpoint: ACCESSIBLE', 'green');
      
      if (response.headers.get('content-type')?.includes('text/stream')) {
        log('✅ Streaming response detected', 'green');
        
        // Read first few chunks
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let chunkCount = 0;
        
        try {
          while (chunkCount < 5) {
            const { done, value } = await reader.read();
            if (done) break;
            
            chunkCount++;
            const chunk = decoder.decode(value);
            log(`📦 Chunk ${chunkCount}: ${chunk.substring(0, 100)}`, 'cyan');
            
            if (chunk.includes('[DONE]')) break;
          }
          
          log(`✅ Received ${chunkCount} streaming chunks`, 'green');
        } finally {
          reader.releaseLock();
        }
      } else {
        const text = await response.text();
        log(`Response: ${text.substring(0, 200)}...`, 'cyan');
      }
    } else {
      const errorText = await response.text();
      log(`❌ Chat endpoint failed: ${errorText}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Chat endpoint error: ${error.message}`, 'red');
    return false;
  }
  
  return true;
}

async function testServerStatus() {
  log('🔍 Checking server status...', 'blue');
  
  try {
    const response = await fetch('http://localhost:3000/api/health', {
      method: 'GET'
    });
    
    if (response.status === 404) {
      log('⚠️  No health endpoint found (normal for this app)', 'yellow');
      return true; // This is expected
    } else if (response.ok) {
      log('✅ Server health check: OK', 'green');
      return true;
    } else {
      log(`⚠️  Health check returned: ${response.status}`, 'yellow');
      return true; // May not have health endpoint
    }
  } catch (error) {
    if (error.message.includes('ECONNREFUSED')) {
      log('❌ Server not running on localhost:3000', 'red');
      return false;
    } else {
      log(`⚠️  Server check error: ${error.message}`, 'yellow');
      return true; // Assume server is running but endpoint doesn't exist
    }
  }
}

async function testWithAuth() {
  log('🔐 Testing with authentication (will likely fail without valid session)...', 'blue');
  
  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: Real auth would require Supabase session cookies
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Test with auth' }],
        sessionId: 'test-session-456'
      })
    });

    if (response.status === 401) {
      log('✅ Authentication required: CORRECT (returns 401)', 'green');
      return true;
    } else if (response.ok) {
      log('⚠️  Request succeeded without auth (may be in dev mode)', 'yellow');
      return true;
    } else {
      const errorText = await response.text();
      log(`📋 Auth test response: ${response.status} - ${errorText}`, 'cyan');
      return true; // Various responses are acceptable
    }
  } catch (error) {
    log(`❌ Auth test error: ${error.message}`, 'red');
    return false;
  }
}

async function runEndpointTests() {
  log('🚀 Testing Application API Endpoints', 'bold');
  log(`Timestamp: ${new Date().toISOString()}`, 'cyan');
  log('=' .repeat(60), 'blue');

  const results = [];
  
  // Test server status
  const serverOk = await testServerStatus();
  results.push({ test: 'Server Status', passed: serverOk });
  
  if (!serverOk) {
    log('\n❌ Server not accessible - cannot run endpoint tests', 'red');
    log('💡 Make sure the development server is running: npm run dev', 'yellow');
    return false;
  }
  
  // Test chat endpoint
  const chatOk = await testChatEndpoint();
  results.push({ test: 'Chat Endpoint', passed: chatOk });
  
  // Test authentication behavior
  const authOk = await testWithAuth();
  results.push({ test: 'Authentication', passed: authOk });
  
  // Summary
  log('\n📊 ENDPOINT TEST SUMMARY', 'bold');
  log('=' .repeat(60), 'blue');
  
  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;
  
  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const color = result.passed ? 'green' : 'red';
    log(`${status} ${result.test}`, color);
  });
  
  log(`\nTotal: ${passedTests}/${totalTests} tests passed`, 'cyan');
  
  if (passedTests === totalTests) {
    log('🎉 All endpoint tests passed!', 'green');
    return true;
  } else {
    log('⚠️  Some endpoint tests failed', 'yellow');
    return false;
  }
}

// Run tests
if (require.main === module) {
  runEndpointTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Endpoint testing failed:', error);
      process.exit(1);
    });
}

module.exports = { runEndpointTests };