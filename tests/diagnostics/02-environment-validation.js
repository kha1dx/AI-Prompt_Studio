#!/usr/bin/env node

/**
 * Environment Variable Validation Diagnostic
 * 
 * This script performs comprehensive validation of all environment variables
 * required for authentication and provides detailed configuration guidance.
 */

const fs = require('fs');
const path = require('path');

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

class EnvironmentValidator {
  constructor() {
    this.envPath = '.env.local';
    this.results = [];
    this.loadEnvironment();
  }

  loadEnvironment() {
    try {
      require('dotenv').config({ path: this.envPath });
      this.log(`✅ Environment file loaded: ${this.envPath}`, 'success');
    } catch (error) {
      this.log(`❌ Failed to load environment file: ${error.message}`, 'error');
    }
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

  addResult(category, variable, status, message, value = null, severity = 'normal') {
    this.results.push({
      category,
      variable,
      status,
      message,
      value: value ? this.maskSensitiveValue(variable, value) : null,
      severity,
      timestamp: new Date().toISOString()
    });
  }

  maskSensitiveValue(variable, value) {
    if (variable.toLowerCase().includes('key') || 
        variable.toLowerCase().includes('secret') ||
        variable.toLowerCase().includes('password')) {
      if (value.length <= 8) return '***';
      return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
    }
    return value;
  }

  validateSupabaseVariables() {
    this.log('\n=== SUPABASE CONFIGURATION VALIDATION ===', 'header');
    
    const supabaseVars = [
      {
        name: 'NEXT_PUBLIC_SUPABASE_URL',
        required: true,
        type: 'url',
        pattern: /^https:\/\/[a-zA-Z0-9-]+\.supabase\.co$/,
        description: 'Your Supabase project URL'
      },
      {
        name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        required: true,
        type: 'jwt',
        pattern: /^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
        description: 'Anonymous/public API key for client-side usage'
      },
      {
        name: 'SUPABASE_SERVICE_ROLE_KEY',
        required: false,
        type: 'jwt',
        pattern: /^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
        description: 'Service role key for server-side operations (optional but recommended)'
      }
    ];

    for (const envVar of supabaseVars) {
      const value = process.env[envVar.name];
      
      if (!value) {
        if (envVar.required) {
          this.log(`❌ ${envVar.name}: MISSING (CRITICAL)`, 'error');
          this.addResult('supabase', envVar.name, 'FAIL', 'Required variable is missing', null, 'critical');
        } else {
          this.log(`⚠️  ${envVar.name}: OPTIONAL (Not set)`, 'warning');
          this.addResult('supabase', envVar.name, 'WARNING', 'Optional variable not set');
        }
        continue;
      }

      // Check for placeholder values
      if (this.isPlaceholderValue(value)) {
        this.log(`❌ ${envVar.name}: PLACEHOLDER VALUE`, 'error');
        this.addResult('supabase', envVar.name, 'FAIL', 'Contains placeholder value - needs to be replaced', value, 'critical');
        continue;
      }

      // Validate format
      if (envVar.pattern && !envVar.pattern.test(value)) {
        this.log(`❌ ${envVar.name}: INVALID FORMAT`, 'error');
        this.addResult('supabase', envVar.name, 'FAIL', `Invalid format for ${envVar.type}`, value, 'high');
        continue;
      }

      // Type-specific validation
      let validationResult = true;
      switch (envVar.type) {
        case 'url':
          validationResult = this.validateUrl(value, envVar.name);
          break;
        case 'jwt':
          validationResult = this.validateJWT(value, envVar.name);
          break;
      }

      if (validationResult) {
        this.log(`✅ ${envVar.name}: VALID`, 'success');
        this.addResult('supabase', envVar.name, 'PASS', 'Valid configuration', value);
      }
    }
  }

  validateAuthVariables() {
    this.log('\n=== AUTHENTICATION CONFIGURATION VALIDATION ===', 'header');
    
    const authVars = [
      {
        name: 'NEXTAUTH_URL',
        required: false,
        type: 'url',
        description: 'Base URL for NextAuth (usually http://localhost:3000 for development)'
      },
      {
        name: 'NEXTAUTH_SECRET',
        required: false,
        type: 'secret',
        minLength: 32,
        description: 'Secret for NextAuth JWT encryption'
      }
    ];

    let usingNextAuth = false;

    for (const envVar of authVars) {
      const value = process.env[envVar.name];
      
      if (value) {
        usingNextAuth = true;
      }

      if (!value) {
        if (envVar.required) {
          this.log(`❌ ${envVar.name}: MISSING (REQUIRED)`, 'error');
          this.addResult('auth', envVar.name, 'FAIL', 'Required variable is missing', null, 'high');
        } else {
          this.log(`ℹ️  ${envVar.name}: Not configured`, 'info');
          this.addResult('auth', envVar.name, 'INFO', 'Optional variable not set');
        }
        continue;
      }

      // Validate based on type
      switch (envVar.type) {
        case 'url':
          if (this.validateUrl(value, envVar.name)) {
            this.log(`✅ ${envVar.name}: VALID`, 'success');
            this.addResult('auth', envVar.name, 'PASS', 'Valid URL configuration', value);
          }
          break;
          
        case 'secret':
          if (this.isPlaceholderValue(value)) {
            this.log(`❌ ${envVar.name}: PLACEHOLDER VALUE`, 'error');
            this.addResult('auth', envVar.name, 'FAIL', 'Contains placeholder value', value, 'high');
          } else if (value.length < envVar.minLength) {
            this.log(`❌ ${envVar.name}: TOO SHORT (minimum ${envVar.minLength} characters)`, 'error');
            this.addResult('auth', envVar.name, 'FAIL', `Secret too short (${value.length}/${envVar.minLength})`, value, 'high');
          } else {
            this.log(`✅ ${envVar.name}: VALID`, 'success');
            this.addResult('auth', envVar.name, 'PASS', 'Valid secret configuration', value);
          }
          break;
      }
    }

    if (usingNextAuth) {
      this.log('ℹ️  NextAuth configuration detected', 'info');
    } else {
      this.log('ℹ️  Using Supabase Auth only (recommended)', 'info');
    }
  }

  validateOAuthProviders() {
    this.log('\n=== OAUTH PROVIDERS VALIDATION ===', 'header');
    
    const oauthVars = [
      {
        provider: 'google',
        vars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']
      },
      {
        provider: 'github',
        vars: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET']
      },
      {
        provider: 'discord',
        vars: ['DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET']
      }
    ];

    let configuredProviders = 0;

    for (const provider of oauthVars) {
      const clientId = process.env[provider.vars[0]];
      const clientSecret = process.env[provider.vars[1]];

      if (!clientId && !clientSecret) {
        this.log(`ℹ️  ${provider.provider.toUpperCase()}: Not configured`, 'info');
        continue;
      }

      configuredProviders++;
      
      if (!clientId) {
        this.log(`❌ ${provider.provider.toUpperCase()}: Missing client ID`, 'error');
        this.addResult('oauth', provider.vars[0], 'FAIL', 'Client ID missing', null, 'high');
      } else if (this.isPlaceholderValue(clientId)) {
        this.log(`❌ ${provider.provider.toUpperCase()}: Placeholder client ID`, 'error');
        this.addResult('oauth', provider.vars[0], 'FAIL', 'Contains placeholder value', clientId, 'high');
      } else {
        this.log(`✅ ${provider.provider.toUpperCase()}: Client ID configured`, 'success');
        this.addResult('oauth', provider.vars[0], 'PASS', 'Valid client ID', clientId);
      }

      if (!clientSecret) {
        this.log(`❌ ${provider.provider.toUpperCase()}: Missing client secret`, 'error');
        this.addResult('oauth', provider.vars[1], 'FAIL', 'Client secret missing', null, 'high');
      } else if (this.isPlaceholderValue(clientSecret)) {
        this.log(`❌ ${provider.provider.toUpperCase()}: Placeholder client secret`, 'error');
        this.addResult('oauth', provider.vars[1], 'FAIL', 'Contains placeholder value', clientSecret, 'high');
      } else {
        this.log(`✅ ${provider.provider.toUpperCase()}: Client secret configured`, 'success');
        this.addResult('oauth', provider.vars[1], 'PASS', 'Valid client secret', clientSecret);
      }
    }

    if (configuredProviders === 0) {
      this.log('ℹ️  No OAuth providers configured - using email/password only', 'info');
    } else {
      this.log(`✅ ${configuredProviders} OAuth provider(s) configured`, 'success');
    }
  }

  validateEmailConfiguration() {
    this.log('\n=== EMAIL CONFIGURATION VALIDATION ===', 'header');
    
    const emailVars = [
      'EMAIL_FROM',
      'EMAIL_SERVER_USER',
      'EMAIL_SERVER_PASSWORD',
      'EMAIL_SERVER_HOST',
      'EMAIL_SERVER_PORT'
    ];

    let emailConfigured = false;

    for (const varName of emailVars) {
      const value = process.env[varName];
      if (value) {
        emailConfigured = true;
        break;
      }
    }

    if (!emailConfigured) {
      this.log('ℹ️  No custom email configuration found', 'info');
      this.log('ℹ️  Using Supabase default email service', 'info');
      this.addResult('email', 'email_service', 'INFO', 'Using Supabase default email service');
    } else {
      this.log('📧 Custom email configuration detected', 'info');
      
      for (const varName of emailVars) {
        const value = process.env[varName];
        
        if (!value) {
          this.log(`❌ ${varName}: MISSING`, 'error');
          this.addResult('email', varName, 'FAIL', 'Required for custom email setup', null, 'high');
        } else if (this.isPlaceholderValue(value)) {
          this.log(`❌ ${varName}: PLACEHOLDER VALUE`, 'error');
          this.addResult('email', varName, 'FAIL', 'Contains placeholder value', value, 'high');
        } else {
          this.log(`✅ ${varName}: CONFIGURED`, 'success');
          this.addResult('email', varName, 'PASS', 'Custom email variable configured', value);
        }
      }
    }
  }

  validateUrl(url, varName) {
    try {
      const urlObj = new URL(url);
      
      if (urlObj.protocol !== 'https:' && urlObj.protocol !== 'http:') {
        this.log(`❌ ${varName}: Invalid protocol (${urlObj.protocol})`, 'error');
        this.addResult('validation', varName, 'FAIL', `Invalid protocol: ${urlObj.protocol}`, url, 'high');
        return false;
      }

      if (varName === 'NEXT_PUBLIC_SUPABASE_URL' && !urlObj.hostname.includes('.supabase.co')) {
        this.log(`⚠️  ${varName}: Custom domain detected`, 'warning');
        this.addResult('validation', varName, 'WARNING', 'Using custom domain - ensure proper configuration', url);
      }

      return true;
    } catch (error) {
      this.log(`❌ ${varName}: Invalid URL format`, 'error');
      this.addResult('validation', varName, 'FAIL', `Invalid URL: ${error.message}`, url, 'high');
      return false;
    }
  }

  validateJWT(token, varName) {
    const parts = token.split('.');
    
    if (parts.length !== 3) {
      this.log(`❌ ${varName}: Invalid JWT format (expected 3 parts, got ${parts.length})`, 'error');
      this.addResult('validation', varName, 'FAIL', 'Invalid JWT format', token, 'high');
      return false;
    }

    try {
      // Decode header and payload (don't verify signature as we don't have the secret)
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

      // Check expiration
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        this.log(`❌ ${varName}: JWT is expired`, 'error');
        this.addResult('validation', varName, 'FAIL', 'JWT token is expired', token, 'critical');
        return false;
      }

      // Check issuer for Supabase tokens
      if (payload.iss && !payload.iss.includes('supabase')) {
        this.log(`⚠️  ${varName}: Unexpected JWT issuer: ${payload.iss}`, 'warning');
        this.addResult('validation', varName, 'WARNING', `Unexpected issuer: ${payload.iss}`, token);
      }

      // Check role
      if (varName === 'NEXT_PUBLIC_SUPABASE_ANON_KEY' && payload.role !== 'anon') {
        this.log(`❌ ${varName}: Expected 'anon' role, got '${payload.role}'`, 'error');
        this.addResult('validation', varName, 'FAIL', `Incorrect role: ${payload.role}`, token, 'high');
        return false;
      }

      if (varName === 'SUPABASE_SERVICE_ROLE_KEY' && payload.role !== 'service_role') {
        this.log(`❌ ${varName}: Expected 'service_role', got '${payload.role}'`, 'error');
        this.addResult('validation', varName, 'FAIL', `Incorrect role: ${payload.role}`, token, 'high');
        return false;
      }

      this.log(`✅ ${varName}: Valid JWT (role: ${payload.role}, expires: ${new Date(payload.exp * 1000).toLocaleDateString()})`, 'success');
      return true;
      
    } catch (error) {
      this.log(`❌ ${varName}: JWT decode error: ${error.message}`, 'error');
      this.addResult('validation', varName, 'FAIL', `JWT decode error: ${error.message}`, token, 'high');
      return false;
    }
  }

  isPlaceholderValue(value) {
    const placeholders = [
      'your_supabase',
      'YOUR_SUPABASE',
      'your_nextauth',
      'YOUR_NEXTAUTH',
      'your_google',
      'YOUR_GOOGLE',
      'your_github',
      'YOUR_GITHUB',
      'replace_me',
      'REPLACE_ME',
      'changeme',
      'CHANGEME',
      'example.com',
      'localhost:3000',
      'your_secret_here'
    ];

    return placeholders.some(placeholder => value.includes(placeholder));
  }

  checkEnvironmentFileExistence() {
    this.log('\n=== ENVIRONMENT FILE VALIDATION ===', 'header');
    
    const envFiles = ['.env.local', '.env', '.env.development', '.env.production'];
    let foundFiles = [];

    for (const file of envFiles) {
      if (fs.existsSync(file)) {
        foundFiles.push(file);
        const stats = fs.statSync(file);
        this.log(`✅ Found: ${file} (${stats.size} bytes, modified: ${stats.mtime.toISOString()})`, 'success');
      }
    }

    if (foundFiles.length === 0) {
      this.log('❌ No environment files found!', 'error');
      this.addResult('file_check', 'env_files', 'FAIL', 'No environment files found', null, 'critical');
      return false;
    }

    if (foundFiles.length > 1) {
      this.log(`⚠️  Multiple environment files found: ${foundFiles.join(', ')}`, 'warning');
      this.log('   Note: .env.local takes precedence in Next.js', 'info');
      this.addResult('file_check', 'env_files', 'WARNING', `Multiple env files: ${foundFiles.join(', ')}`);
    }

    return true;
  }

  generateConfigurationGuide() {
    this.log('\n=== CONFIGURATION GUIDE ===', 'header');
    
    const failedItems = this.results.filter(r => r.status === 'FAIL');
    const criticalIssues = failedItems.filter(r => r.severity === 'critical');

    if (criticalIssues.length > 0) {
      this.log('\n🚨 CRITICAL CONFIGURATION ISSUES:', 'error');
      
      criticalIssues.forEach(issue => {
        this.log(`\n❌ ${issue.variable}:`, 'error');
        this.log(`   Problem: ${issue.message}`, 'error');
        
        switch (issue.variable) {
          case 'NEXT_PUBLIC_SUPABASE_URL':
            this.log(`   Solution: Go to your Supabase dashboard → Settings → API → Project URL`, 'info');
            this.log(`   Example: NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co`, 'info');
            break;
            
          case 'NEXT_PUBLIC_SUPABASE_ANON_KEY':
            this.log(`   Solution: Go to your Supabase dashboard → Settings → API → anon/public key`, 'info');
            this.log(`   Example: NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...`, 'info');
            break;
            
          case 'SUPABASE_SERVICE_ROLE_KEY':
            this.log(`   Solution: Go to your Supabase dashboard → Settings → API → service_role key`, 'info');
            this.log(`   Example: SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...`, 'info');
            break;
        }
      });
    }

    // Generate sample .env.local file
    const sampleEnvContent = this.generateSampleEnvironmentFile();
    fs.writeFileSync('.env.local.sample', sampleEnvContent);
    
    this.log('\n📝 Sample configuration saved to: .env.local.sample', 'info');
    this.log('   Copy this file to .env.local and replace placeholder values', 'info');
  }

  generateSampleEnvironmentFile() {
    return `# Supabase Configuration
# Get these values from: https://app.supabase.com/project/YOUR_PROJECT/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Next.js Configuration (optional, for NextAuth integration)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here_minimum_32_characters

# OAuth Providers (optional)
# Google OAuth - Get from: https://console.developers.google.com/
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# GitHub OAuth - Get from: https://github.com/settings/developers
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Custom Email Configuration (optional)
# EMAIL_FROM=noreply@yourapp.com
# EMAIL_SERVER_HOST=smtp.yourprovider.com
# EMAIL_SERVER_PORT=587
# EMAIL_SERVER_USER=your_smtp_user
# EMAIL_SERVER_PASSWORD=your_smtp_password
`;
  }

  generateReport() {
    const summary = {
      total: this.results.length,
      passed: this.results.filter(r => r.status === 'PASS').length,
      failed: this.results.filter(r => r.status === 'FAIL').length,
      warnings: this.results.filter(r => r.status === 'WARNING').length,
      info: this.results.filter(r => r.status === 'INFO').length,
      critical: this.results.filter(r => r.severity === 'critical').length
    };

    this.log('\n=== VALIDATION SUMMARY ===', 'header');
    this.log(`Total Variables Checked: ${summary.total}`, 'info');
    this.log(`✅ Passed: ${summary.passed}`, summary.passed > 0 ? 'success' : 'info');
    this.log(`❌ Failed: ${summary.failed}`, summary.failed > 0 ? 'error' : 'info');
    this.log(`⚠️  Warnings: ${summary.warnings}`, summary.warnings > 0 ? 'warning' : 'info');
    this.log(`ℹ️  Info: ${summary.info}`, 'info');
    this.log(`🚨 Critical Issues: ${summary.critical}`, summary.critical > 0 ? 'error' : 'success');

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary,
      results: this.results,
      recommendations: this.generateRecommendations()
    };

    fs.writeFileSync('environment-validation-report.json', JSON.stringify(report, null, 2));
    this.log(`\n📊 Detailed report saved to: environment-validation-report.json`, 'info');

    if (summary.critical > 0) {
      this.log('\n🚨 CRITICAL ISSUES MUST BE RESOLVED BEFORE PROCEEDING', 'error');
      return false;
    }

    if (summary.failed === 0 && summary.critical === 0) {
      this.log('\n🎉 ENVIRONMENT VALIDATION PASSED!', 'success');
      return true;
    }

    return false;
  }

  generateRecommendations() {
    const recommendations = [];
    const issues = this.results.filter(r => r.status === 'FAIL' || r.status === 'WARNING');

    issues.forEach(issue => {
      switch (issue.category) {
        case 'supabase':
          recommendations.push('Review your Supabase project configuration in the dashboard');
          break;
        case 'auth':
          recommendations.push('Configure authentication settings properly');
          break;
        case 'oauth':
          recommendations.push('Set up OAuth providers in their respective developer consoles');
          break;
        case 'email':
          recommendations.push('Configure email settings for transactional emails');
          break;
      }
    });

    return [...new Set(recommendations)];
  }

  async run() {
    console.log(`${colors.bright}${colors.cyan}
╔══════════════════════════════════════════════════════════════╗
║              ENVIRONMENT VARIABLE VALIDATION                 ║
║                                                              ║
║  Comprehensive validation of all authentication and         ║
║  configuration environment variables.                       ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}`);

    this.checkEnvironmentFileExistence();
    this.validateSupabaseVariables();
    this.validateAuthVariables();
    this.validateOAuthProviders();
    this.validateEmailConfiguration();
    this.generateConfigurationGuide();
    
    return this.generateReport();
  }
}

// Run the diagnostic if called directly
if (require.main === module) {
  const validator = new EnvironmentValidator();
  validator.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = EnvironmentValidator;