#!/usr/bin/env node

/**
 * Authentication Flow Testing Diagnostic
 * 
 * This script performs comprehensive testing of authentication flows
 * including sign up, sign in, session management, and user operations.
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

class AuthenticationFlowTester {
  constructor() {
    this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    this.supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    this.results = [];
    this.testUser = null;
    this.supabase = null;
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const color = {
      'info': colors.blue,
      'success': colors.green,
      'warning': colors.yellow,
      'error': colors.red,
      'header': colors.magenta,
      'input': colors.cyan
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

  async question(prompt) {
    return new Promise((resolve) => {
      this.rl.question(`${colors.cyan}${prompt}${colors.reset}`, resolve);
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

  async testSessionRetrieval() {
    this.log('\n=== SESSION RETRIEVAL TEST ===', 'header');
    
    try {
      const startTime = Date.now();
      const { data: { session }, error } = await this.supabase.auth.getSession();
      const duration = Date.now() - startTime;

      if (error) {
        this.log(`❌ Session retrieval failed: ${error.message}`, 'error');
        this.addResult('session_retrieval', 'FAIL', error.message, null, duration);
        return false;
      }

      if (session) {
        this.log(`✅ Active session found: ${session.user.email}`, 'success');
        this.log(`   Session expires: ${new Date(session.expires_at * 1000).toLocaleString()}`, 'info');
        this.addResult('session_retrieval', 'PASS', 'Active session retrieved', {
          user_id: session.user.id,
          email: session.user.email,
          expires_at: session.expires_at
        }, duration);
      } else {
        this.log('ℹ️  No active session found', 'info');
        this.addResult('session_retrieval', 'PASS', 'No active session (expected)', null, duration);
      }

      return true;
    } catch (error) {
      this.log(`❌ Session retrieval error: ${error.message}`, 'error');
      this.addResult('session_retrieval', 'FAIL', `Unexpected error: ${error.message}`);
      return false;
    }
  }

  async testUserSignUp(email, password) {
    this.log('\n=== USER SIGN UP TEST ===', 'header');
    this.log(`Testing sign up for: ${email}`, 'info');
    
    try {
      const startTime = Date.now();
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            test_user: true,
            created_by: 'diagnostic-tool'
          }
        }
      });
      const duration = Date.now() - startTime;

      if (error) {
        if (error.message.includes('already registered')) {
          this.log('ℹ️  User already exists - this is expected for testing', 'info');
          this.addResult('user_signup', 'INFO', 'User already registered', null, duration);
          return true;
        } else {
          this.log(`❌ Sign up failed: ${error.message}`, 'error');
          this.addResult('user_signup', 'FAIL', error.message, { error_code: error.code }, duration);
          return false;
        }
      }

      if (data.user) {
        this.log(`✅ User signed up successfully: ${data.user.id}`, 'success');
        this.log(`   Email confirmed: ${data.user.email_confirmed_at ? 'Yes' : 'No'}`, 'info');
        this.log(`   Confirmation required: ${!data.session ? 'Yes' : 'No'}`, 'info');
        
        this.testUser = data.user;
        this.addResult('user_signup', 'PASS', 'User signed up successfully', {
          user_id: data.user.id,
          email: data.user.email,
          email_confirmed: !!data.user.email_confirmed_at,
          has_session: !!data.session
        }, duration);
        return true;
      }

      this.log('❌ Sign up returned no user data', 'error');
      this.addResult('user_signup', 'FAIL', 'No user data returned');
      return false;
      
    } catch (error) {
      this.log(`❌ Sign up error: ${error.message}`, 'error');
      this.addResult('user_signup', 'FAIL', `Unexpected error: ${error.message}`);
      return false;
    }
  }

  async testUserSignIn(email, password) {
    this.log('\n=== USER SIGN IN TEST ===', 'header');
    this.log(`Testing sign in for: ${email}`, 'info');
    
    try {
      const startTime = Date.now();
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });
      const duration = Date.now() - startTime;

      if (error) {
        this.log(`❌ Sign in failed: ${error.message}`, 'error');
        this.addResult('user_signin', 'FAIL', error.message, { error_code: error.code }, duration);
        return false;
      }

      if (data.session && data.user) {
        this.log(`✅ User signed in successfully: ${data.user.email}`, 'success');
        this.log(`   User ID: ${data.user.id}`, 'info');
        this.log(`   Session expires: ${new Date(data.session.expires_at * 1000).toLocaleString()}`, 'info');
        this.log(`   Access token length: ${data.session.access_token.length} chars`, 'info');
        
        this.testUser = data.user;
        this.addResult('user_signin', 'PASS', 'User signed in successfully', {
          user_id: data.user.id,
          email: data.user.email,
          session_expires: data.session.expires_at,
          has_access_token: !!data.session.access_token,
          has_refresh_token: !!data.session.refresh_token
        }, duration);
        return true;
      }

      this.log('❌ Sign in returned no session or user', 'error');
      this.addResult('user_signin', 'FAIL', 'No session or user data returned');
      return false;
      
    } catch (error) {
      this.log(`❌ Sign in error: ${error.message}`, 'error');
      this.addResult('user_signin', 'FAIL', `Unexpected error: ${error.message}`);
      return false;
    }
  }

  async testSessionRefresh() {
    this.log('\n=== SESSION REFRESH TEST ===', 'header');
    
    try {
      const { data: { session: currentSession } } = await this.supabase.auth.getSession();
      
      if (!currentSession) {
        this.log('⚠️  No active session to refresh', 'warning');
        this.addResult('session_refresh', 'SKIP', 'No active session');
        return false;
      }

      const startTime = Date.now();
      const { data, error } = await this.supabase.auth.refreshSession(currentSession);
      const duration = Date.now() - startTime;

      if (error) {
        this.log(`❌ Session refresh failed: ${error.message}`, 'error');
        this.addResult('session_refresh', 'FAIL', error.message, null, duration);
        return false;
      }

      if (data.session) {
        this.log(`✅ Session refreshed successfully`, 'success');
        this.log(`   New expiration: ${new Date(data.session.expires_at * 1000).toLocaleString()}`, 'info');
        this.log(`   Token changed: ${data.session.access_token !== currentSession.access_token ? 'Yes' : 'No'}`, 'info');
        
        this.addResult('session_refresh', 'PASS', 'Session refreshed successfully', {
          old_expires_at: currentSession.expires_at,
          new_expires_at: data.session.expires_at,
          token_changed: data.session.access_token !== currentSession.access_token
        }, duration);
        return true;
      }

      this.log('❌ Session refresh returned no session', 'error');
      this.addResult('session_refresh', 'FAIL', 'No session data returned');
      return false;
      
    } catch (error) {
      this.log(`❌ Session refresh error: ${error.message}`, 'error');
      this.addResult('session_refresh', 'FAIL', `Unexpected error: ${error.message}`);
      return false;
    }
  }

  async testUserMetadata() {
    this.log('\n=== USER METADATA TEST ===', 'header');
    
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      
      if (!user) {
        this.log('⚠️  No authenticated user for metadata test', 'warning');
        this.addResult('user_metadata', 'SKIP', 'No authenticated user');
        return false;
      }

      // Test updating user metadata
      const startTime = Date.now();
      const testMetadata = {
        display_name: 'Test User',
        test_timestamp: new Date().toISOString(),
        diagnostic_run: true
      };

      const { data, error } = await this.supabase.auth.updateUser({
        data: testMetadata
      });
      const duration = Date.now() - startTime;

      if (error) {
        this.log(`❌ Metadata update failed: ${error.message}`, 'error');
        this.addResult('user_metadata', 'FAIL', error.message, null, duration);
        return false;
      }

      if (data.user) {
        this.log(`✅ User metadata updated successfully`, 'success');
        this.log(`   Metadata keys: ${Object.keys(data.user.user_metadata || {}).join(', ')}`, 'info');
        
        this.addResult('user_metadata', 'PASS', 'User metadata updated successfully', {
          user_id: data.user.id,
          metadata_keys: Object.keys(data.user.user_metadata || {}),
          updated_fields: Object.keys(testMetadata)
        }, duration);
        return true;
      }

      this.log('❌ Metadata update returned no user', 'error');
      this.addResult('user_metadata', 'FAIL', 'No user data returned');
      return false;
      
    } catch (error) {
      this.log(`❌ Metadata update error: ${error.message}`, 'error');
      this.addResult('user_metadata', 'FAIL', `Unexpected error: ${error.message}`);
      return false;
    }
  }

  async testPasswordReset(email) {
    this.log('\n=== PASSWORD RESET TEST ===', 'header');
    this.log(`Testing password reset for: ${email}`, 'info');
    
    try {
      const startTime = Date.now();
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'http://localhost:3000/auth/reset-password'
      });
      const duration = Date.now() - startTime;

      if (error) {
        this.log(`❌ Password reset failed: ${error.message}`, 'error');
        this.addResult('password_reset', 'FAIL', error.message, null, duration);
        return false;
      }

      this.log(`✅ Password reset email sent successfully`, 'success');
      this.log(`   Note: Check the email inbox (or Supabase logs for local dev)`, 'info');
      
      this.addResult('password_reset', 'PASS', 'Password reset initiated successfully', {
        email: email,
        redirect_url: 'http://localhost:3000/auth/reset-password'
      }, duration);
      return true;
      
    } catch (error) {
      this.log(`❌ Password reset error: ${error.message}`, 'error');
      this.addResult('password_reset', 'FAIL', `Unexpected error: ${error.message}`);
      return false;
    }
  }

  async testSignOut() {
    this.log('\n=== USER SIGN OUT TEST ===', 'header');
    
    try {
      const { data: { session: beforeSession } } = await this.supabase.auth.getSession();
      
      if (!beforeSession) {
        this.log('⚠️  No active session to sign out', 'warning');
        this.addResult('user_signout', 'SKIP', 'No active session');
        return false;
      }

      const startTime = Date.now();
      const { error } = await this.supabase.auth.signOut();
      const duration = Date.now() - startTime;

      if (error) {
        this.log(`❌ Sign out failed: ${error.message}`, 'error');
        this.addResult('user_signout', 'FAIL', error.message, null, duration);
        return false;
      }

      // Verify session is cleared
      const { data: { session: afterSession } } = await this.supabase.auth.getSession();

      if (afterSession) {
        this.log(`⚠️  Session still active after sign out`, 'warning');
        this.addResult('user_signout', 'WARNING', 'Session still active after sign out', null, duration);
        return false;
      }

      this.log(`✅ User signed out successfully`, 'success');
      this.log(`   Session cleared: ${!afterSession ? 'Yes' : 'No'}`, 'info');
      
      this.addResult('user_signout', 'PASS', 'User signed out successfully', {
        session_cleared: !afterSession
      }, duration);
      return true;
      
    } catch (error) {
      this.log(`❌ Sign out error: ${error.message}`, 'error');
      this.addResult('user_signout', 'FAIL', `Unexpected error: ${error.message}`);
      return false;
    }
  }

  async testInvalidCredentials() {
    this.log('\n=== INVALID CREDENTIALS TEST ===', 'header');
    
    try {
      const startTime = Date.now();
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: 'nonexistent@test.com',
        password: 'wrongpassword123'
      });
      const duration = Date.now() - startTime;

      if (error) {
        if (error.message.includes('Invalid login credentials') || 
            error.message.includes('Email not confirmed') ||
            error.message.includes('Invalid') ||
            error.code === '400') {
          this.log(`✅ Invalid credentials properly rejected: ${error.message}`, 'success');
          this.addResult('invalid_credentials', 'PASS', 'Invalid credentials properly rejected', {
            error_message: error.message,
            error_code: error.code
          }, duration);
          return true;
        } else {
          this.log(`❌ Unexpected error for invalid credentials: ${error.message}`, 'error');
          this.addResult('invalid_credentials', 'FAIL', `Unexpected error: ${error.message}`, null, duration);
          return false;
        }
      }

      if (data.session) {
        this.log(`❌ Invalid credentials were accepted!`, 'error');
        this.addResult('invalid_credentials', 'FAIL', 'Invalid credentials were incorrectly accepted', null, duration);
        return false;
      }

      this.log(`⚠️  No error or session for invalid credentials`, 'warning');
      this.addResult('invalid_credentials', 'WARNING', 'No error or session returned', null, duration);
      return false;
      
    } catch (error) {
      this.log(`❌ Invalid credentials test error: ${error.message}`, 'error');
      this.addResult('invalid_credentials', 'FAIL', `Unexpected error: ${error.message}`);
      return false;
    }
  }

  async testAuthStateChanges() {
    this.log('\n=== AUTH STATE CHANGE TEST ===', 'header');
    
    return new Promise((resolve) => {
      let eventCount = 0;
      const events = [];
      const timeout = setTimeout(() => {
        subscription.unsubscribe();
        
        if (eventCount > 0) {
          this.log(`✅ Auth state changes detected (${eventCount} events)`, 'success');
          this.addResult('auth_state_changes', 'PASS', `${eventCount} auth state events captured`, {
            events: events,
            event_count: eventCount
          });
        } else {
          this.log(`ℹ️  No auth state changes detected (this might be normal)`, 'info');
          this.addResult('auth_state_changes', 'INFO', 'No auth state changes detected');
        }
        
        resolve(eventCount > 0);
      }, 3000); // Wait 3 seconds for any events

      const subscription = this.supabase.auth.onAuthStateChange((event, session) => {
        eventCount++;
        events.push({
          event,
          has_session: !!session,
          timestamp: new Date().toISOString()
        });
        
        this.log(`   📡 Auth event: ${event} (session: ${session ? 'present' : 'none'})`, 'info');
      });

      // Trigger a sign-in to test the listener
      setTimeout(async () => {
        try {
          await this.supabase.auth.signOut(); // This should trigger an event
        } catch (error) {
          // Ignore errors, we're just testing the listener
        }
      }, 1000);
    });
  }

  generateReport() {
    this.log('\n=== AUTHENTICATION FLOW REPORT ===', 'header');
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warnings = this.results.filter(r => r.status === 'WARNING').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;
    const info = this.results.filter(r => r.status === 'INFO').length;

    this.log(`Total Tests: ${this.results.length}`, 'info');
    this.log(`✅ Passed: ${passed}`, passed > 0 ? 'success' : 'info');
    this.log(`❌ Failed: ${failed}`, failed > 0 ? 'error' : 'info');
    this.log(`⚠️  Warnings: ${warnings}`, warnings > 0 ? 'warning' : 'info');
    this.log(`⏭️  Skipped: ${skipped}`, 'info');
    this.log(`ℹ️  Info: ${info}`, 'info');

    // Average response times
    const timedResults = this.results.filter(r => r.duration);
    if (timedResults.length > 0) {
      const avgDuration = timedResults.reduce((sum, r) => sum + r.duration, 0) / timedResults.length;
      this.log(`⏱️  Average Response Time: ${avgDuration.toFixed(0)}ms`, 'info');
    }

    if (failed > 0) {
      this.log('\n❌ FAILED TESTS:', 'error');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(result => {
          this.log(`   • ${result.test}: ${result.message}`, 'error');
        });
    }

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: { total: this.results.length, passed, failed, warnings, skipped, info },
      results: this.results,
      recommendations: this.generateRecommendations()
    };

    require('fs').writeFileSync(
      'authentication-flow-report.json',
      JSON.stringify(report, null, 2)
    );

    this.log(`\n📊 Detailed report saved to: authentication-flow-report.json`, 'info');

    if (failed === 0) {
      this.log('\n🎉 AUTHENTICATION FLOW TESTS PASSED!', 'success');
      this.log('Your authentication system is working correctly.', 'success');
    } else {
      this.log('\n🔧 AUTHENTICATION ISSUES DETECTED', 'warning');
      this.log('Review the failed tests and check your Supabase configuration.', 'info');
    }

    return failed === 0;
  }

  generateRecommendations() {
    const recommendations = [];
    const failedTests = this.results.filter(r => r.status === 'FAIL');

    failedTests.forEach(result => {
      switch (result.test) {
        case 'client_init':
          recommendations.push('Verify your Supabase URL and anon key are correct');
          break;
        case 'user_signup':
          recommendations.push('Check email confirmation settings in Supabase Auth');
          break;
        case 'user_signin':
          recommendations.push('Verify user exists and password is correct');
          break;
        case 'session_refresh':
          recommendations.push('Check JWT expiration settings in Supabase');
          break;
        case 'password_reset':
          recommendations.push('Verify email templates and SMTP configuration');
          break;
      }
    });

    return [...new Set(recommendations)];
  }

  async cleanup() {
    this.rl.close();
  }

  async run() {
    console.log(`${colors.bright}${colors.cyan}
╔══════════════════════════════════════════════════════════════╗
║                 AUTHENTICATION FLOW TESTING                 ║
║                                                              ║
║  This diagnostic will test complete authentication flows    ║
║  including sign up, sign in, sessions, and user operations. ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}`);

    try {
      // Initialize client
      if (!await this.initializeClient()) {
        return false;
      }

      // Basic session test
      await this.testSessionRetrieval();
      await this.testAuthStateChanges();

      // Interactive testing
      this.log('\n🔐 INTERACTIVE AUTHENTICATION TESTING', 'header');
      this.log('This will test authentication with real credentials.', 'info');
      this.log('You can use a test email address for this purpose.', 'info');

      const runInteractive = await this.question('Do you want to run interactive authentication tests? (y/n): ');
      
      if (runInteractive.toLowerCase() === 'y' || runInteractive.toLowerCase() === 'yes') {
        const testEmail = await this.question('Enter test email address: ');
        const testPassword = await this.question('Enter test password (min 6 chars): ');

        if (testEmail && testPassword) {
          // Sign up test
          await this.testUserSignUp(testEmail, testPassword);

          // Sign in test
          await this.testUserSignIn(testEmail, testPassword);

          // Session and metadata tests
          await this.testSessionRefresh();
          await this.testUserMetadata();

          // Password reset test
          await this.testPasswordReset(testEmail);

          // Sign out test
          await this.testSignOut();
        }
      }

      // Security tests (non-interactive)
      await this.testInvalidCredentials();

      return this.generateReport();

    } catch (error) {
      this.log(`❌ Test suite error: ${error.message}`, 'error');
      return false;
    } finally {
      await this.cleanup();
    }
  }
}

// Run the diagnostic if called directly
if (require.main === module) {
  const tester = new AuthenticationFlowTester();
  tester.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = AuthenticationFlowTester;