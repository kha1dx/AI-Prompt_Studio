#!/usr/bin/env node

/**
 * Quick Diagnostic Runner
 * 
 * This script provides easy access to the diagnostic suite from the project root.
 * It automatically navigates to the diagnostics directory and runs the tests.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

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

function log(message, level = 'info') {
  const color = {
    'info': colors.blue,
    'success': colors.green,
    'warning': colors.yellow,
    'error': colors.red,
    'header': colors.magenta
  }[level] || colors.reset;

  console.log(`${color}${message}${colors.reset}`);
}

async function runDiagnostics() {
  const diagnosticsDir = path.join(__dirname, 'tests', 'diagnostics');
  const runnerScript = path.join(diagnosticsDir, 'run-all-diagnostics.js');

  // Check if diagnostics directory exists
  if (!fs.existsSync(diagnosticsDir)) {
    log('❌ Diagnostics directory not found!', 'error');
    log('   Expected: tests/diagnostics/', 'error');
    process.exit(1);
  }

  // Check if runner script exists
  if (!fs.existsSync(runnerScript)) {
    log('❌ Diagnostic runner script not found!', 'error');
    log('   Expected: tests/diagnostics/run-all-diagnostics.js', 'error');
    process.exit(1);
  }

  log('🔐 Starting Supabase Authentication Diagnostic Suite...', 'header');
  log(`📁 Running from: ${diagnosticsDir}`, 'info');

  // Change to diagnostics directory and run the suite
  process.chdir(diagnosticsDir);
  
  const args = process.argv.slice(2);
  const child = spawn('node', ['run-all-diagnostics.js', ...args], {
    stdio: 'inherit',
    cwd: diagnosticsDir
  });

  child.on('close', (code) => {
    if (code === 0) {
      log('\n🎉 Diagnostic suite completed successfully!', 'success');
    } else if (code === 1) {
      log('\n⚠️  Diagnostic suite completed with warnings', 'warning');
    } else if (code === 2) {
      log('\n💥 Critical issues found - please review the results', 'error');
    } else {
      log('\n❌ Diagnostic suite encountered an error', 'error');
    }
    process.exit(code);
  });

  child.on('error', (error) => {
    log(`❌ Failed to start diagnostic suite: ${error.message}`, 'error');
    process.exit(1);
  });
}

// Show usage information
function showUsage() {
  log('🔐 Supabase Authentication Diagnostic Suite', 'header');
  log('\nUsage:', 'info');
  log('  npm run diagnostics              # Run all diagnostics', 'info');
  log('  node run-diagnostics.js          # Run all diagnostics', 'info');
  log('\nAvailable individual tests:', 'info');
  log('  cd tests/diagnostics && node 01-connection-health.js', 'info');
  log('  cd tests/diagnostics && node 02-environment-validation.js', 'info');
  log('  cd tests/diagnostics && node 03-authentication-flow.js', 'info');
  log('  cd tests/diagnostics && node 04-email-service.js', 'info');
  log('  cd tests/diagnostics && node 05-oauth-flow.js', 'info');
  log('  cd tests/diagnostics && node 06-database-policy.js', 'info');
  log('  cd tests/diagnostics && node 07-error-scenarios.js', 'info');
  log('\nFor more information, see: tests/diagnostics/README.md', 'info');
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  showUsage();
  process.exit(0);
}

// Run the diagnostics
runDiagnostics().catch(error => {
  log(`❌ Unexpected error: ${error.message}`, 'error');
  process.exit(1);
});