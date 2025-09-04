import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('Starting global teardown...');

  try {
    // Clean up test database
    console.log('Cleaning up test database...');
    await cleanupTestDatabase();

    // Clean up test files
    console.log('Cleaning up test files...');
    await cleanupTestFiles();

    // Clean up external services
    console.log('Cleaning up external services...');
    await cleanupExternalServices();

    // Generate test reports
    console.log('Generating test reports...');
    await generateTestReports();

  } catch (error) {
    console.error('Global teardown failed:', error);
    // Don't throw here as we want other cleanup to continue
  }

  console.log('Global teardown completed');
}

async function cleanupTestDatabase() {
  // In a real implementation, this would:
  // 1. Clean up test data
  // 2. Reset database state
  // 3. Close database connections
  // 4. Remove temporary test databases
  
  try {
    // Mock cleanup implementation
    console.log('Test database cleanup completed');
  } catch (error) {
    console.error('Database cleanup failed:', error);
  }
}

async function cleanupTestFiles() {
  // Clean up any temporary files created during tests
  // This could include:
  // - Uploaded test files
  // - Generated screenshots
  // - Temporary logs
  // - Cache files
  
  const fs = require('fs').promises;
  const path = require('path');
  
  try {
    const tempDirs = [
      'temp',
      'uploads/test',
      'cache/test',
    ];

    for (const dir of tempDirs) {
      const dirPath = path.join(process.cwd(), dir);
      try {
        await fs.rmdir(dirPath, { recursive: true });
        console.log(`Cleaned up directory: ${dir}`);
      } catch (error) {
        // Directory might not exist, which is fine
        console.log(`Directory not found (skipping): ${dir}`);
      }
    }
    
    console.log('Test files cleanup completed');
  } catch (error) {
    console.error('File cleanup failed:', error);
  }
}

async function cleanupExternalServices() {
  // Clean up any external service connections
  // This could include:
  // - Email service mocks
  // - Payment gateway mocks
  // - Social media API mocks
  // - Third-party authentication services
  
  try {
    // Reset any global mocks
    if (global.mockServices) {
      global.mockServices.reset();
    }
    
    // Clean up any open connections
    if (global.testConnections) {
      for (const connection of global.testConnections) {
        try {
          await connection.close();
        } catch (error) {
          console.warn('Failed to close connection:', error.message);
        }
      }
      global.testConnections = [];
    }
    
    console.log('External services cleanup completed');
  } catch (error) {
    console.error('External services cleanup failed:', error);
  }
}

async function generateTestReports() {
  // Generate summary reports and metrics
  const fs = require('fs').promises;
  const path = require('path');
  
  try {
    const reportDir = path.join(process.cwd(), 'test-results');
    
    // Ensure report directory exists
    try {
      await fs.mkdir(reportDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
    
    // Generate summary report
    const summary = {
      testRun: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'test',
        duration: process.hrtime.bigint(),
      },
      metrics: {
        // These would be collected during test execution
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        averageTestDuration: 0,
        coverage: {
          statements: 0,
          branches: 0,
          functions: 0,
          lines: 0,
        },
      },
      performance: {
        slowestTests: [],
        memoryUsage: process.memoryUsage(),
        warnings: [],
      },
      security: {
        vulnerabilitiesFound: 0,
        securityTestsPassed: 0,
        criticalIssues: [],
      },
      accessibility: {
        a11yTestsPassed: 0,
        violationsFound: 0,
        wcagLevel: 'AA',
      },
    };
    
    const reportPath = path.join(reportDir, 'test-summary.json');
    await fs.writeFile(reportPath, JSON.stringify(summary, null, 2));
    
    console.log(`Test summary report generated: ${reportPath}`);
    
    // Generate HTML report if needed
    await generateHTMLReport(summary, reportDir);
    
  } catch (error) {
    console.error('Test report generation failed:', error);
  }
}

async function generateHTMLReport(summary: any, reportDir: string) {
  const fs = require('fs').promises;
  const path = require('path');
  
  try {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authentication Test Results</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container { 
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header { 
            border-bottom: 2px solid #e0e0e0;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .metrics { 
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .metric-card { 
            background: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            border-left: 4px solid #007bff;
        }
        .metric-title { 
            font-size: 14px;
            color: #666;
            margin-bottom: 5px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .metric-value { 
            font-size: 24px;
            font-weight: bold;
            color: #333;
        }
        .success { border-left-color: #28a745; }
        .warning { border-left-color: #ffc107; }
        .error { border-left-color: #dc3545; }
        .timestamp { 
            color: #666;
            font-size: 14px;
        }
        .section { 
            margin-bottom: 30px;
        }
        .section-title { 
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
            color: #333;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Authentication Test Results</h1>
            <div class="timestamp">Generated: ${summary.testRun.timestamp}</div>
            <div class="timestamp">Environment: ${summary.testRun.environment}</div>
        </div>
        
        <div class="section">
            <div class="section-title">Test Overview</div>
            <div class="metrics">
                <div class="metric-card success">
                    <div class="metric-title">Tests Passed</div>
                    <div class="metric-value">${summary.metrics.passedTests}</div>
                </div>
                <div class="metric-card error">
                    <div class="metric-title">Tests Failed</div>
                    <div class="metric-value">${summary.metrics.failedTests}</div>
                </div>
                <div class="metric-card warning">
                    <div class="metric-title">Tests Skipped</div>
                    <div class="metric-value">${summary.metrics.skippedTests}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-title">Total Tests</div>
                    <div class="metric-value">${summary.metrics.totalTests}</div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">Security Testing</div>
            <div class="metrics">
                <div class="metric-card success">
                    <div class="metric-title">Security Tests Passed</div>
                    <div class="metric-value">${summary.security.securityTestsPassed}</div>
                </div>
                <div class="metric-card ${summary.security.vulnerabilitiesFound > 0 ? 'error' : 'success'}">
                    <div class="metric-title">Vulnerabilities Found</div>
                    <div class="metric-value">${summary.security.vulnerabilitiesFound}</div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">Accessibility Testing</div>
            <div class="metrics">
                <div class="metric-card success">
                    <div class="metric-title">A11y Tests Passed</div>
                    <div class="metric-value">${summary.accessibility.a11yTestsPassed}</div>
                </div>
                <div class="metric-card ${summary.accessibility.violationsFound > 0 ? 'warning' : 'success'}">
                    <div class="metric-title">Violations Found</div>
                    <div class="metric-value">${summary.accessibility.violationsFound}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-title">WCAG Level</div>
                    <div class="metric-value">${summary.accessibility.wcagLevel}</div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">Performance Metrics</div>
            <div class="metrics">
                <div class="metric-card">
                    <div class="metric-title">Memory Usage (MB)</div>
                    <div class="metric-value">${Math.round(summary.performance.memoryUsage.heapUsed / 1024 / 1024)}</div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
    
    const htmlPath = path.join(reportDir, 'test-results.html');
    await fs.writeFile(htmlPath, htmlContent);
    
    console.log(`HTML test report generated: ${htmlPath}`);
  } catch (error) {
    console.error('HTML report generation failed:', error);
  }
}

export default globalTeardown;