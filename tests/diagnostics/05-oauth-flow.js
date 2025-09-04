#!/usr/bin/env node

/**
 * OAuth Flow Testing Diagnostic
 * 
 * This script tests OAuth provider configurations, redirect URLs,
 * and OAuth flow mechanics for Google, GitHub, and other providers.
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

class OAuthFlowTester {
  constructor() {
    this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    this.supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    this.results = [];
    this.supabase = null;
    
    // OAuth providers configuration
    this.providers = {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        discoveryUrl: 'https://accounts.google.com/.well-known/openid_configuration'
      },
      github: {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        authUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token'
      },
      discord: {
        clientId: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
        authUrl: 'https://discord.com/api/oauth2/authorize',
        tokenUrl: 'https://discord.com/api/oauth2/token'
      }
    };
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

  async checkProviderConfiguration() {
    this.log('\n=== OAUTH PROVIDER CONFIGURATION CHECK ===', 'header');
    
    let configuredProviders = 0;

    for (const [providerName, config] of Object.entries(this.providers)) {
      this.log(`\nChecking ${providerName.toUpperCase()} configuration...`, 'info');
      
      const hasClientId = !!config.clientId;
      const hasClientSecret = !!config.clientSecret;

      if (!hasClientId && !hasClientSecret) {
        this.log(`ℹ️  ${providerName.toUpperCase()}: Not configured (skipping)`, 'info');
        this.addResult(`${providerName}_config`, 'SKIP', 'Provider not configured');
        continue;
      }

      configuredProviders++;
      let providerValid = true;

      // Check Client ID
      if (!hasClientId) {
        this.log(`❌ ${providerName.toUpperCase()}: Missing Client ID`, 'error');
        this.addResult(`${providerName}_config`, 'FAIL', 'Missing Client ID');
        providerValid = false;
      } else if (this.isPlaceholderValue(config.clientId)) {
        this.log(`❌ ${providerName.toUpperCase()}: Placeholder Client ID`, 'error');
        this.addResult(`${providerName}_config`, 'FAIL', 'Client ID contains placeholder');
        providerValid = false;
      } else {
        const maskedId = this.maskSensitiveValue(config.clientId);
        this.log(`✅ ${providerName.toUpperCase()}: Client ID configured (${maskedId})`, 'success');
      }

      // Check Client Secret
      if (!hasClientSecret) {
        this.log(`❌ ${providerName.toUpperCase()}: Missing Client Secret`, 'error');
        this.addResult(`${providerName}_config`, 'FAIL', 'Missing Client Secret');
        providerValid = false;
      } else if (this.isPlaceholderValue(config.clientSecret)) {
        this.log(`❌ ${providerName.toUpperCase()}: Placeholder Client Secret`, 'error');
        this.addResult(`${providerName}_config`, 'FAIL', 'Client Secret contains placeholder');
        providerValid = false;
      } else {
        const maskedSecret = this.maskSensitiveValue(config.clientSecret);
        this.log(`✅ ${providerName.toUpperCase()}: Client Secret configured (${maskedSecret})`, 'success');
      }

      // Validate Client ID format for each provider
      if (hasClientId && !this.isPlaceholderValue(config.clientId)) {
        const formatValid = this.validateClientIdFormat(providerName, config.clientId);
        if (!formatValid) {
          this.log(`⚠️  ${providerName.toUpperCase()}: Client ID format may be incorrect`, 'warning');
          this.addResult(`${providerName}_config`, 'WARNING', 'Client ID format validation failed');
          providerValid = false;
        }
      }

      if (providerValid) {
        this.log(`✅ ${providerName.toUpperCase()}: Configuration valid`, 'success');
        this.addResult(`${providerName}_config`, 'PASS', 'Provider configuration valid');
      }
    }

    this.log(`\n📊 Summary: ${configuredProviders} OAuth provider(s) configured`, 'info');
    return configuredProviders > 0;
  }

  validateClientIdFormat(provider, clientId) {
    switch (provider) {
      case 'google':
        // Google Client IDs end with .apps.googleusercontent.com
        return clientId.endsWith('.apps.googleusercontent.com');
      case 'github':
        // GitHub Client IDs are typically alphanumeric strings
        return /^[a-fA-F0-9]+$/.test(clientId) || /^[a-zA-Z0-9]+$/.test(clientId);
      case 'discord':
        // Discord Client IDs are numeric strings (snowflakes)
        return /^\d+$/.test(clientId);
      default:
        return true; // Unknown provider, assume valid
    }
  }

  maskSensitiveValue(value) {
    if (!value || value.length <= 8) return '***';
    return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
  }

  isPlaceholderValue(value) {
    const placeholders = [
      'your_google', 'YOUR_GOOGLE',
      'your_github', 'YOUR_GITHUB',
      'your_discord', 'YOUR_DISCORD',
      'replace_me', 'REPLACE_ME',
      'changeme', 'CHANGEME'
    ];
    return placeholders.some(placeholder => value.includes(placeholder));
  }

  async testProviderEndpoints() {
    this.log('\n=== OAUTH PROVIDER ENDPOINT TESTING ===', 'header');

    for (const [providerName, config] of Object.entries(this.providers)) {
      if (!config.clientId || !config.clientSecret) {
        continue; // Skip unconfigured providers
      }

      this.log(`\nTesting ${providerName.toUpperCase()} endpoints...`, 'info');

      // Test provider discovery/auth endpoints
      const endpointsToTest = [];
      
      if (config.discoveryUrl) {
        endpointsToTest.push({ name: 'Discovery', url: config.discoveryUrl });
      }
      if (config.authUrl) {
        endpointsToTest.push({ name: 'Authorization', url: config.authUrl });
      }
      if (config.tokenUrl) {
        endpointsToTest.push({ name: 'Token', url: config.tokenUrl });
      }

      let endpointsPassed = 0;

      for (const endpoint of endpointsToTest) {
        try {
          const startTime = Date.now();
          const accessible = await this.testEndpointAccessibility(endpoint.url);
          const duration = Date.now() - startTime;

          if (accessible) {
            this.log(`   ✅ ${endpoint.name} endpoint accessible (${duration}ms)`, 'success');
            endpointsPassed++;
          } else {
            this.log(`   ❌ ${endpoint.name} endpoint not accessible`, 'error');
          }
        } catch (error) {
          this.log(`   ❌ ${endpoint.name} endpoint test error: ${error.message}`, 'error');
        }
      }

      if (endpointsPassed === endpointsToTest.length) {
        this.log(`✅ ${providerName.toUpperCase()}: All endpoints accessible`, 'success');
        this.addResult(`${providerName}_endpoints`, 'PASS', 'All provider endpoints accessible');
      } else {
        this.log(`❌ ${providerName.toUpperCase()}: ${endpointsPassed}/${endpointsToTest.length} endpoints accessible`, 'error');
        this.addResult(`${providerName}_endpoints`, 'FAIL', `Only ${endpointsPassed}/${endpointsToTest.length} endpoints accessible`);
      }
    }
  }

  async testEndpointAccessibility(url) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, 5000);

      const request = https.get(url, (response) => {
        clearTimeout(timeout);
        // Any HTTP response (even errors) means the endpoint is accessible
        resolve(response.statusCode < 500);
      });

      request.on('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });

      request.setTimeout(5000, () => {
        request.destroy();
        clearTimeout(timeout);
        resolve(false);
      });
    });
  }

  async testSupabaseOAuthConfiguration() {
    this.log('\n=== SUPABASE OAUTH CONFIGURATION TEST ===', 'header');

    if (!this.supabase) {
      this.log('❌ Cannot test OAuth - Supabase client not initialized', 'error');
      this.addResult('supabase_oauth', 'FAIL', 'Supabase client not available');
      return false;
    }

    // Test each configured provider with Supabase
    for (const [providerName, config] of Object.entries(this.providers)) {
      if (!config.clientId || !config.clientSecret) {
        continue; // Skip unconfigured providers
      }

      this.log(`Testing Supabase OAuth integration for ${providerName.toUpperCase()}...`, 'info');

      try {
        const startTime = Date.now();
        
        // Test OAuth URL generation (this doesn't actually redirect)
        const { data, error } = await this.supabase.auth.signInWithOAuth({
          provider: providerName,
          options: {
            redirectTo: 'http://localhost:3000/auth/callback',
            skipBrowserRedirect: true // This prevents actual redirect
          }
        });
        
        const duration = Date.now() - startTime;

        if (error) {
          if (error.message.includes('Provider not supported') || 
              error.message.includes('not enabled')) {
            this.log(`❌ ${providerName.toUpperCase()}: Provider not enabled in Supabase`, 'error');
            this.addResult(`supabase_${providerName}_oauth`, 'FAIL', 'Provider not enabled in Supabase dashboard', null, duration);
          } else {
            this.log(`❌ ${providerName.toUpperCase()}: OAuth configuration error - ${error.message}`, 'error');
            this.addResult(`supabase_${providerName}_oauth`, 'FAIL', error.message, null, duration);
          }
        } else if (data?.url) {
          this.log(`✅ ${providerName.toUpperCase()}: OAuth URL generated (${duration}ms)`, 'success');
          this.log(`   OAuth URL: ${data.url.substring(0, 100)}...`, 'info');
          this.addResult(`supabase_${providerName}_oauth`, 'PASS', 'OAuth URL generation successful', {
            provider: providerName,
            url_length: data.url.length
          }, duration);
        } else {
          this.log(`⚠️  ${providerName.toUpperCase()}: OAuth test returned no URL or error`, 'warning');
          this.addResult(`supabase_${providerName}_oauth`, 'WARNING', 'No URL or error returned');
        }
      } catch (error) {
        this.log(`❌ ${providerName.toUpperCase()}: OAuth test error - ${error.message}`, 'error');
        this.addResult(`supabase_${providerName}_oauth`, 'FAIL', `Unexpected error: ${error.message}`);
      }
    }
  }

  async testRedirectURLs() {
    this.log('\n=== OAUTH REDIRECT URL TESTING ===', 'header');

    const redirectUrls = [
      'http://localhost:3000/auth/callback',
      'http://localhost:3000/dashboard',
      `${this.supabaseUrl}/auth/v1/callback`,
      'https://your-domain.com/auth/callback' // Example production URL
    ];

    for (const url of redirectUrls) {
      this.log(`Testing redirect URL: ${url}`, 'info');

      try {
        // Validate URL format
        const urlObj = new URL(url);
        
        if (url.includes('your-domain.com')) {
          this.log(`   ⚠️  Example/placeholder URL detected`, 'warning');
          this.addResult('redirect_url_test', 'WARNING', 'Placeholder redirect URL found', { url });
          continue;
        }

        if (urlObj.protocol !== 'https:' && !urlObj.hostname.includes('localhost')) {
          this.log(`   ⚠️  Non-HTTPS URL for production: ${url}`, 'warning');
          this.addResult('redirect_url_test', 'WARNING', 'Non-HTTPS redirect URL', { url });
        } else {
          this.log(`   ✅ Valid redirect URL format`, 'success');
        }

        // Test if the URL is reachable (for localhost URLs)
        if (urlObj.hostname === 'localhost') {
          const reachable = await this.testEndpointAccessibility(url);
          if (reachable) {
            this.log(`   ✅ Localhost redirect URL is reachable`, 'success');
            this.addResult('redirect_url_test', 'PASS', 'Localhost redirect URL reachable', { url });
          } else {
            this.log(`   ⚠️  Localhost redirect URL not reachable (app may not be running)`, 'warning');
            this.addResult('redirect_url_test', 'WARNING', 'Localhost redirect URL not reachable', { url });
          }
        } else {
          this.log(`   ✅ External redirect URL format valid`, 'success');
          this.addResult('redirect_url_test', 'PASS', 'External redirect URL format valid', { url });
        }

      } catch (error) {
        this.log(`   ❌ Invalid redirect URL: ${error.message}`, 'error');
        this.addResult('redirect_url_test', 'FAIL', `Invalid redirect URL: ${error.message}`, { url });
      }
    }
  }

  async testOAuthScopes() {
    this.log('\n=== OAUTH SCOPES TESTING ===', 'header');

    const providerScopes = {
      google: ['openid', 'email', 'profile'],
      github: ['user:email', 'read:user'],
      discord: ['identify', 'email']
    };

    for (const [providerName, config] of Object.entries(this.providers)) {
      if (!config.clientId || !config.clientSecret) {
        continue;
      }

      this.log(`Testing ${providerName.toUpperCase()} OAuth scopes...`, 'info');

      const scopes = providerScopes[providerName] || [];
      
      try {
        const startTime = Date.now();
        
        const { data, error } = await this.supabase.auth.signInWithOAuth({
          provider: providerName,
          options: {
            redirectTo: 'http://localhost:3000/auth/callback',
            scopes: scopes.join(' '),
            skipBrowserRedirect: true
          }
        });
        
        const duration = Date.now() - startTime;

        if (error) {
          this.log(`   ❌ Scope test failed: ${error.message}`, 'error');
          this.addResult(`${providerName}_scopes`, 'FAIL', error.message, null, duration);
        } else if (data?.url) {
          // Check if scopes are included in the OAuth URL
          const scopesInUrl = scopes.some(scope => data.url.includes(encodeURIComponent(scope)));
          
          if (scopesInUrl) {
            this.log(`   ✅ OAuth scopes properly included in authorization URL`, 'success');
            this.addResult(`${providerName}_scopes`, 'PASS', 'OAuth scopes properly configured', {
              scopes: scopes,
              url_contains_scopes: true
            }, duration);
          } else {
            this.log(`   ⚠️  OAuth scopes may not be included in authorization URL`, 'warning');
            this.addResult(`${providerName}_scopes`, 'WARNING', 'Scopes not detected in OAuth URL', {
              scopes: scopes,
              url_contains_scopes: false
            }, duration);
          }
        } else {
          this.log(`   ⚠️  No OAuth URL generated for scope test`, 'warning');
          this.addResult(`${providerName}_scopes`, 'WARNING', 'No OAuth URL generated');
        }

      } catch (error) {
        this.log(`   ❌ Scope test error: ${error.message}`, 'error');
        this.addResult(`${providerName}_scopes`, 'FAIL', `Scope test error: ${error.message}`);
      }
    }
  }

  generateReport() {
    this.log('\n=== OAUTH FLOW TESTING REPORT ===', 'header');
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warnings = this.results.filter(r => r.status === 'WARNING').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;

    this.log(`Total Tests: ${this.results.length}`, 'info');
    this.log(`✅ Passed: ${passed}`, passed > 0 ? 'success' : 'info');
    this.log(`❌ Failed: ${failed}`, failed > 0 ? 'error' : 'info');
    this.log(`⚠️  Warnings: ${warnings}`, warnings > 0 ? 'warning' : 'info');
    this.log(`⏭️  Skipped: ${skipped}`, 'info');

    // Show configured providers summary
    const configuredProviders = Object.entries(this.providers)
      .filter(([_, config]) => config.clientId && config.clientSecret)
      .map(([name, _]) => name);

    if (configuredProviders.length > 0) {
      this.log(`\n🔧 Configured Providers: ${configuredProviders.join(', ').toUpperCase()}`, 'info');
    } else {
      this.log(`\n⚠️  No OAuth providers configured`, 'warning');
    }

    // Show critical issues
    if (failed > 0) {
      this.log('\n❌ CRITICAL ISSUES:', 'error');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(result => {
          this.log(`   • ${result.test}: ${result.message}`, 'error');
        });
    }

    // Show warnings
    if (warnings > 0) {
      this.log('\n⚠️  WARNINGS:', 'warning');
      this.results
        .filter(r => r.status === 'WARNING')
        .forEach(result => {
          this.log(`   • ${result.test}: ${result.message}`, 'warning');
        });
    }

    // Configuration guide
    this.generateConfigurationGuide();

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: { total: this.results.length, passed, failed, warnings, skipped },
      results: this.results,
      configured_providers: configuredProviders,
      recommendations: this.generateRecommendations()
    };

    require('fs').writeFileSync('oauth-flow-report.json', JSON.stringify(report, null, 2));
    this.log(`\n📊 Detailed report saved to: oauth-flow-report.json`, 'info');

    return failed === 0;
  }

  generateConfigurationGuide() {
    this.log('\n=== OAUTH CONFIGURATION GUIDE ===', 'info');
    
    const unconfiguredProviders = Object.entries(this.providers)
      .filter(([_, config]) => !config.clientId || !config.clientSecret)
      .map(([name, _]) => name);

    if (unconfiguredProviders.length > 0) {
      this.log('\n📝 To configure OAuth providers:', 'info');
      
      unconfiguredProviders.forEach(provider => {
        switch (provider) {
          case 'google':
            this.log(`\n🔵 GOOGLE OAuth Setup:`, 'info');
            this.log(`   1. Go to Google Cloud Console: https://console.cloud.google.com/`, 'info');
            this.log(`   2. Create/select a project`, 'info');
            this.log(`   3. Enable Google+ API`, 'info');
            this.log(`   4. Create OAuth 2.0 credentials`, 'info');
            this.log(`   5. Add authorized redirect URIs:`, 'info');
            this.log(`      - ${this.supabaseUrl}/auth/v1/callback`, 'info');
            this.log(`      - http://localhost:3000/auth/callback (for development)`, 'info');
            this.log(`   6. Add to .env.local:`, 'info');
            this.log(`      GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com`, 'info');
            this.log(`      GOOGLE_CLIENT_SECRET=your_client_secret`, 'info');
            break;
            
          case 'github':
            this.log(`\n⚫ GITHUB OAuth Setup:`, 'info');
            this.log(`   1. Go to GitHub Settings: https://github.com/settings/developers`, 'info');
            this.log(`   2. Create a new OAuth App`, 'info');
            this.log(`   3. Set Authorization callback URL:`, 'info');
            this.log(`      - ${this.supabaseUrl}/auth/v1/callback`, 'info');
            this.log(`   4. Add to .env.local:`, 'info');
            this.log(`      GITHUB_CLIENT_ID=your_client_id`, 'info');
            this.log(`      GITHUB_CLIENT_SECRET=your_client_secret`, 'info');
            break;
            
          case 'discord':
            this.log(`\n🟣 DISCORD OAuth Setup:`, 'info');
            this.log(`   1. Go to Discord Developer Portal: https://discord.com/developers/applications`, 'info');
            this.log(`   2. Create a new application`, 'info');
            this.log(`   3. Go to OAuth2 section`, 'info');
            this.log(`   4. Add redirect URI:`, 'info');
            this.log(`      - ${this.supabaseUrl}/auth/v1/callback`, 'info');
            this.log(`   5. Add to .env.local:`, 'info');
            this.log(`      DISCORD_CLIENT_ID=your_client_id`, 'info');
            this.log(`      DISCORD_CLIENT_SECRET=your_client_secret`, 'info');
            break;
        }
      });
      
      this.log(`\n⚠️  Don't forget to enable these providers in your Supabase Dashboard:`, 'warning');
      this.log(`   Authentication → Providers → Configure each provider`, 'info');
    }
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Check for common issues
    const hasFailedProviders = this.results.some(r => r.status === 'FAIL' && r.test.includes('config'));
    const hasEndpointIssues = this.results.some(r => r.status === 'FAIL' && r.test.includes('endpoints'));
    const hasRedirectIssues = this.results.some(r => r.status === 'WARNING' && r.test.includes('redirect'));

    if (hasFailedProviders) {
      recommendations.push('Complete OAuth provider configuration in environment variables');
      recommendations.push('Enable OAuth providers in Supabase Dashboard → Authentication → Providers');
    }

    if (hasEndpointIssues) {
      recommendations.push('Check your internet connection and firewall settings');
      recommendations.push('Verify OAuth provider service status');
    }

    if (hasRedirectIssues) {
      recommendations.push('Update redirect URLs to use HTTPS in production');
      recommendations.push('Ensure redirect URLs are registered with OAuth providers');
      recommendations.push('Test OAuth flow in both development and production environments');
    }

    recommendations.push('Test complete OAuth flow manually in a browser');
    recommendations.push('Monitor OAuth success/failure rates in production');
    
    return recommendations;
  }

  async run() {
    console.log(`${colors.bright}${colors.cyan}
╔══════════════════════════════════════════════════════════════╗
║                    OAUTH FLOW TESTING                       ║
║                                                              ║
║  This diagnostic will test OAuth provider configurations,   ║
║  endpoints, redirect URLs, and Supabase OAuth integration.  ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}`);

    try {
      // Initialize client
      if (!await this.initializeClient()) {
        return false;
      }

      // Run all OAuth tests
      await this.checkProviderConfiguration();
      await this.testProviderEndpoints();
      await this.testSupabaseOAuthConfiguration();
      await this.testRedirectURLs();
      await this.testOAuthScopes();

      return this.generateReport();

    } catch (error) {
      this.log(`❌ OAuth test suite error: ${error.message}`, 'error');
      return false;
    }
  }
}

// Run the diagnostic if called directly
if (require.main === module) {
  const tester = new OAuthFlowTester();
  tester.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = OAuthFlowTester;