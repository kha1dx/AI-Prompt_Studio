#!/usr/bin/env node

/**
 * Comprehensive Diagnostic Runner
 * 
 * This script runs all authentication diagnostic tests in sequence
 * and provides a comprehensive report of the system's health.
 */

const fs = require('fs');
const path = require('path');

// Import all diagnostic modules
const ConnectionHealthChecker = require('./01-connection-health');
const EnvironmentValidator = require('./02-environment-validation');
const AuthenticationFlowTester = require('./03-authentication-flow');
const EmailServiceTester = require('./04-email-service');
const OAuthFlowTester = require('./05-oauth-flow');
const DatabasePolicyTester = require('./06-database-policy');
const ErrorScenarioTester = require('./07-error-scenarios');

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

class ComprehensiveDiagnosticRunner {
  constructor() {
    this.diagnostics = [
      {
        name: 'Connection Health',
        class: ConnectionHealthChecker,
        description: 'Tests basic connectivity and environment setup',
        critical: true,
        weight: 2
      },
      {
        name: 'Environment Validation',
        class: EnvironmentValidator,
        description: 'Validates all environment variables and configuration',
        critical: true,
        weight: 2
      },
      {
        name: 'Authentication Flow',
        class: AuthenticationFlowTester,
        description: 'Tests complete authentication workflows',
        critical: true,
        weight: 3
      },
      {
        name: 'Email Service',
        class: EmailServiceTester,
        description: 'Verifies email configuration and delivery',
        critical: false,
        weight: 1
      },
      {
        name: 'OAuth Flow',
        class: OAuthFlowTester,
        description: 'Tests OAuth provider integrations',
        critical: false,
        weight: 1
      },
      {
        name: 'Database Policy & RLS',
        class: DatabasePolicyTester,
        description: 'Tests database security and access controls',
        critical: true,
        weight: 2
      },
      {
        name: 'Error Scenarios',
        class: ErrorScenarioTester,
        description: 'Tests error handling and system resilience',
        critical: false,
        weight: 1
      }
    ];

    this.results = [];
    this.startTime = Date.now();
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const color = {
      'info': colors.blue,
      'success': colors.green,
      'warning': colors.yellow,
      'error': colors.red,
      'header': colors.magenta,
      'subheader': colors.cyan
    }[level] || colors.reset;

    console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
  }

  async runSingleDiagnostic(diagnostic) {
    this.log(`\n${'='.repeat(80)}`, 'header');
    this.log(`RUNNING: ${diagnostic.name.toUpperCase()}`, 'header');
    this.log(`Description: ${diagnostic.description}`, 'info');
    this.log(`Critical: ${diagnostic.critical ? 'YES' : 'NO'}`, diagnostic.critical ? 'error' : 'info');
    this.log(`${'='.repeat(80)}`, 'header');

    const startTime = Date.now();
    
    try {
      const tester = new diagnostic.class();
      const success = await tester.run();
      const duration = Date.now() - startTime;

      const result = {
        name: diagnostic.name,
        description: diagnostic.description,
        success,
        critical: diagnostic.critical,
        weight: diagnostic.weight,
        duration,
        timestamp: new Date().toISOString()
      };

      if (success) {
        this.log(`✅ ${diagnostic.name} COMPLETED SUCCESSFULLY (${duration}ms)`, 'success');
      } else {
        this.log(`❌ ${diagnostic.name} FAILED (${duration}ms)`, 'error');
        if (diagnostic.critical) {
          this.log(`🚨 CRITICAL FAILURE - This may prevent the application from working properly`, 'error');
        }
      }

      this.results.push(result);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.log(`💥 ${diagnostic.name} CRASHED: ${error.message} (${duration}ms)`, 'error');
      
      const result = {
        name: diagnostic.name,
        description: diagnostic.description,
        success: false,
        critical: diagnostic.critical,
        weight: diagnostic.weight,
        duration,
        error: error.message,
        timestamp: new Date().toISOString()
      };

      this.results.push(result);
      return result;
    }
  }

  calculateOverallScore() {
    let totalWeight = 0;
    let successWeight = 0;

    this.results.forEach(result => {
      totalWeight += result.weight;
      if (result.success) {
        successWeight += result.weight;
      }
    });

    return totalWeight > 0 ? Math.round((successWeight / totalWeight) * 100) : 0;
  }

  calculateHealthGrade(score) {
    if (score >= 90) return { grade: 'A+', status: 'Excellent', color: 'success' };
    if (score >= 80) return { grade: 'A', status: 'Very Good', color: 'success' };
    if (score >= 70) return { grade: 'B', status: 'Good', color: 'success' };
    if (score >= 60) return { grade: 'C', status: 'Acceptable', color: 'warning' };
    if (score >= 50) return { grade: 'D', status: 'Poor', color: 'warning' };
    return { grade: 'F', status: 'Critical Issues', color: 'error' };
  }

  generateRecommendations() {
    const recommendations = [];
    const failedCritical = this.results.filter(r => !r.success && r.critical);
    const failedNonCritical = this.results.filter(r => !r.success && !r.critical);

    // Critical failures
    if (failedCritical.length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        message: 'Address critical system failures immediately',
        details: failedCritical.map(r => `${r.name}: ${r.error || 'Failed validation'}`)
      });
    }

    // Configuration issues
    const configurationFailures = this.results.filter(r => 
      r.name.includes('Environment') || r.name.includes('Connection')
    ).filter(r => !r.success);

    if (configurationFailures.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        message: 'Fix configuration issues',
        details: ['Check .env.local file', 'Verify Supabase project settings', 'Confirm all required environment variables are set']
      });
    }

    // Security concerns
    const securityFailures = this.results.filter(r =>
      r.name.includes('Database Policy') || r.name.includes('Error Scenarios')
    ).filter(r => !r.success);

    if (securityFailures.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        message: 'Address security vulnerabilities',
        details: ['Enable Row Level Security', 'Implement proper error handling', 'Review access controls']
      });
    }

    // Optional features
    if (failedNonCritical.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        message: 'Consider implementing optional features',
        details: failedNonCritical.map(r => `${r.name}: ${r.description}`)
      });
    }

    // General recommendations
    recommendations.push({
      priority: 'LOW',
      message: 'Regular maintenance',
      details: [
        'Run diagnostics regularly',
        'Monitor system performance',
        'Keep dependencies updated',
        'Review security settings periodically'
      ]
    });

    return recommendations;
  }

  generateExecutiveSummary() {
    const totalDuration = Date.now() - this.startTime;
    const successful = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const criticalFailed = this.results.filter(r => !r.success && r.critical).length;
    const score = this.calculateOverallScore();
    const health = this.calculateHealthGrade(score);

    return {
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      total_tests: this.results.length,
      successful,
      failed,
      critical_failures: criticalFailed,
      overall_score: score,
      health_grade: health.grade,
      health_status: health.status,
      production_ready: criticalFailed === 0 && score >= 70,
      results: this.results,
      recommendations: this.generateRecommendations()
    };
  }

  async generateDetailedReport() {
    const summary = this.generateExecutiveSummary();
    
    this.log('\n' + '╔' + '═'.repeat(78) + '╗', 'header');
    this.log('║' + ' '.repeat(25) + 'DIAGNOSTIC SUMMARY' + ' '.repeat(25) + '║', 'header');
    this.log('╚' + '═'.repeat(78) + '╝', 'header');

    this.log(`\n⏱️  Total Execution Time: ${Math.round(summary.duration / 1000)}s`, 'info');
    this.log(`📊 Tests Run: ${summary.total_tests}`, 'info');
    this.log(`✅ Successful: ${summary.successful}`, summary.successful > 0 ? 'success' : 'info');
    this.log(`❌ Failed: ${summary.failed}`, summary.failed > 0 ? 'error' : 'info');
    this.log(`🚨 Critical Failures: ${summary.critical_failures}`, summary.critical_failures > 0 ? 'error' : 'success');

    const healthColor = summary.health_grade.startsWith('A') ? 'success' : 
                       summary.health_grade.startsWith('B') || summary.health_grade.startsWith('C') ? 'warning' : 'error';
    
    this.log(`\n🎯 Overall Score: ${summary.overall_score}/100`, 'info');
    this.log(`📝 Health Grade: ${summary.health_grade} (${summary.health_status})`, healthColor);
    this.log(`🚀 Production Ready: ${summary.production_ready ? 'YES' : 'NO'}`, 
             summary.production_ready ? 'success' : 'error');

    // Detailed results
    this.log('\n📋 DETAILED RESULTS:', 'subheader');
    this.results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      const critical = result.critical ? '🚨' : '  ';
      const duration = `${result.duration}ms`.padStart(8);
      
      this.log(`${status} ${critical} ${(index + 1).toString().padStart(2)}. ${result.name.padEnd(25)} ${duration}`, 
               result.success ? 'success' : 'error');
      
      if (result.error) {
        this.log(`      Error: ${result.error}`, 'error');
      }
    });

    // Recommendations
    this.log('\n🔧 RECOMMENDATIONS:', 'subheader');
    summary.recommendations.forEach((rec, index) => {
      const priorityColor = rec.priority === 'CRITICAL' ? 'error' : 
                           rec.priority === 'HIGH' ? 'warning' : 'info';
      
      this.log(`\n${index + 1}. [${rec.priority}] ${rec.message}`, priorityColor);
      rec.details.forEach(detail => {
        this.log(`   • ${detail}`, 'info');
      });
    });

    // Next Steps
    this.log('\n🚀 NEXT STEPS:', 'subheader');
    if (summary.critical_failures > 0) {
      this.log('1. 🚨 URGENT: Fix critical failures before proceeding', 'error');
      this.log('2. Review individual test reports for specific issues', 'info');
      this.log('3. Re-run diagnostics after fixes', 'info');
    } else if (summary.overall_score < 70) {
      this.log('1. Address high-priority recommendations', 'warning');
      this.log('2. Improve system configuration and security', 'info');
      this.log('3. Test in a staging environment', 'info');
    } else {
      this.log('1. ✅ Your system looks healthy!', 'success');
      this.log('2. Consider implementing optional features', 'info');
      this.log('3. Set up regular monitoring and diagnostics', 'info');
      this.log('4. Review security settings periodically', 'info');
    }

    // Save comprehensive report
    const reportPath = `diagnostic-report-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));
    
    this.log(`\n📊 Comprehensive report saved to: ${reportPath}`, 'info');
    
    // Generate HTML report
    await this.generateHTMLReport(summary, reportPath.replace('.json', '.html'));

    return summary;
  }

  async generateHTMLReport(summary, htmlPath) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Supabase Authentication Diagnostic Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 2rem; }
        .header p { margin: 0.5rem 0 0 0; opacity: 0.9; }
        .content { padding: 2rem; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 2rem 0; }
        .metric { padding: 1rem; border-radius: 6px; text-align: center; }
        .metric h3 { margin: 0; font-size: 2rem; }
        .metric p { margin: 0.5rem 0 0 0; color: #666; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; }
        .error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
        .info { background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; }
        .test-results { margin: 2rem 0; }
        .test-item { display: flex; align-items: center; padding: 1rem; border-bottom: 1px solid #eee; }
        .test-item:last-child { border-bottom: none; }
        .test-status { font-size: 1.5rem; margin-right: 1rem; }
        .test-content { flex: 1; }
        .test-name { font-weight: bold; margin-bottom: 0.25rem; }
        .test-description { color: #666; font-size: 0.9rem; }
        .test-duration { color: #999; font-size: 0.8rem; margin-left: auto; }
        .recommendations { margin: 2rem 0; }
        .recommendation { margin: 1rem 0; padding: 1rem; border-left: 4px solid; }
        .critical { border-color: #dc3545; background: #f8d7da; }
        .high { border-color: #ffc107; background: #fff3cd; }
        .medium { border-color: #17a2b8; background: #d1ecf1; }
        .low { border-color: #28a745; background: #d4edda; }
        .footer { text-align: center; padding: 1rem; color: #666; border-top: 1px solid #eee; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Supabase Authentication Diagnostic Report</h1>
            <p>Generated on ${new Date(summary.timestamp).toLocaleString()}</p>
        </div>
        
        <div class="content">
            <div class="metric-grid">
                <div class="metric ${summary.overall_score >= 80 ? 'success' : summary.overall_score >= 60 ? 'warning' : 'error'}">
                    <h3>${summary.overall_score}/100</h3>
                    <p>Overall Score</p>
                </div>
                <div class="metric ${summary.health_grade.startsWith('A') ? 'success' : summary.health_grade.startsWith('B') || summary.health_grade.startsWith('C') ? 'warning' : 'error'}">
                    <h3>${summary.health_grade}</h3>
                    <p>${summary.health_status}</p>
                </div>
                <div class="metric ${summary.production_ready ? 'success' : 'error'}">
                    <h3>${summary.production_ready ? 'YES' : 'NO'}</h3>
                    <p>Production Ready</p>
                </div>
                <div class="metric info">
                    <h3>${Math.round(summary.duration / 1000)}s</h3>
                    <p>Execution Time</p>
                </div>
            </div>

            <div class="metric-grid">
                <div class="metric success">
                    <h3>${summary.successful}</h3>
                    <p>Tests Passed</p>
                </div>
                <div class="metric ${summary.failed > 0 ? 'error' : 'success'}">
                    <h3>${summary.failed}</h3>
                    <p>Tests Failed</p>
                </div>
                <div class="metric ${summary.critical_failures > 0 ? 'error' : 'success'}">
                    <h3>${summary.critical_failures}</h3>
                    <p>Critical Failures</p>
                </div>
                <div class="metric info">
                    <h3>${summary.total_tests}</h3>
                    <p>Total Tests</p>
                </div>
            </div>

            <div class="test-results">
                <h2>📋 Test Results</h2>
                ${summary.results.map(result => `
                    <div class="test-item">
                        <div class="test-status">${result.success ? '✅' : '❌'}${result.critical ? ' 🚨' : ''}</div>
                        <div class="test-content">
                            <div class="test-name">${result.name}</div>
                            <div class="test-description">${result.description}</div>
                            ${result.error ? `<div style="color: #dc3545; font-size: 0.9rem; margin-top: 0.25rem;">Error: ${result.error}</div>` : ''}
                        </div>
                        <div class="test-duration">${result.duration}ms</div>
                    </div>
                `).join('')}
            </div>

            <div class="recommendations">
                <h2>🔧 Recommendations</h2>
                ${summary.recommendations.map(rec => `
                    <div class="recommendation ${rec.priority.toLowerCase()}">
                        <h3>[${rec.priority}] ${rec.message}</h3>
                        <ul>
                            ${rec.details.map(detail => `<li>${detail}</li>`).join('')}
                        </ul>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="footer">
            <p>Report generated by Supabase Authentication Diagnostic Suite</p>
            <p>For technical support, review the individual test reports for detailed information.</p>
        </div>
    </div>
</body>
</html>`;

    fs.writeFileSync(htmlPath, html);
    this.log(`📄 HTML report saved to: ${htmlPath}`, 'info');
  }

  async run() {
    console.log(`${colors.bright}${colors.cyan}
╔══════════════════════════════════════════════════════════════════════════════════╗
║                                                                                  ║
║                    🔐 SUPABASE AUTHENTICATION DIAGNOSTIC SUITE                   ║
║                                                                                  ║
║  Comprehensive testing of authentication, security, and system configuration    ║
║                                                                                  ║
╚══════════════════════════════════════════════════════════════════════════════════╝
${colors.reset}`);

    this.log('Starting comprehensive diagnostic suite...', 'info');
    this.log(`Running ${this.diagnostics.length} diagnostic modules`, 'info');

    // Run all diagnostics
    for (let i = 0; i < this.diagnostics.length; i++) {
      const diagnostic = this.diagnostics[i];
      
      this.log(`\n[${i + 1}/${this.diagnostics.length}] Preparing ${diagnostic.name}...`, 'subheader');
      
      const result = await this.runSingleDiagnostic(diagnostic);
      
      // If critical test fails, ask user if they want to continue
      if (!result.success && result.critical) {
        console.log(`\n${colors.yellow}⚠️  Critical test failed. Remaining tests may not work properly.${colors.reset}`);
        console.log(`${colors.yellow}   Continue with remaining tests? (recommended: fix issues first)${colors.reset}`);
        
        // For automated runs, continue by default
        // In interactive mode, this could prompt the user
      }
    }

    // Generate and display comprehensive report
    const summary = await this.generateDetailedReport();

    // Exit with appropriate code
    const exitCode = summary.critical_failures > 0 ? 2 : 
                    summary.overall_score < 50 ? 1 : 0;

    if (exitCode === 0) {
      this.log('\n🎉 Diagnostic suite completed successfully!', 'success');
    } else if (exitCode === 1) {
      this.log('\n⚠️  Diagnostic suite completed with warnings', 'warning');
    } else {
      this.log('\n💥 Diagnostic suite found critical issues', 'error');
    }

    return { success: exitCode === 0, summary, exitCode };
  }
}

// Run the comprehensive diagnostic if called directly
if (require.main === module) {
  const runner = new ComprehensiveDiagnosticRunner();
  runner.run().then(({ success, exitCode }) => {
    process.exit(exitCode);
  }).catch(error => {
    console.error(`${colors.red}Fatal error in diagnostic runner: ${error.message}${colors.reset}`);
    console.error(error.stack);
    process.exit(3);
  });
}

module.exports = ComprehensiveDiagnosticRunner;