#!/usr/bin/env node

/**
 * Supabase Connection Health Check Diagnostic
 * 
 * This script verifies basic connectivity to Supabase and validates
 * essential configuration parameters.
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const { URL } = require('url');

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

class ConnectionHealthChecker {
  constructor() {
    this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    this.supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    this.serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.results = [];
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const color = {
      'info': colors.blue,
      'success': colors.green,
      'warning': colors.yellow,
      'error': colors.red,
      'header': colors.magenta
    }[level] || colors.reset;

    console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
  }

  addResult(test, status, message, details = null) {
    this.results.push({ test, status, message, details, timestamp: new Date().toISOString() });
  }

  async checkEnvironmentVariables() {
    this.log('=== ENVIRONMENT VARIABLE VALIDATION ===', 'header');
    
    const requiredVars = [
      { name: 'NEXT_PUBLIC_SUPABASE_URL', value: this.supabaseUrl },
      { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: this.supabaseAnonKey },
      { name: 'SUPABASE_SERVICE_ROLE_KEY', value: this.serviceRoleKey }
    ];

    let allValid = true;

    for (const envVar of requiredVars) {
      if (!envVar.value) {
        this.log(`❌ ${envVar.name}: NOT SET`, 'error');
        this.addResult('env_check', 'FAIL', `${envVar.name} is not set`);
        allValid = false;
      } else if (envVar.value.includes('your_supabase') || envVar.value.includes('YOUR_')) {
        this.log(`❌ ${envVar.name}: PLACEHOLDER VALUE`, 'error');
        this.addResult('env_check', 'FAIL', `${envVar.name} contains placeholder value`);
        allValid = false;
      } else {
        // Mask sensitive values for display
        const displayValue = envVar.name.includes('KEY') ? 
          `${envVar.value.substring(0, 10)}...${envVar.value.substring(envVar.value.length - 4)}` :
          envVar.value;
        this.log(`✅ ${envVar.name}: ${displayValue}`, 'success');
        this.addResult('env_check', 'PASS', `${envVar.name} is properly set`);
      }
    }

    if (this.supabaseUrl) {
      try {
        const url = new URL(this.supabaseUrl);
        if (url.hostname.includes('.supabase.co')) {
          this.log(`✅ URL Format: Valid Supabase URL (${url.hostname})`, 'success');
          this.addResult('url_format', 'PASS', 'Valid Supabase URL format');
        } else {
          this.log(`⚠️  URL Format: Custom domain detected (${url.hostname})`, 'warning');
          this.addResult('url_format', 'WARNING', 'Custom domain - ensure it\'s properly configured');
        }
      } catch (error) {
        this.log(`❌ URL Format: Invalid URL format - ${error.message}`, 'error');
        this.addResult('url_format', 'FAIL', `Invalid URL format: ${error.message}`);
        allValid = false;
      }
    }

    return allValid;
  }

  async checkNetworkConnectivity() {
    this.log('\n=== NETWORK CONNECTIVITY TEST ===', 'header');
    
    if (!this.supabaseUrl) {
      this.log('❌ Skipping network test - no URL provided', 'error');
      return false;
    }

    try {
      const url = new URL(this.supabaseUrl);
      
      return new Promise((resolve) => {
        const startTime = Date.now();
        
        const req = https.get({
          hostname: url.hostname,
          port: 443,
          path: '/rest/v1/',
          headers: {
            'User-Agent': 'Supabase-Diagnostic-Tool/1.0'
          },
          timeout: 10000
        }, (res) => {
          const responseTime = Date.now() - startTime;
          
          this.log(`✅ Network connectivity: SUCCESS (${responseTime}ms)`, 'success');
          this.log(`   Status Code: ${res.statusCode}`, 'info');
          this.log(`   Response Time: ${responseTime}ms`, 'info');
          
          this.addResult('network_connectivity', 'PASS', 'Network connectivity successful', {
            statusCode: res.statusCode,
            responseTime: responseTime
          });
          
          resolve(true);
        });

        req.on('timeout', () => {
          this.log('❌ Network connectivity: TIMEOUT (10s)', 'error');
          this.addResult('network_connectivity', 'FAIL', 'Network request timed out after 10 seconds');
          req.destroy();
          resolve(false);
        });

        req.on('error', (error) => {
          this.log(`❌ Network connectivity: ERROR - ${error.message}`, 'error');
          this.addResult('network_connectivity', 'FAIL', `Network error: ${error.message}`);
          resolve(false);
        });
      });
    } catch (error) {
      this.log(`❌ Network connectivity: ERROR - ${error.message}`, 'error');
      this.addResult('network_connectivity', 'FAIL', `Network connectivity error: ${error.message}`);
      return false;
    }
  }

  async checkSupabaseClient() {
    this.log('\n=== SUPABASE CLIENT TEST ===', 'header');
    
    if (!this.supabaseUrl || !this.supabaseAnonKey) {
      this.log('❌ Cannot create client - missing credentials', 'error');
      this.addResult('client_creation', 'FAIL', 'Missing Supabase credentials');
      return false;
    }

    try {
      const supabase = createClient(this.supabaseUrl, this.supabaseAnonKey);
      this.log('✅ Supabase client: CREATED', 'success');
      this.addResult('client_creation', 'PASS', 'Supabase client created successfully');

      // Test basic API call
      const startTime = Date.now();
      const { data, error } = await supabase.from('_').select('*').limit(1);
      const responseTime = Date.now() - startTime;

      if (error && error.code !== 'PGRST116') { // PGRST116 is "table not found" which is expected
        this.log(`❌ API Test: ERROR - ${error.message}`, 'error');
        this.addResult('api_test', 'FAIL', `API test failed: ${error.message}`, { error });
        return false;
      }

      this.log(`✅ API Test: SUCCESS (${responseTime}ms)`, 'success');
      this.log('   Basic API communication established', 'info');
      this.addResult('api_test', 'PASS', 'Basic API communication successful', { responseTime });

      return true;
    } catch (error) {
      this.log(`❌ Supabase client: ERROR - ${error.message}`, 'error');
      this.addResult('client_creation', 'FAIL', `Client creation error: ${error.message}`);
      return false;
    }
  }

  async checkDatabaseConnection() {
    this.log('\n=== DATABASE CONNECTION TEST ===', 'header');
    
    if (!this.supabaseUrl || !this.supabaseAnonKey) {
      this.log('❌ Cannot test database - missing credentials', 'error');
      return false;
    }

    try {
      const supabase = createClient(this.supabaseUrl, this.supabaseAnonKey);
      
      // Test with a simple query that should work regardless of schema
      const startTime = Date.now();
      const { data, error } = await supabase.rpc('version');
      const responseTime = Date.now() - startTime;

      if (error) {
        this.log(`⚠️  Database version check failed: ${error.message}`, 'warning');
        // Try alternative method
        const { data: altData, error: altError } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .limit(1);

        if (altError) {
          this.log(`❌ Database connection: FAILED`, 'error');
          this.addResult('database_connection', 'FAIL', `Database connection failed: ${altError.message}`);
          return false;
        }
      }

      this.log(`✅ Database connection: SUCCESS (${responseTime}ms)`, 'success');
      if (data) {
        this.log(`   PostgreSQL Version: ${data}`, 'info');
      }
      
      this.addResult('database_connection', 'PASS', 'Database connection successful', {
        responseTime,
        version: data
      });
      return true;
      
    } catch (error) {
      this.log(`❌ Database connection: ERROR - ${error.message}`, 'error');
      this.addResult('database_connection', 'FAIL', `Database connection error: ${error.message}`);
      return false;
    }
  }

  async checkAuthEndpoint() {
    this.log('\n=== AUTH ENDPOINT TEST ===', 'header');
    
    if (!this.supabaseUrl || !this.supabaseAnonKey) {
      this.log('❌ Cannot test auth - missing credentials', 'error');
      return false;
    }

    try {
      const supabase = createClient(this.supabaseUrl, this.supabaseAnonKey);
      
      // Test auth endpoint with getSession (should not error even if no session)
      const startTime = Date.now();
      const { data, error } = await supabase.auth.getSession();
      const responseTime = Date.now() - startTime;

      if (error) {
        this.log(`❌ Auth endpoint: ERROR - ${error.message}`, 'error');
        this.addResult('auth_endpoint', 'FAIL', `Auth endpoint error: ${error.message}`);
        return false;
      }

      this.log(`✅ Auth endpoint: ACCESSIBLE (${responseTime}ms)`, 'success');
      this.log(`   Session status: ${data.session ? 'Active' : 'No active session'}`, 'info');
      
      this.addResult('auth_endpoint', 'PASS', 'Auth endpoint accessible', {
        responseTime,
        hasSession: !!data.session
      });
      return true;
      
    } catch (error) {
      this.log(`❌ Auth endpoint: ERROR - ${error.message}`, 'error');
      this.addResult('auth_endpoint', 'FAIL', `Auth endpoint error: ${error.message}`);
      return false;
    }
  }

  generateReport() {
    this.log('\n=== DIAGNOSTIC REPORT ===', 'header');
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warnings = this.results.filter(r => r.status === 'WARNING').length;

    this.log(`Total Tests: ${this.results.length}`, 'info');
    this.log(`Passed: ${passed}`, passed > 0 ? 'success' : 'info');
    this.log(`Failed: ${failed}`, failed > 0 ? 'error' : 'info');
    this.log(`Warnings: ${warnings}`, warnings > 0 ? 'warning' : 'info');

    if (failed > 0) {
      this.log('\n❌ CRITICAL ISSUES FOUND:', 'error');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(result => {
          this.log(`   • ${result.test}: ${result.message}`, 'error');
        });
    }

    if (warnings > 0) {
      this.log('\n⚠️  WARNINGS:', 'warning');
      this.results
        .filter(r => r.status === 'WARNING')
        .forEach(result => {
          this.log(`   • ${result.test}: ${result.message}`, 'warning');
        });
    }

    if (failed === 0) {
      this.log('\n🎉 ALL CRITICAL TESTS PASSED!', 'success');
      this.log('Your Supabase connection appears to be working correctly.', 'success');
    } else {
      this.log('\n🔧 TROUBLESHOOTING STEPS:', 'info');
      this.log('1. Verify your Supabase project is active', 'info');
      this.log('2. Check your environment variables in .env.local', 'info');
      this.log('3. Ensure your network allows HTTPS connections to Supabase', 'info');
      this.log('4. Check Supabase project settings and API keys', 'info');
    }

    // Save detailed report to file
    const report = {
      timestamp: new Date().toISOString(),
      summary: { total: this.results.length, passed, failed, warnings },
      results: this.results,
      recommendations: this.generateRecommendations()
    };

    require('fs').writeFileSync(
      'supabase-connection-diagnostic.json',
      JSON.stringify(report, null, 2)
    );

    this.log(`\n📊 Detailed report saved to: supabase-connection-diagnostic.json`, 'info');
  }

  generateRecommendations() {
    const recommendations = [];
    
    this.results.forEach(result => {
      if (result.status === 'FAIL') {
        switch (result.test) {
          case 'env_check':
            recommendations.push('Update your .env.local file with correct Supabase credentials');
            break;
          case 'network_connectivity':
            recommendations.push('Check your internet connection and firewall settings');
            break;
          case 'client_creation':
            recommendations.push('Verify your Supabase project URL and API keys are correct');
            break;
          case 'database_connection':
            recommendations.push('Ensure your Supabase project database is active');
            break;
          case 'auth_endpoint':
            recommendations.push('Check if authentication is properly configured in your Supabase project');
            break;
        }
      }
    });

    return [...new Set(recommendations)]; // Remove duplicates
  }

  async run() {
    console.log(`${colors.bright}${colors.cyan}
╔══════════════════════════════════════════════════════════════╗
║                 SUPABASE CONNECTION HEALTH CHECK             ║
║                                                              ║
║  This diagnostic will verify your Supabase configuration    ║
║  and test connectivity to essential services.               ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}`);

    await this.checkEnvironmentVariables();
    await this.checkNetworkConnectivity();
    await this.checkSupabaseClient();
    await this.checkDatabaseConnection();
    await this.checkAuthEndpoint();
    
    this.generateReport();
  }
}

// Run the diagnostic if called directly
if (require.main === module) {
  const checker = new ConnectionHealthChecker();
  checker.run().catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = ConnectionHealthChecker;