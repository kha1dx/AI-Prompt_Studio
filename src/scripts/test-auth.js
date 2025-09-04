#!/usr/bin/env node

/**
 * Authentication Test CLI Script
 * Run from command line to test authentication functionality
 * Usage: node src/scripts/test-auth.js [command] [options]
 */

const { execSync } = require('child_process')
const path = require('path')

// Commands
const commands = {
  'quick': 'Run quick health check',
  'full': 'Run complete diagnostics suite',
  'env': 'Validate environment variables',
  'connection': 'Test Supabase connection',
  'flows': 'Test authentication flows',
  'help': 'Show this help message'
}

function showHelp() {
  console.log('🔐 Authentication Test CLI')
  console.log('=' .repeat(50))
  console.log('Available commands:')
  console.log('')
  
  Object.entries(commands).forEach(([cmd, desc]) => {
    console.log(`  ${cmd.padEnd(12)} ${desc}`)
  })
  
  console.log('')
  console.log('Examples:')
  console.log('  node src/scripts/test-auth.js quick')
  console.log('  node src/scripts/test-auth.js full')
  console.log('  node src/scripts/test-auth.js env')
  console.log('')
  console.log('Options:')
  console.log('  --email     Test email for flow tests')
  console.log('  --password  Test password for flow tests')
  console.log('  --verbose   Enable verbose output')
  console.log('')
}

async function runQuickCheck() {
  console.log('⚡ Running Quick Health Check...')
  
  try {
    // Run the test using node with ES modules
    const script = `
      import { quickHealthCheck } from './src/utils/diagnostics/index.js';
      quickHealthCheck().then(result => {
        process.exit(result ? 0 : 1);
      }).catch(error => {
        console.error('Error:', error.message);
        process.exit(1);
      });
    `
    
    execSync(`node --input-type=module -e "${script}"`, {
      stdio: 'inherit',
      cwd: process.cwd()
    })
    
    console.log('✅ Quick check completed successfully')
  } catch (error) {
    console.error('❌ Quick check failed')
    process.exit(1)
  }
}

async function runFullDiagnostics(options) {
  console.log('🚀 Running Full Diagnostics Suite...')
  
  try {
    const script = `
      import { runCompleteDiagnostics } from './src/utils/diagnostics/index.js';
      const config = {
        includeFlowTests: true,
        includeConnectivityTests: true,
        testEmail: '${options.email || ''}',
        testPassword: '${options.password || ''}',
        verbose: ${options.verbose || false}
      };
      runCompleteDiagnostics(config).then(result => {
        process.exit(result.success ? 0 : 1);
      }).catch(error => {
        console.error('Error:', error.message);
        process.exit(1);
      });
    `
    
    execSync(`node --input-type=module -e "${script}"`, {
      stdio: 'inherit',
      cwd: process.cwd()
    })
    
    console.log('✅ Full diagnostics completed successfully')
  } catch (error) {
    console.error('❌ Full diagnostics failed')
    process.exit(1)
  }
}

async function runEnvValidation() {
  console.log('📋 Running Environment Validation...')
  
  try {
    const script = `
      import { printEnvironmentReport } from './src/utils/diagnostics/index.js';
      printEnvironmentReport().then(() => {
        console.log('Environment validation completed');
      }).catch(error => {
        console.error('Error:', error.message);
        process.exit(1);
      });
    `
    
    execSync(`node --input-type=module -e "${script}"`, {
      stdio: 'inherit',
      cwd: process.cwd()
    })
  } catch (error) {
    console.error('❌ Environment validation failed')
    process.exit(1)
  }
}

async function runConnectionTest() {
  console.log('🔌 Running Connection Test...')
  
  try {
    const script = `
      import { runConnectionTest, printTestResults } from './src/utils/diagnostics/index.js';
      runConnectionTest().then(results => {
        printTestResults(results);
        process.exit(results.overall.success ? 0 : 1);
      }).catch(error => {
        console.error('Error:', error.message);
        process.exit(1);
      });
    `
    
    execSync(`node --input-type=module -e "${script}"`, {
      stdio: 'inherit',
      cwd: process.cwd()
    })
  } catch (error) {
    console.error('❌ Connection test failed')
    process.exit(1)
  }
}

async function runFlowTests(options) {
  console.log('🔑 Running Authentication Flow Tests...')
  
  try {
    const script = `
      import { runFullAuthTest } from './src/utils/diagnostics/index.js';
      const config = {
        testEmail: '${options.email || ''}',
        testPassword: '${options.password || ''}',
        debugMode: ${options.verbose || false},
        skipCleanup: false
      };
      runFullAuthTest(config).then(results => {
        console.log('Flow tests completed');
        process.exit(results.overall.success ? 0 : 1);
      }).catch(error => {
        console.error('Error:', error.message);
        process.exit(1);
      });
    `
    
    execSync(`node --input-type=module -e "${script}"`, {
      stdio: 'inherit',
      cwd: process.cwd()
    })
  } catch (error) {
    console.error('❌ Flow tests failed')
    process.exit(1)
  }
}

function parseArgs(args) {
  const options = {}
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const value = args[i + 1]
      if (value && !value.startsWith('--')) {
        options[key] = value
        i++ // Skip the value
      } else {
        options[key] = true
      }
    }
  }
  
  return options
}

async function main() {
  const args = process.argv.slice(2)
  const command = args[0] || 'help'
  const options = parseArgs(args.slice(1))
  
  // Check if we're in the right directory
  const packageJsonPath = path.join(process.cwd(), 'package.json')
  try {
    const packageJson = require(packageJsonPath)
    if (!packageJson.dependencies || !packageJson.dependencies['@supabase/supabase-js']) {
      console.error('❌ This script must be run from the root of a Next.js project with Supabase')
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Could not find package.json. Run this script from your project root.')
    process.exit(1)
  }
  
  // Load environment variables
  try {
    require('dotenv').config({ path: '.env.local' })
  } catch (error) {
    // dotenv might not be installed, that's ok
  }
  
  console.log('🔐 Authentication Test CLI')
  console.log(`Running command: ${command}`)
  console.log('')
  
  switch (command) {
    case 'quick':
      await runQuickCheck()
      break
      
    case 'full':
      await runFullDiagnostics(options)
      break
      
    case 'env':
      await runEnvValidation()
      break
      
    case 'connection':
      await runConnectionTest()
      break
      
    case 'flows':
      await runFlowTests(options)
      break
      
    case 'help':
    default:
      showHelp()
      break
  }
}

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error.message)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// Run the main function
main().catch(error => {
  console.error('❌ Script failed:', error.message)
  process.exit(1)
})