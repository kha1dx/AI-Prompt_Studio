/**
 * Authentication Diagnostics Suite
 * Central export file for all diagnostic utilities
 */

// Connection testing
export {
  runConnectionTest,
  testEnvironmentVariables,
  testClientCreation,
  printTestResults,
  type ConnectionTestResult,
  type ConnectionTestSuite
} from './connection-test'

// Authentication logging
export {
  getAuthLogger,
  createAuthLogger,
  logAuthAttempt,
  printAuthReport,
  clearAuthLogs,
  AuthLogger,
  type AuthLogEntry,
  type AuthFlowResult
} from './auth-logger'

// Flow testing
export {
  createAuthFlowTester,
  runFullAuthTest,
  runSignupTest,
  runLoginTest,
  AuthFlowTester,
  type AuthFlowTestConfig,
  type FlowTestResult,
  type AuthTestSuite
} from './auth-flow-tester'

// Debug utilities
export {
  createDebugAuthClient,
  debugSignUp,
  debugSignIn,
  debugOAuth,
  debugGetSession,
  debugGetUser,
  DebugAuthClient,
  type DebugAuthConfig,
  type DebugAuthResult,
  type EnvironmentDebugInfo
} from './debug-auth'

// Environment validation
export {
  validateEnvironment,
  testSupabaseConnectivity,
  printEnvironmentReport,
  EnvironmentValidator,
  type EnvValidationResult,
  type EnvValidationSuite
} from './env-validator'

/**
 * Complete diagnostic suite runner
 * Runs all available diagnostics and provides comprehensive report
 */
export async function runCompleteDiagnostics(options: {
  includeFlowTests?: boolean
  includeConnectivityTests?: boolean
  testEmail?: string
  testPassword?: string
  verbose?: boolean
} = {}) {
  const {
    includeFlowTests = true,
    includeConnectivityTests = true,
    testEmail,
    testPassword,
    verbose = true
  } = options

  console.log('🚀 STARTING COMPLETE AUTHENTICATION DIAGNOSTICS')
  console.log('=' .repeat(80))
  console.log('This will run a comprehensive test of your authentication setup...')
  console.log('')

  const results = {
    environment: null as any,
    connection: null as any,
    flows: null as any,
    connectivity: null as any,
    startTime: Date.now(),
    endTime: 0,
    success: false,
    summary: {
      totalTests: 0,
      passedTests: 0,
      errors: [] as string[]
    }
  }

  try {
    // 1. Environment validation
    console.log('📋 Step 1: Validating Environment Variables...')
    const { validateEnvironment } = await import('./env-validator')
    results.environment = await validateEnvironment()
    results.summary.totalTests += results.environment.results.length
    results.summary.passedTests += results.environment.overall.validCount

    if (verbose) {
      const { printEnvironmentReport } = await import('./env-validator')
      await printEnvironmentReport()
    }

    // 2. Connectivity test
    if (includeConnectivityTests) {
      console.log('\n🔌 Step 2: Testing Supabase Connectivity...')
      const { testSupabaseConnectivity } = await import('./env-validator')
      results.connectivity = await testSupabaseConnectivity()
      results.summary.totalTests += 1
      if (results.connectivity.canConnect) {
        results.summary.passedTests += 1
      } else {
        results.summary.errors.push(`Connectivity: ${results.connectivity.errorMessage}`)
      }
    }

    // 3. Connection tests
    console.log('\n🔍 Step 3: Running Connection Tests...')
    const { runConnectionTest } = await import('./connection-test')
    results.connection = await runConnectionTest()
    results.summary.totalTests += Object.keys(results.connection).length - 1 // -1 for overall
    results.summary.passedTests += Object.values(results.connection)
      .filter((result: any) => result.success && result !== results.connection.overall).length

    if (verbose) {
      const { printTestResults } = await import('./connection-test')
      printTestResults(results.connection)
    }

    // 4. Authentication flow tests
    if (includeFlowTests && results.environment.overall.success) {
      console.log('\n🔑 Step 4: Testing Authentication Flows...')
      const { runFullAuthTest } = await import('./auth-flow-tester')
      
      const flowConfig = {
        testEmail: testEmail || `test.${Date.now()}@example.com`,
        testPassword: testPassword || 'TestPassword123!',
        debugMode: verbose,
        skipCleanup: false
      }

      results.flows = await runFullAuthTest(flowConfig)
      results.summary.totalTests += results.flows.overall.totalTests
      results.summary.passedTests += results.flows.overall.passedTests

      if (verbose) {
        const tester = await import('./auth-flow-tester')
        const flowTester = tester.createAuthFlowTester(flowConfig)
        flowTester.printResults(results.flows)
      }
    }

    results.endTime = Date.now()
    results.success = results.summary.passedTests === results.summary.totalTests

    // Final summary
    console.log('\n🏁 DIAGNOSTICS COMPLETE')
    console.log('=' .repeat(80))
    console.log(`Overall Status: ${results.success ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`)
    console.log(`Tests Passed: ${results.summary.passedTests}/${results.summary.totalTests}`)
    console.log(`Total Duration: ${results.endTime - results.startTime}ms`)

    if (results.summary.errors.length > 0) {
      console.log('\n❌ ERRORS FOUND:')
      results.summary.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`)
      })
    }

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:')
    if (!results.environment.overall.success) {
      console.log('1. Fix environment variable issues first')
      console.log('2. Ensure Supabase project is properly configured')
      console.log('3. Check that your .env.local file is in the project root')
    }

    if (results.connectivity && !results.connectivity.canConnect) {
      console.log('4. Check your internet connection')
      console.log('5. Verify Supabase project is not paused/suspended')
      console.log('6. Check firewall settings')
    }

    if (results.flows && !results.flows.overall.success) {
      console.log('7. Check Supabase Auth settings')
      console.log('8. Verify email templates are configured')
      console.log('9. Check OAuth provider settings')
    }

    console.log('\n📚 NEXT STEPS:')
    console.log('1. Fix any critical issues identified above')
    console.log('2. Test authentication in your application')
    console.log('3. Monitor auth logs for ongoing issues')
    console.log('4. Set up proper error handling in production')

    console.log('=' .repeat(80))

    return results

  } catch (error) {
    results.endTime = Date.now()
    console.error('❌ Diagnostics failed:', error)
    results.summary.errors.push(`Diagnostics error: ${error instanceof Error ? error.message : String(error)}`)
    return results
  }
}

/**
 * Quick health check - runs essential tests only
 */
export async function quickHealthCheck() {
  console.log('⚡ QUICK AUTHENTICATION HEALTH CHECK')
  console.log('=' .repeat(50))

  try {
    // Environment check
    const { validateEnvironment } = await import('./env-validator')
    const envResults = await validateEnvironment()
    
    if (!envResults.overall.success) {
      console.log('❌ Environment configuration issues found')
      envResults.overall.criticalIssues.forEach(issue => console.log(`  - ${issue}`))
      return false
    }

    // Basic connection test
    const { testSupabaseConnectivity } = await import('./env-validator')
    const connectivity = await testSupabaseConnectivity()
    
    if (!connectivity.canConnect) {
      console.log('❌ Cannot connect to Supabase')
      console.log(`  Error: ${connectivity.errorMessage}`)
      return false
    }

    // Quick auth service check
    const { createDebugAuthClient } = await import('./debug-auth')
    const debugClient = createDebugAuthClient({ enableVerboseLogging: false })
    const sessionResult = await debugClient.debugGetSession()
    
    if (!sessionResult.success) {
      console.log('❌ Auth service not responding properly')
      console.log(`  Error: ${sessionResult.error?.message}`)
      return false
    }

    console.log('✅ All basic checks passed!')
    console.log(`   - Environment: OK`)
    console.log(`   - Connectivity: OK (${connectivity.responseTime}ms)`)
    console.log(`   - Auth Service: OK`)
    console.log('=' .repeat(50))
    
    return true

  } catch (error) {
    console.log('❌ Health check failed')
    console.log(`  Error: ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
}

/**
 * Live monitoring setup - for ongoing debugging
 */
export function setupLiveMonitoring() {
  console.log('📡 Setting up live authentication monitoring...')
  
  if (typeof window === 'undefined') {
    console.log('⚠️  Live monitoring is only available in browser environment')
    return null
  }

  const { getAuthLogger } = require('./auth-logger')
  const logger = getAuthLogger(true)

  // Override console methods to capture auth-related logs
  const originalLog = console.log
  const originalError = console.error

  console.log = (...args) => {
    const message = args.join(' ')
    if (message.includes('auth') || message.includes('supabase') || message.includes('login') || message.includes('signup')) {
      logger.logAuthAttempt('system-log', true, { message, args, timestamp: Date.now() })
    }
    originalLog.apply(console, args)
  }

  console.error = (...args) => {
    const message = args.join(' ')
    if (message.includes('auth') || message.includes('supabase') || message.includes('login') || message.includes('signup')) {
      logger.logAuthAttempt('system-error', false, { message, args, timestamp: Date.now() }, new Error(message))
    }
    originalError.apply(console, args)
  }

  console.log('✅ Live monitoring active - all auth logs will be captured')
  
  return {
    stop: () => {
      console.log = originalLog
      console.error = originalError
      console.log('📡 Live monitoring stopped')
    },
    getReport: () => logger.generateReport(),
    printReport: () => logger.printReport(),
    clearLogs: () => logger.clearLogs()
  }
}