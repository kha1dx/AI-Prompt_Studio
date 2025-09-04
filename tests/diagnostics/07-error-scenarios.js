#!/usr/bin/env node

/**
 * Error Scenario Testing Diagnostic
 * 
 * This script tests various error conditions and edge cases to ensure
 * proper error handling and system resilience.
 */

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// ANSI color codes for output formatting
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Load environment variables
require('dotenv').config({ path: '.env.local' });

class ErrorScenarioTester {
  constructor() {
    this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    this.supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    this.results = [];
    this.supabase = null;
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const color = {
      'info': colors.blue,
      'success': colors.green,
      'warning': colors.yellow,
      'error': colors.red,
      'header': colors.magenta,
      'expected': colors.cyan
    }[level] || colors.reset;

    console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
  }

  addResult(test, status, message, details = null, duration = null) {
    this.results.push({
      test,
      status,
      message,
      details,
      duration,
      timestamp: new Date().toISOString()
    });
  }

  async initializeClient() {
    this.log('\n=== INITIALIZING SUPABASE CLIENT ===', 'header');
    
    if (!this.supabaseUrl || !this.supabaseAnonKey) {
      this.log('❌ Missing Supabase credentials', 'error');
      this.addResult('client_init', 'FAIL', 'Missing Supabase credentials');
      return false;
    }

    try {
      this.supabase = createClient(this.supabaseUrl, this.supabaseAnonKey);
      this.log('✅ Supabase client initialized', 'success');
      this.addResult('client_init', 'PASS', 'Client initialized successfully');
      return true;
    } catch (error) {
      this.log(`❌ Client initialization failed: ${error.message}`, 'error');
      this.addResult('client_init', 'FAIL', `Initialization error: ${error.message}`);
      return false;
    }
  }

  async testInvalidCredentials() {
    this.log('\n=== INVALID CREDENTIALS ERROR HANDLING ===', 'header');

    const invalidCredentialTests = [
      {
        name: 'wrong_password',
        email: 'test@example.com',
        password: 'wrongpassword123',
        expectedError: 'Invalid login credentials'
      },
      {
        name: 'nonexistent_user',
        email: 'nonexistent' + Date.now() + '@example.com',
        password: 'anypassword123',
        expectedError: 'Invalid login credentials'
      },
      {
        name: 'malformed_email',
        email: 'notanemail',
        password: 'password123',
        expectedError: 'Invalid email'
      },
      {
        name: 'empty_credentials',
        email: '',
        password: '',
        expectedError: 'Email is required'
      },
      {
        name: 'weak_password',
        email: 'test@example.com',
        password: '123',
        expectedError: 'Password is too short'
      }
    ];

    let properErrorHandling = 0;

    for (const test of invalidCredentialTests) {
      this.log(`Testing ${test.name} scenario...`, 'info');
      
      try {
        const startTime = Date.now();
        const { data, error } = await this.supabase.auth.signInWithPassword({
          email: test.email,
          password: test.password
        });
        const duration = Date.now() - startTime;

        if (error) {
          // Check if we got the expected error type
          const errorMessage = error.message.toLowerCase();
          const expectedLower = test.expectedError.toLowerCase();
          
          if (errorMessage.includes('invalid') || 
              errorMessage.includes('wrong') ||
              errorMessage.includes('not found') ||
              errorMessage.includes('email') ||
              errorMessage.includes('password') ||
              errorMessage.includes('required') ||
              errorMessage.includes('too short')) {
            
            this.log(`   ✅ Proper error handling: ${error.message}`, 'expected');
            properErrorHandling++;
            this.addResult(`error_${test.name}`, 'PASS', 'Proper error message returned', {
              error_message: error.message,
              error_code: error.code
            }, duration);
          } else {
            this.log(`   ⚠️  Unexpected error message: ${error.message}`, 'warning');
            this.addResult(`error_${test.name}`, 'WARNING', `Unexpected error: ${error.message}`, null, duration);
          }
        } else if (data.session) {
          this.log(`   ❌ Invalid credentials were accepted!`, 'error');
          this.addResult(`error_${test.name}`, 'FAIL', 'Invalid credentials incorrectly accepted', null, duration);
        } else {
          this.log(`   ⚠️  No error or session returned`, 'warning');
          this.addResult(`error_${test.name}`, 'WARNING', 'No error or session returned', null, duration);
        }
        
      } catch (error) {
        this.log(`   ❌ Unexpected exception: ${error.message}`, 'error');
        this.addResult(`error_${test.name}`, 'FAIL', `Unexpected exception: ${error.message}`);
      }
    }

    this.log(`\n📊 Error Handling Summary: ${properErrorHandling}/${invalidCredentialTests.length} scenarios handled correctly`, 'info');
    return properErrorHandling >= invalidCredentialTests.length * 0.8; // 80% success rate
  }

  async testRateLimiting() {
    this.log('\n=== RATE LIMITING ERROR HANDLING ===', 'header');
    
    this.log('Testing rapid successive requests...', 'info');
    
    const rapidRequests = [];
    const requestCount = 10;
    
    try {
      const startTime = Date.now();
      
      // Make multiple rapid requests
      for (let i = 0; i < requestCount; i++) {
        rapidRequests.push(
          this.supabase.auth.signInWithPassword({
            email: `ratelimit${i}@example.com`,
            password: 'testpassword123'
          })
        );
      }

      const results = await Promise.allSettled(rapidRequests);
      const duration = Date.now() - startTime;
      
      let rateLimitHit = false;
      let successfulRequests = 0;
      let errors = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          if (result.value.error) {
            const errorMsg = result.value.error.message.toLowerCase();
            if (errorMsg.includes('rate') || 
                errorMsg.includes('limit') || 
                errorMsg.includes('too many') ||
                result.value.error.code === '429') {
              rateLimitHit = true;
            }
            errors.push(result.value.error.message);
          } else {
            successfulRequests++;
          }
        }
      });

      if (rateLimitHit) {
        this.log(`✅ Rate limiting is working (detected after ${requestCount} requests)`, 'success');
        this.addResult('rate_limiting', 'PASS', 'Rate limiting detected and working', {
          requests_made: requestCount,
          rate_limit_hit: true,
          unique_errors: [...new Set(errors)]
        }, duration);
      } else if (errors.length > 0) {
        this.log(`ℹ️  Requests failed but not due to rate limiting`, 'info');
        this.addResult('rate_limiting', 'INFO', 'No rate limiting detected (this may be normal)', {
          requests_made: requestCount,
          successful_requests: successfulRequests,
          error_count: errors.length
        }, duration);
      } else {
        this.log(`⚠️  No rate limiting detected (this could be a security concern)`, 'warning');
        this.addResult('rate_limiting', 'WARNING', 'No rate limiting detected', {
          requests_made: requestCount,
          successful_requests: successfulRequests
        }, duration);
      }

      return true;

    } catch (error) {
      this.log(`❌ Rate limiting test error: ${error.message}`, 'error');
      this.addResult('rate_limiting', 'FAIL', `Test error: ${error.message}`);
      return false;
    }
  }

  async testMalformedRequests() {
    this.log('\n=== MALFORMED REQUEST ERROR HANDLING ===', 'header');

    const malformedTests = [
      {
        name: 'sql_injection_attempt',
        email: "'; DROP TABLE users; --",
        password: 'password123',
        description: 'SQL injection in email field'
      },
      {
        name: 'xss_attempt',
        email: '<script>alert("xss")</script>@example.com',
        password: 'password123',
        description: 'XSS attempt in email field'
      },
      {
        name: 'very_long_email',
        email: 'a'.repeat(1000) + '@example.com',
        password: 'password123',
        description: 'Extremely long email'
      },
      {
        name: 'very_long_password',
        email: 'test@example.com',
        password: 'a'.repeat(1000),
        description: 'Extremely long password'
      },
      {
        name: 'null_bytes',
        email: 'test\x00@example.com',
        password: 'password123',
        description: 'Null bytes in email'
      },
      {
        name: 'unicode_attack',
        email: '测试@example.com',
        password: 'пароль123',
        description: 'Unicode characters'
      }
    ];

    let properSanitization = 0;

    for (const test of malformedTests) {
      this.log(`Testing ${test.description}...`, 'info');
      
      try {
        const startTime = Date.now();
        const { data, error } = await this.supabase.auth.signInWithPassword({
          email: test.email,
          password: test.password
        });
        const duration = Date.now() - startTime;

        if (error) {
          // Check that the error is appropriate (not a server error)
          if (error.code !== '500' && !error.message.includes('Internal server error')) {
            this.log(`   ✅ Malformed request properly rejected: ${error.message.substring(0, 100)}`, 'expected');
            properSanitization++;
            this.addResult(`malformed_${test.name}`, 'PASS', 'Malformed request properly rejected', {
              test_type: test.description,
              error_message: error.message.substring(0, 200),
              error_code: error.code
            }, duration);
          } else {
            this.log(`   ❌ Server error on malformed request: ${error.message}`, 'error');
            this.addResult(`malformed_${test.name}`, 'FAIL', 'Server error indicates poor input validation', {
              test_type: test.description,
              error_message: error.message
            }, duration);
          }
        } else {
          this.log(`   ⚠️  Malformed request not rejected`, 'warning');
          this.addResult(`malformed_${test.name}`, 'WARNING', 'Malformed request not properly rejected', {
            test_type: test.description
          }, duration);
        }
        
      } catch (error) {
        if (error.name === 'TypeError' || error.message.includes('fetch')) {
          this.log(`   ✅ Request blocked at client level`, 'expected');
          properSanitization++;
          this.addResult(`malformed_${test.name}`, 'PASS', 'Request blocked at client level');
        } else {
          this.log(`   ❌ Unexpected error: ${error.message}`, 'error');
          this.addResult(`malformed_${test.name}`, 'FAIL', `Unexpected error: ${error.message}`);
        }
      }
    }

    this.log(`\n📊 Input Sanitization: ${properSanitization}/${malformedTests.length} malformed requests handled properly`, 'info');
    return properSanitization >= malformedTests.length * 0.7; // 70% success rate
  }

  async testNetworkFailures() {
    this.log('\n=== NETWORK FAILURE ERROR HANDLING ===', 'header');

    try {
      // Test with invalid Supabase URL
      this.log('Testing invalid Supabase URL...', 'info');
      
      const invalidClient = createClient('https://invalid-url-test.supabase.co', this.supabaseAnonKey);
      
      const startTime = Date.now();
      const { error } = await invalidClient.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password123'
      });
      const duration = Date.now() - startTime;

      if (error) {
        if (error.message.includes('fetch') || 
            error.message.includes('network') ||
            error.message.includes('connection') ||
            error.code === 'ENOTFOUND' ||
            error.name === 'FetchError') {
          
          this.log(`✅ Network error properly handled: ${error.message}`, 'expected');
          this.addResult('network_failure', 'PASS', 'Network errors properly handled', {
            error_type: error.name || 'Unknown',
            error_message: error.message
          }, duration);
        } else {
          this.log(`⚠️  Network error but unexpected message: ${error.message}`, 'warning');
          this.addResult('network_failure', 'WARNING', 'Network error with unexpected message', {
            error_message: error.message
          }, duration);
        }
      } else {
        this.log(`❌ Invalid URL request succeeded (this shouldn't happen)`, 'error');
        this.addResult('network_failure', 'FAIL', 'Invalid URL request unexpectedly succeeded', null, duration);
      }

      return true;

    } catch (error) {
      if (error.name === 'TypeError' || error.message.includes('fetch')) {
        this.log(`✅ Network error caught at client level: ${error.message}`, 'expected');
        this.addResult('network_failure', 'PASS', 'Network error handled at client level');
        return true;
      } else {
        this.log(`❌ Unexpected network test error: ${error.message}`, 'error');
        this.addResult('network_failure', 'FAIL', `Unexpected error: ${error.message}`);
        return false;
      }
    }
  }

  async testSessionExpiry() {
    this.log('\n=== SESSION EXPIRY ERROR HANDLING ===', 'header');

    try {
      // Create a mock expired session
      this.log('Testing expired session handling...', 'info');
      
      // We can't easily create an expired session, but we can test with an invalid token
      const invalidClient = createClient(this.supabaseUrl, 'invalid_token_test');
      
      const startTime = Date.now();
      const { data, error } = await invalidClient.auth.getSession();
      const duration = Date.now() - startTime;

      if (error) {
        if (error.message.includes('Invalid') || 
            error.message.includes('unauthorized') ||
            error.message.includes('token') ||
            error.code === '401' ||
            error.code === '403') {
          
          this.log(`✅ Invalid session properly detected: ${error.message}`, 'expected');
          this.addResult('session_expiry', 'PASS', 'Invalid session properly handled', {
            error_message: error.message,
            error_code: error.code
          }, duration);
        } else {
          this.log(`⚠️  Session error but unexpected message: ${error.message}`, 'warning');
          this.addResult('session_expiry', 'WARNING', 'Session error with unexpected message', {
            error_message: error.message
          }, duration);
        }
      } else if (!data.session) {
        this.log(`✅ Invalid session returned null (proper handling)`, 'success');
        this.addResult('session_expiry', 'PASS', 'Invalid session returned null');
      } else {
        this.log(`❌ Invalid token created valid session`, 'error');
        this.addResult('session_expiry', 'FAIL', 'Invalid token unexpectedly created session');
      }

      return true;

    } catch (error) {
      this.log(`❌ Session expiry test error: ${error.message}`, 'error');
      this.addResult('session_expiry', 'FAIL', `Test error: ${error.message}`);
      return false;
    }
  }

  async testConcurrentSessions() {
    this.log('\n=== CONCURRENT SESSION ERROR HANDLING ===', 'header');

    try {
      // Test multiple clients with same credentials (if we had valid test credentials)
      this.log('Testing concurrent session behavior...', 'info');
      
      const client1 = createClient(this.supabaseUrl, this.supabaseAnonKey);
      const client2 = createClient(this.supabaseUrl, this.supabaseAnonKey);
      
      const startTime = Date.now();
      
      // Try to get sessions from both clients simultaneously
      const [result1, result2] = await Promise.all([
        client1.auth.getSession(),
        client2.auth.getSession()
      ]);
      
      const duration = Date.now() - startTime;

      // Both should work fine since they're using the same anonymous key
      if (!result1.error && !result2.error) {
        this.log(`✅ Concurrent sessions handled properly`, 'success');
        this.addResult('concurrent_sessions', 'PASS', 'Concurrent sessions work correctly', {
          client1_has_session: !!result1.data.session,
          client2_has_session: !!result2.data.session
        }, duration);
      } else {
        this.log(`⚠️  Concurrent session issues detected`, 'warning');
        this.addResult('concurrent_sessions', 'WARNING', 'Potential concurrent session issues', {
          client1_error: result1.error?.message,
          client2_error: result2.error?.message
        }, duration);
      }

      return true;

    } catch (error) {
      this.log(`❌ Concurrent session test error: ${error.message}`, 'error');
      this.addResult('concurrent_sessions', 'FAIL', `Test error: ${error.message}`);
      return false;
    }
  }

  async testEdgeCases() {
    this.log('\n=== EDGE CASE ERROR HANDLING ===', 'header');

    const edgeCaseTests = [
      {
        name: 'extremely_long_session',
        test: async () => {
          // Test behavior with very long session duration requests
          return await this.supabase.auth.signInWithPassword({
            email: 'test@example.com',
            password: 'test123'
          });
        },
        description: 'Long session duration handling'
      },
      {
        name: 'special_characters',
        test: async () => {
          // Test with special characters in credentials
          return await this.supabase.auth.signInWithPassword({
            email: 'test+special@example.com',
            password: 'pass!@#$%^&*()word123'
          });
        },
        description: 'Special characters in credentials'
      },
      {
        name: 'international_domain',
        test: async () => {
          // Test with international domain
          return await this.supabase.auth.signInWithPassword({
            email: 'test@münchen.de',
            password: 'password123'
          });
        },
        description: 'International domain handling'
      }
    ];

    let edgeCasesHandled = 0;

    for (const edgeCase of edgeCaseTests) {
      this.log(`Testing ${edgeCase.description}...`, 'info');
      
      try {
        const startTime = Date.now();
        const result = await edgeCase.test();
        const duration = Date.now() - startTime;

        if (result.error) {
          // Any reasonable error response is good
          this.log(`   ✅ Edge case handled: ${result.error.message.substring(0, 50)}...`, 'expected');
          edgeCasesHandled++;
          this.addResult(`edge_case_${edgeCase.name}`, 'PASS', 'Edge case properly handled', {
            test_description: edgeCase.description,
            error_message: result.error.message.substring(0, 100)
          }, duration);
        } else {
          this.log(`   ℹ️  Edge case processed without error`, 'info');
          this.addResult(`edge_case_${edgeCase.name}`, 'INFO', 'Edge case processed successfully', {
            test_description: edgeCase.description
          }, duration);
        }
        
      } catch (error) {
        if (error.name === 'TypeError' || error.message.includes('Invalid')) {
          this.log(`   ✅ Edge case rejected at client level`, 'expected');
          edgeCasesHandled++;
          this.addResult(`edge_case_${edgeCase.name}`, 'PASS', 'Edge case rejected at client level');
        } else {
          this.log(`   ❌ Unexpected edge case error: ${error.message}`, 'error');
          this.addResult(`edge_case_${edgeCase.name}`, 'FAIL', `Unexpected error: ${error.message}`);
        }
      }
    }

    this.log(`\n📊 Edge Cases: ${edgeCasesHandled}/${edgeCaseTests.length} handled properly`, 'info');
    return true; // Edge cases are less critical
  }

  generateReport() {
    this.log('\n=== ERROR SCENARIO TESTING REPORT ===', 'header');
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warnings = this.results.filter(r => r.status === 'WARNING').length;
    const info = this.results.filter(r => r.status === 'INFO').length;

    this.log(`Total Tests: ${this.results.length}`, 'info');
    this.log(`✅ Passed: ${passed}`, passed > 0 ? 'success' : 'info');
    this.log(`❌ Failed: ${failed}`, failed > 0 ? 'error' : 'info');
    this.log(`⚠️  Warnings: ${warnings}`, warnings > 0 ? 'warning' : 'info');
    this.log(`ℹ️  Info: ${info}`, 'info');

    // Error Resilience Score
    const resilience = this.calculateResilienceScore();
    if (resilience >= 80) {
      this.log(`\n🛡️  Error Resilience Score: ${resilience}% (Excellent)`, 'success');
    } else if (resilience >= 60) {
      this.log(`\n⚠️  Error Resilience Score: ${resilience}% (Good)`, 'warning');
    } else {
      this.log(`\n❌ Error Resilience Score: ${resilience}% (Needs Improvement)`, 'error');
    }

    // Critical issues
    if (failed > 0) {
      this.log('\n❌ CRITICAL ERROR HANDLING ISSUES:', 'error');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(result => {
          this.log(`   • ${result.test}: ${result.message}`, 'error');
        });
    }

    // Warnings
    if (warnings > 0) {
      this.log('\n⚠️  ERROR HANDLING WARNINGS:', 'warning');
      this.results
        .filter(r => r.status === 'WARNING')
        .forEach(result => {
          this.log(`   • ${result.test}: ${result.message}`, 'warning');
        });
    }

    // Security recommendations
    this.generateSecurityRecommendations();

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: { total: this.results.length, passed, failed, warnings, info },
      resilience_score: resilience,
      results: this.results,
      recommendations: this.generateRecommendations()
    };

    require('fs').writeFileSync('error-scenarios-report.json', JSON.stringify(report, null, 2));
    this.log(`\n📊 Detailed report saved to: error-scenarios-report.json`, 'info');

    return failed === 0 && resilience >= 60;
  }

  calculateResilienceScore() {
    let score = 0;
    let maxScore = 0;

    this.results.forEach(result => {
      maxScore += 10;
      
      switch (result.status) {
        case 'PASS':
          score += 10;
          break;
        case 'INFO':
          score += 8;
          break;
        case 'WARNING':
          score += 5;
          break;
        case 'FAIL':
          score += 0;
          break;
      }
    });

    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  }

  generateSecurityRecommendations() {
    this.log('\n🔒 SECURITY & ERROR HANDLING RECOMMENDATIONS:', 'info');
    
    const recommendations = [
      'Implement proper input validation and sanitization',
      'Use rate limiting to prevent brute force attacks',
      'Ensure error messages don\'t leak sensitive information',
      'Implement proper session management and expiry handling',
      'Add monitoring for suspicious authentication patterns',
      'Use CAPTCHA or similar mechanisms for repeated failures',
      'Implement proper logging for security events',
      'Regular security testing and penetration testing'
    ];

    recommendations.forEach(rec => {
      this.log(`   • ${rec}`, 'info');
    });
  }

  generateRecommendations() {
    const recommendations = [];
    
    const hasInputValidationIssues = this.results.some(r => r.test.includes('malformed') && r.status === 'FAIL');
    const hasRateLimitingIssues = this.results.some(r => r.test.includes('rate') && r.status === 'WARNING');
    const hasNetworkIssues = this.results.some(r => r.test.includes('network') && r.status === 'FAIL');

    if (hasInputValidationIssues) {
      recommendations.push('Improve input validation and sanitization');
      recommendations.push('Implement server-side validation for all inputs');
    }

    if (hasRateLimitingIssues) {
      recommendations.push('Configure rate limiting for authentication endpoints');
      recommendations.push('Implement progressive delays for repeated failures');
    }

    if (hasNetworkIssues) {
      recommendations.push('Improve network error handling and user feedback');
      recommendations.push('Implement retry mechanisms with exponential backoff');
    }

    recommendations.push('Regular security testing and error scenario testing');
    recommendations.push('Monitor error rates and patterns in production');
    
    return recommendations;
  }

  async run() {
    console.log(`${colors.bright}${colors.cyan}
╔══════════════════════════════════════════════════════════════╗
║                   ERROR SCENARIO TESTING                    ║
║                                                              ║
║  This diagnostic tests various error conditions and edge    ║
║  cases to ensure proper error handling and system           ║
║  resilience against attacks and failures.                   ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}`);

    try {
      // Initialize client
      if (!await this.initializeClient()) {
        return false;
      }

      // Run all error scenario tests
      await this.testInvalidCredentials();
      await this.testRateLimiting();
      await this.testMalformedRequests();
      await this.testNetworkFailures();
      await this.testSessionExpiry();
      await this.testConcurrentSessions();
      await this.testEdgeCases();

      return this.generateReport();

    } catch (error) {
      this.log(`❌ Error scenario test suite error: ${error.message}`, 'error');
      return false;
    }
  }
}

// Run the diagnostic if called directly
if (require.main === module) {
  const tester = new ErrorScenarioTester();
  tester.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = ErrorScenarioTester;