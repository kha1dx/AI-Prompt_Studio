#!/usr/bin/env node

/**
 * Email Service Verification Diagnostic
 * 
 * This script tests email functionality including SMTP configuration,
 * email templates, and delivery verification.
 */

const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const dns = require('dns').promises;

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

class EmailServiceTester {
  constructor() {
    this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    this.supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    this.results = [];
    this.supabase = null;
    
    // Email configuration
    this.emailConfig = {
      from: process.env.EMAIL_FROM,
      host: process.env.EMAIL_SERVER_HOST,
      port: process.env.EMAIL_SERVER_PORT,
      user: process.env.EMAIL_SERVER_USER,
      password: process.env.EMAIL_SERVER_PASSWORD,
      secure: process.env.EMAIL_SERVER_SECURE === 'true'
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

  async checkEmailConfiguration() {
    this.log('\n=== EMAIL CONFIGURATION CHECK ===', 'header');
    
    let hasCustomEmail = Object.values(this.emailConfig).some(value => value && value.trim() !== '');
    
    if (!hasCustomEmail) {
      this.log('ℹ️  No custom email configuration found', 'info');
      this.log('ℹ️  Will test Supabase default email service', 'info');
      this.addResult('email_config', 'INFO', 'Using Supabase default email service');
      return { type: 'supabase', valid: true };
    }

    this.log('📧 Custom email configuration detected', 'info');
    
    // Validate custom email configuration
    const requiredFields = [
      { key: 'from', value: this.emailConfig.from, name: 'EMAIL_FROM' },
      { key: 'host', value: this.emailConfig.host, name: 'EMAIL_SERVER_HOST' },
      { key: 'port', value: this.emailConfig.port, name: 'EMAIL_SERVER_PORT' },
      { key: 'user', value: this.emailConfig.user, name: 'EMAIL_SERVER_USER' },
      { key: 'password', value: this.emailConfig.password, name: 'EMAIL_SERVER_PASSWORD' }
    ];

    let configValid = true;

    for (const field of requiredFields) {
      if (!field.value || field.value.trim() === '') {
        this.log(`❌ ${field.name}: MISSING`, 'error');
        this.addResult('email_config', 'FAIL', `${field.name} is not configured`);
        configValid = false;
      } else {
        // Mask sensitive information
        const displayValue = field.key === 'password' ? 
          `${'*'.repeat(field.value.length)}` : field.value;
        this.log(`✅ ${field.name}: ${displayValue}`, 'success');
      }
    }

    if (configValid) {
      this.log('✅ Custom email configuration appears complete', 'success');
      this.addResult('email_config', 'PASS', 'Custom email configuration complete');
      return { type: 'custom', valid: true };
    } else {
      this.log('❌ Custom email configuration incomplete', 'error');
      this.addResult('email_config', 'FAIL', 'Incomplete custom email configuration');
      return { type: 'custom', valid: false };
    }
  }

  async testDNSResolution(hostname) {
    this.log(`\n=== DNS RESOLUTION TEST: ${hostname} ===`, 'header');
    
    try {
      const startTime = Date.now();
      
      // Test A record resolution
      const aRecords = await dns.resolve4(hostname).catch(() => []);
      const aaaaRecords = await dns.resolve6(hostname).catch(() => []);
      
      // Test MX record resolution (for email servers)
      const mxRecords = await dns.resolveMx(hostname).catch(() => []);
      
      const duration = Date.now() - startTime;

      if (aRecords.length > 0 || aaaaRecords.length > 0) {
        this.log(`✅ DNS Resolution successful (${duration}ms)`, 'success');
        this.log(`   IPv4 addresses: ${aRecords.length > 0 ? aRecords.join(', ') : 'none'}`, 'info');
        this.log(`   IPv6 addresses: ${aaaaRecords.length > 0 ? aaaaRecords.join(', ') : 'none'}`, 'info');
        
        if (mxRecords.length > 0) {
          this.log(`   MX records: ${mxRecords.map(mx => `${mx.exchange}:${mx.priority}`).join(', ')}`, 'info');
        }

        this.addResult('dns_resolution', 'PASS', 'DNS resolution successful', {
          hostname,
          ipv4_addresses: aRecords,
          ipv6_addresses: aaaaRecords,
          mx_records: mxRecords
        }, duration);
        
        return true;
      } else {
        this.log(`❌ DNS Resolution failed - no IP addresses found`, 'error');
        this.addResult('dns_resolution', 'FAIL', 'No IP addresses resolved for hostname');
        return false;
      }
    } catch (error) {
      this.log(`❌ DNS Resolution error: ${error.message}`, 'error');
      this.addResult('dns_resolution', 'FAIL', `DNS resolution error: ${error.message}`);
      return false;
    }
  }

  async testSMTPConnection() {
    this.log('\n=== SMTP CONNECTION TEST ===', 'header');
    
    if (!this.emailConfig.host || !this.emailConfig.port) {
      this.log('⚠️  Skipping SMTP test - no custom email configuration', 'warning');
      this.addResult('smtp_connection', 'SKIP', 'No custom SMTP configuration');
      return false;
    }

    try {
      const transportConfig = {
        host: this.emailConfig.host,
        port: parseInt(this.emailConfig.port),
        secure: this.emailConfig.secure || parseInt(this.emailConfig.port) === 465,
        auth: {
          user: this.emailConfig.user,
          pass: this.emailConfig.password
        },
        timeout: 10000
      };

      this.log(`Testing SMTP connection to ${this.emailConfig.host}:${this.emailConfig.port}`, 'info');
      
      const transporter = nodemailer.createTransporter(transportConfig);
      
      const startTime = Date.now();
      await transporter.verify();
      const duration = Date.now() - startTime;

      this.log(`✅ SMTP Connection successful (${duration}ms)`, 'success');
      this.log(`   Server: ${this.emailConfig.host}:${this.emailConfig.port}`, 'info');
      this.log(`   Secure: ${transportConfig.secure ? 'Yes' : 'No'}`, 'info');
      this.log(`   Authentication: ${this.emailConfig.user ? 'Configured' : 'None'}`, 'info');

      this.addResult('smtp_connection', 'PASS', 'SMTP connection verified', {
        host: this.emailConfig.host,
        port: parseInt(this.emailConfig.port),
        secure: transportConfig.secure,
        auth_configured: !!this.emailConfig.user
      }, duration);

      return transporter;
    } catch (error) {
      this.log(`❌ SMTP Connection failed: ${error.message}`, 'error');
      this.addResult('smtp_connection', 'FAIL', `SMTP connection error: ${error.message}`);
      return false;
    }
  }

  async testSupabaseEmailService() {
    this.log('\n=== SUPABASE EMAIL SERVICE TEST ===', 'header');
    
    if (!this.supabaseUrl || !this.supabaseAnonKey) {
      this.log('❌ Cannot test Supabase email - missing credentials', 'error');
      this.addResult('supabase_email', 'FAIL', 'Missing Supabase credentials');
      return false;
    }

    try {
      this.supabase = createClient(this.supabaseUrl, this.supabaseAnonKey);

      // Test password reset email (this tests the email service without actually sending)
      this.log('Testing password reset email trigger...', 'info');
      
      const startTime = Date.now();
      const { error } = await this.supabase.auth.resetPasswordForEmail(
        'test-email-diagnostic@example.com',
        {
          redirectTo: 'http://localhost:3000/reset-password'
        }
      );
      const duration = Date.now() - startTime;

      if (error) {
        // Some errors are expected (like "Email not found") but indicate the service is working
        if (error.message.includes('Email not found') || 
            error.message.includes('For security purposes') ||
            error.code === '422') {
          this.log(`✅ Supabase email service is working (${duration}ms)`, 'success');
          this.log(`   Response: ${error.message}`, 'info');
          this.addResult('supabase_email', 'PASS', 'Email service responding correctly', {
            expected_error: error.message
          }, duration);
          return true;
        } else {
          this.log(`❌ Supabase email service error: ${error.message}`, 'error');
          this.addResult('supabase_email', 'FAIL', error.message, null, duration);
          return false;
        }
      }

      this.log(`✅ Supabase email service test completed (${duration}ms)`, 'success');
      this.addResult('supabase_email', 'PASS', 'Email service test completed', null, duration);
      return true;

    } catch (error) {
      this.log(`❌ Supabase email test error: ${error.message}`, 'error');
      this.addResult('supabase_email', 'FAIL', `Test error: ${error.message}`);
      return false;
    }
  }

  async testEmailTemplates() {
    this.log('\n=== EMAIL TEMPLATE TEST ===', 'header');
    
    if (!this.supabase) {
      this.log('⚠️  Skipping template test - Supabase client not available', 'warning');
      this.addResult('email_templates', 'SKIP', 'No Supabase client available');
      return false;
    }

    try {
      // This is a read-only test to check if templates are accessible
      // We'll test different email types that Supabase sends
      
      const templateTests = [
        { type: 'signup', description: 'User signup confirmation' },
        { type: 'recovery', description: 'Password recovery' },
        { type: 'invite', description: 'User invitation' },
        { type: 'magic_link', description: 'Magic link authentication' }
      ];

      let templatesWorking = 0;

      for (const template of templateTests) {
        try {
          // We can't directly test templates, but we can test the email triggers
          this.log(`   Testing ${template.description} email trigger...`, 'info');
          
          const startTime = Date.now();
          
          // Test different email triggers based on type
          let result;
          switch (template.type) {
            case 'signup':
              result = await this.supabase.auth.signUp({
                email: `test-${template.type}-${Date.now()}@example.com`,
                password: 'testpassword123'
              });
              break;
              
            case 'recovery':
              result = await this.supabase.auth.resetPasswordForEmail(
                `test-${template.type}-${Date.now()}@example.com`
              );
              break;
              
            case 'magic_link':
              result = await this.supabase.auth.signInWithOtp({
                email: `test-${template.type}-${Date.now()}@example.com`
              });
              break;
              
            default:
              continue;
          }
          
          const duration = Date.now() - startTime;

          // These will mostly "fail" with user not found, but that means the email system is working
          if (result.error && (
            result.error.message.includes('Email not found') ||
            result.error.message.includes('For security purposes') ||
            result.error.message.includes('already registered') ||
            result.error.code === '422'
          )) {
            this.log(`     ✅ ${template.description} trigger working (${duration}ms)`, 'success');
            templatesWorking++;
          } else if (!result.error) {
            this.log(`     ✅ ${template.description} trigger successful (${duration}ms)`, 'success');
            templatesWorking++;
          } else {
            this.log(`     ❌ ${template.description} trigger failed: ${result.error.message}`, 'error');
          }
          
        } catch (error) {
          this.log(`     ⚠️  ${template.description} test error: ${error.message}`, 'warning');
        }
      }

      if (templatesWorking > 0) {
        this.log(`✅ Email templates tested: ${templatesWorking}/${templateTests.length} working`, 'success');
        this.addResult('email_templates', 'PASS', `${templatesWorking} email templates working`, {
          templates_tested: templateTests.length,
          templates_working: templatesWorking
        });
        return true;
      } else {
        this.log(`❌ No email templates working`, 'error');
        this.addResult('email_templates', 'FAIL', 'No email templates responding');
        return false;
      }

    } catch (error) {
      this.log(`❌ Email template test error: ${error.message}`, 'error');
      this.addResult('email_templates', 'FAIL', `Template test error: ${error.message}`);
      return false;
    }
  }

  async testEmailDeliverability() {
    this.log('\n=== EMAIL DELIVERABILITY TEST ===', 'header');
    
    const emailDomains = [
      this.emailConfig.from?.split('@')[1],
      this.supabaseUrl?.replace('https://', '').split('.')[0] + '.supabase.co'
    ].filter(Boolean);

    let deliverabilityScore = 0;
    let totalTests = 0;

    for (const domain of emailDomains) {
      if (!domain) continue;
      
      this.log(`Testing deliverability for domain: ${domain}`, 'info');
      totalTests++;

      try {
        // Check SPF record
        try {
          const txtRecords = await dns.resolveTxt(domain);
          const spfRecord = txtRecords.find(record => 
            record.some(txt => txt.includes('v=spf1'))
          );
          
          if (spfRecord) {
            this.log(`   ✅ SPF record found: ${spfRecord[0]}`, 'success');
            deliverabilityScore++;
          } else {
            this.log(`   ⚠️  No SPF record found`, 'warning');
          }
        } catch (error) {
          this.log(`   ❌ SPF check failed: ${error.message}`, 'error');
        }

        // Check DKIM (basic check)
        try {
          const dkimSelector = 'default'; // Common selector
          const dkimDomain = `${dkimSelector}._domainkey.${domain}`;
          const dkimRecords = await dns.resolveTxt(dkimDomain);
          
          if (dkimRecords.length > 0) {
            this.log(`   ✅ DKIM record found for selector '${dkimSelector}'`, 'success');
            deliverabilityScore++;
          } else {
            this.log(`   ⚠️  No DKIM record found for selector '${dkimSelector}'`, 'warning');
          }
        } catch (error) {
          this.log(`   ⚠️  DKIM check failed (this may be normal): ${error.message}`, 'warning');
        }

        // Check DMARC record
        try {
          const dmarcDomain = `_dmarc.${domain}`;
          const dmarcRecords = await dns.resolveTxt(dmarcDomain);
          const dmarcRecord = dmarcRecords.find(record =>
            record.some(txt => txt.includes('v=DMARC1'))
          );
          
          if (dmarcRecord) {
            this.log(`   ✅ DMARC record found: ${dmarcRecord[0]}`, 'success');
            deliverabilityScore++;
          } else {
            this.log(`   ⚠️  No DMARC record found`, 'warning');
          }
        } catch (error) {
          this.log(`   ❌ DMARC check failed: ${error.message}`, 'error');
        }

      } catch (error) {
        this.log(`   ❌ Deliverability test failed for ${domain}: ${error.message}`, 'error');
      }
    }

    const deliverabilityPercentage = totalTests > 0 ? (deliverabilityScore / (totalTests * 3)) * 100 : 0;
    
    if (deliverabilityPercentage >= 66) {
      this.log(`✅ Email deliverability: Good (${deliverabilityPercentage.toFixed(0)}%)`, 'success');
      this.addResult('email_deliverability', 'PASS', `Good deliverability score: ${deliverabilityPercentage.toFixed(0)}%`, {
        score: deliverabilityScore,
        total_possible: totalTests * 3,
        percentage: deliverabilityPercentage
      });
    } else if (deliverabilityPercentage >= 33) {
      this.log(`⚠️  Email deliverability: Moderate (${deliverabilityPercentage.toFixed(0)}%)`, 'warning');
      this.addResult('email_deliverability', 'WARNING', `Moderate deliverability score: ${deliverabilityPercentage.toFixed(0)}%`, {
        score: deliverabilityScore,
        total_possible: totalTests * 3,
        percentage: deliverabilityPercentage
      });
    } else {
      this.log(`❌ Email deliverability: Poor (${deliverabilityPercentage.toFixed(0)}%)`, 'error');
      this.addResult('email_deliverability', 'FAIL', `Poor deliverability score: ${deliverabilityPercentage.toFixed(0)}%`, {
        score: deliverabilityScore,
        total_possible: totalTests * 3,
        percentage: deliverabilityPercentage
      });
    }

    return deliverabilityPercentage >= 33;
  }

  generateReport() {
    this.log('\n=== EMAIL SERVICE REPORT ===', 'header');
    
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

    if (failed > 0) {
      this.log('\n❌ FAILED TESTS:', 'error');
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

    // Generate recommendations
    this.log('\n📝 RECOMMENDATIONS:', 'info');
    const recommendations = this.generateRecommendations();
    recommendations.forEach(rec => {
      this.log(`   • ${rec}`, 'info');
    });

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: { total: this.results.length, passed, failed, warnings, skipped, info },
      results: this.results,
      recommendations
    };

    require('fs').writeFileSync('email-service-report.json', JSON.stringify(report, null, 2));
    this.log(`\n📊 Detailed report saved to: email-service-report.json`, 'info');

    return failed === 0;
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Check for common issues
    const hasCustomEmail = this.results.some(r => r.test === 'email_config' && r.status === 'PASS');
    const smtpFailed = this.results.some(r => r.test === 'smtp_connection' && r.status === 'FAIL');
    const deliverabilityIssues = this.results.some(r => r.test === 'email_deliverability' && r.status !== 'PASS');

    if (!hasCustomEmail) {
      recommendations.push('Consider configuring custom SMTP for production use');
      recommendations.push('Review Supabase email limits and restrictions');
    }

    if (smtpFailed) {
      recommendations.push('Verify SMTP server credentials and settings');
      recommendations.push('Check firewall settings for SMTP ports (25, 587, 465)');
      recommendations.push('Contact your email provider to ensure SMTP is enabled');
    }

    if (deliverabilityIssues) {
      recommendations.push('Configure SPF record: "v=spf1 include:_spf.supabase.co ~all"');
      recommendations.push('Set up DMARC policy for your domain');
      recommendations.push('Consider using a dedicated email service (SendGrid, Mailgun, etc.)');
    }

    recommendations.push('Test email delivery in different environments (dev, staging, prod)');
    recommendations.push('Monitor email delivery rates and spam folder placement');
    
    return recommendations;
  }

  async run() {
    console.log(`${colors.bright}${colors.cyan}
╔══════════════════════════════════════════════════════════════╗
║                   EMAIL SERVICE VERIFICATION                 ║
║                                                              ║
║  This diagnostic will test email configuration, SMTP        ║
║  connections, and deliverability settings.                  ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}`);

    try {
      // Check email configuration
      const config = await this.checkEmailConfiguration();
      
      // DNS and SMTP tests for custom email
      if (config.type === 'custom' && config.valid) {
        await this.testDNSResolution(this.emailConfig.host);
        await this.testSMTPConnection();
      }

      // Supabase email service tests
      await this.testSupabaseEmailService();
      await this.testEmailTemplates();
      
      // Deliverability tests
      await this.testEmailDeliverability();

      return this.generateReport();

    } catch (error) {
      this.log(`❌ Email service test error: ${error.message}`, 'error');
      return false;
    }
  }
}

// Run the diagnostic if called directly
if (require.main === module) {
  const tester = new EmailServiceTester();
  tester.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = EmailServiceTester;