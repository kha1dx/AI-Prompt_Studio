#!/usr/bin/env node

/**
 * OAUTH PKCE TEST SUITE RUNNER
 * 
 * Node.js script to run OAuth PKCE tests from command line.
 * This eliminates the "code verifier should be non-empty" error.
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🚀 OAuth PKCE Test Suite Runner')
console.log('='.repeat(50))
console.log('This will run comprehensive tests to eliminate OAuth errors.')
console.log('')

// Check if TypeScript is available
function checkTypeScriptAvailability() {
  try {
    execSync('npx tsc --version', { stdio: 'ignore' })
    return true
  } catch {
    console.log('⚠️  TypeScript not available, attempting to install...')
    try {
      execSync('npm install -g typescript ts-node', { stdio: 'inherit' })
      return true
    } catch {
      console.error('❌ Failed to install TypeScript. Please install manually:')
      console.error('   npm install -g typescript ts-node')
      return false
    }
  }
}

// Check project structure
function checkProjectStructure() {
  const requiredFiles = [
    'tests/oauth/master-test-runner.ts',
    'tests/oauth/pkce-flow-tester.ts',
    'tests/oauth/e2e-oauth-tester.ts',
    'src/utils/testing/oauth-debugger.ts'
  ]

  console.log('🔍 Checking project structure...')
  
  for (const file of requiredFiles) {
    const filePath = path.join(process.cwd(), file)
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Missing required file: ${file}`)
      return false
    }
  }

  console.log('✅ Project structure validated')
  return true
}

// Check environment variables
function checkEnvironment() {
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ]

  console.log('🔍 Checking environment variables...')

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`❌ Missing environment variable: ${envVar}`)
      console.error('   Please set this in your .env.local file')
      return false
    }
  }

  console.log('✅ Environment variables validated')
  return true
}

// Run individual test suite
function runTestSuite(suiteName, command) {
  console.log(`\n🧪 Running ${suiteName}...`)
  console.log('-'.repeat(40))
  
  try {
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: process.cwd()
    })
    
    console.log(output)
    console.log(`✅ ${suiteName} completed successfully`)
    return true
  } catch (error) {
    console.error(`❌ ${suiteName} failed:`)
    console.error(error.stdout || error.message)
    return false
  }
}

// Main test execution
async function runTests() {
  console.log('🔧 Pre-flight checks...')
  
  // Check TypeScript availability
  if (!checkTypeScriptAvailability()) {
    process.exit(1)
  }

  // Check project structure
  if (!checkProjectStructure()) {
    console.error('\n❌ Project structure validation failed')
    console.error('Please ensure all test files are in place.')
    process.exit(1)
  }

  // Load environment variables
  try {
    require('dotenv').config({ path: '.env.local' })
  } catch {
    console.log('⚠️  dotenv not available, environment variables may not be loaded')
  }

  // Check environment
  if (!checkEnvironment()) {
    console.error('\n❌ Environment validation failed')
    console.error('Please configure your Supabase environment variables.')
    process.exit(1)
  }

  console.log('✅ All pre-flight checks passed')
  console.log('')

  // Test execution plan
  const testSuites = [
    {
      name: 'PKCE Flow Tests',
      command: 'npx ts-node -e "import(\\"./tests/oauth/pkce-flow-tester\\").then(m => new m.PKCEFlowTester().runCompleteSuite())"'
    },
    {
      name: 'Code Verifier Tests', 
      command: 'npx ts-node -e "import(\\"./src/utils/testing/code-verifier-tester\\").then(m => m.codeVerifierTester.runAllTests())"'
    },
    {
      name: 'Error Scenario Tests',
      command: 'npx ts-node -e "import(\\"./tests/oauth/error-scenario-tester\\").then(m => m.errorScenarioTester.runErrorScenarioTests())"'
    },
    {
      name: 'End-to-End Tests',
      command: 'npx ts-node -e "import(\\"./tests/oauth/e2e-oauth-tester\\").then(m => m.e2eOAuthTester.runCompleteE2ETest())"'
    },
    {
      name: 'Master Test Suite',
      command: 'npx ts-node tests/oauth/master-test-runner.ts'
    }
  ]

  console.log('🚀 Starting OAuth PKCE Test Execution...')
  console.log('='.repeat(50))

  let allTestsPassed = true
  const results = []

  // Run each test suite
  for (const suite of testSuites) {
    const startTime = Date.now()
    const success = runTestSuite(suite.name, suite.command)
    const duration = Date.now() - startTime

    results.push({
      name: suite.name,
      success,
      duration
    })

    if (!success) {
      allTestsPassed = false
    }

    // Small delay between suites
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  // Print final summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 FINAL TEST RESULTS')
  console.log('='.repeat(50))

  results.forEach(result => {
    const status = result.success ? '✅' : '❌'
    const duration = Math.round(result.duration / 1000)
    console.log(`${status} ${result.name} (${duration}s)`)
  })

  const passedTests = results.filter(r => r.success).length
  const totalTests = results.length
  const successRate = Math.round((passedTests / totalTests) * 100)

  console.log('')
  console.log(`Total Tests: ${totalTests}`)
  console.log(`Passed: ${passedTests} ✅`)
  console.log(`Failed: ${totalTests - passedTests} ${totalTests - passedTests > 0 ? '❌' : '✅'}`)
  console.log(`Success Rate: ${successRate}%`)

  if (allTestsPassed) {
    console.log('\n🎉 ALL TESTS PASSED!')
    console.log('✅ Your OAuth PKCE implementation should work correctly.')
    console.log('✅ The "code verifier should be non-empty" error should be eliminated.')
    console.log('')
    console.log('🚀 Next Steps:')
    console.log('   1. Test OAuth flow in your browser')
    console.log('   2. Monitor OAuth success rates') 
    console.log('   3. Deploy with confidence!')
    
    process.exit(0)
  } else {
    console.log('\n❌ SOME TESTS FAILED!')
    console.log('⚠️  Your OAuth implementation needs fixes.')
    console.log('')
    console.log('🔧 Recommended Actions:')
    console.log('   1. Review failed test output above')
    console.log('   2. Fix identified issues')
    console.log('   3. Re-run the test suite')
    console.log('   4. Check browser console for errors')
    console.log('   5. Verify Supabase OAuth configuration')
    
    process.exit(1)
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n\n⏹️  Test execution interrupted by user')
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  console.error('\n❌ Unexpected error during test execution:')
  console.error(error.message)
  process.exit(1)
})

// Execute tests
runTests().catch(error => {
  console.error('\n❌ Test execution failed:')
  console.error(error.message)
  process.exit(1)
})