/**
 * Authentication Flow Testing Utility
 * Comprehensive testing for signup, login, email confirmation, and OAuth flows
 */
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient, AuthError, User, Session } from '@supabase/supabase-js'
import { AuthLogger, type AuthFlowResult } from './auth-logger'

export interface AuthFlowTestConfig {
  testEmail?: string
  testPassword?: string
  skipCleanup?: boolean
  debugMode?: boolean
  timeoutMs?: number
}

export interface FlowTestResult {
  flowName: string
  success: boolean
  steps: Array<{
    step: string
    success: boolean
    duration: number
    error?: string
    details?: Record<string, any>
  }>
  totalDuration: number
  error?: AuthError | Error
  user?: User
  session?: Session
}

export interface AuthTestSuite {
  config: AuthFlowTestConfig
  results: {
    connectionTest: FlowTestResult
    signupFlow: FlowTestResult
    loginFlow: FlowTestResult
    logoutFlow: FlowTestResult
    emailConfirmationFlow?: FlowTestResult
    oauthFlow?: FlowTestResult
    passwordResetFlow?: FlowTestResult
  }
  overall: {
    success: boolean
    passedTests: number
    totalTests: number
    totalDuration: number
    errors: string[]
  }
}

class AuthFlowTester {
  private client: SupabaseClient
  private logger: AuthLogger
  private config: AuthFlowTestConfig
  private testUser: { email: string; password: string; id?: string }

  constructor(config: AuthFlowTestConfig = {}) {
    this.config = {
      testEmail: config.testEmail || `test.${Date.now()}@example.com`,
      testPassword: config.testPassword || 'TestPassword123!',
      skipCleanup: config.skipCleanup || false,
      debugMode: config.debugMode !== false, // Default to true
      timeoutMs: config.timeoutMs || 30000,
      ...config
    }

    this.testUser = {
      email: this.config.testEmail!,
      password: this.config.testPassword!
    }

    this.logger = new AuthLogger(this.config.debugMode)
    
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration not found. Check environment variables.')
    }

    this.client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false, // Disable auto-refresh for testing
        persistSession: false,   // Don't persist sessions during testing
        detectSessionInUrl: false,
        debug: this.config.debugMode
      }
    })

    this.log('info', 'Auth Flow Tester initialized', {
      testEmail: this.testUser.email,
      debugMode: this.config.debugMode,
      timeout: this.config.timeoutMs
    })
  }

  private log(level: 'info' | 'warn' | 'error' | 'success', message: string, details?: any) {
    const icons = { info: '🔧', warn: '⚠️', error: '❌', success: '✅' }
    if (this.config.debugMode) {
      console.log(`${icons[level]} [FLOW-TEST] ${message}`)
      if (details) {
        console.log('  Details:', details)
      }
    }
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs)
    })

    return Promise.race([promise, timeoutPromise])
  }

  private async executeStep(stepName: string, operation: () => Promise<any>): Promise<{
    step: string
    success: boolean
    duration: number
    error?: string
    details?: Record<string, any>
    result?: any
  }> {
    const startTime = Date.now()
    this.log('info', `Executing step: ${stepName}`)
    
    try {
      const result = await this.withTimeout(operation(), this.config.timeoutMs!, stepName)
      const duration = Date.now() - startTime
      
      this.log('success', `Step completed: ${stepName} (${duration}ms)`)
      
      return {
        step: stepName,
        success: true,
        duration,
        result
      }
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      this.log('error', `Step failed: ${stepName} (${duration}ms)`, { error: errorMessage })
      
      return {
        step: stepName,
        success: false,
        duration,
        error: errorMessage,
        details: error instanceof Error ? { stack: error.stack } : {}
      }
    }
  }

  async testConnectionFlow(): Promise<FlowTestResult> {
    this.log('info', '🔌 Testing Connection Flow...')
    const startTime = Date.now()
    const steps: FlowTestResult['steps'] = []

    // Step 1: Test basic client connection
    const connectionStep = await this.executeStep('Basic Connection', async () => {
      const { data, error } = await this.client.auth.getSession()
      if (error) throw error
      return { hasSession: !!data.session }
    })
    steps.push(connectionStep)

    // Step 2: Test auth service availability
    const authServiceStep = await this.executeStep('Auth Service Check', async () => {
      const { data, error } = await this.client.auth.getUser()
      // No error expected even without user
      return { service: 'available', hasUser: !!data.user, error: error?.message }
    })
    steps.push(authServiceStep)

    const success = steps.every(step => step.success)
    const totalDuration = Date.now() - startTime

    return {
      flowName: 'Connection Test',
      success,
      steps,
      totalDuration,
      error: success ? undefined : new Error('Connection test failed')
    }
  }

  async testSignupFlow(): Promise<FlowTestResult> {
    this.log('info', '📝 Testing Signup Flow...')
    const startTime = Date.now()
    const steps: FlowTestResult['steps'] = []

    // Step 1: Attempt signup
    const signupStep = await this.executeStep('User Signup', async () => {
      this.logger.startTimer('signUp')
      const response = await this.client.auth.signUp({
        email: this.testUser.email,
        password: this.testUser.password,
        options: {
          emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/auth/callback`
        }
      })

      await this.logger.logSignUp(this.testUser.email, this.testUser.password, response)

      if (response.error) {
        throw response.error
      }

      if (response.data.user) {
        this.testUser.id = response.data.user.id
      }

      return {
        user: response.data.user,
        session: response.data.session,
        needsConfirmation: !response.data.session && response.data.user && !response.data.user.email_confirmed_at
      }
    })
    steps.push(signupStep)

    // Step 2: Check user creation
    if (signupStep.success && signupStep.result?.user) {
      const userVerificationStep = await this.executeStep('User Verification', async () => {
        const { data, error } = await this.client.auth.getUser()
        return {
          userExists: !!data.user,
          userId: data.user?.id,
          emailConfirmed: !!data.user?.email_confirmed_at,
          error: error?.message
        }
      })
      steps.push(userVerificationStep)
    }

    const success = steps.every(step => step.success)
    const totalDuration = Date.now() - startTime
    const lastResult = steps[steps.length - 1]?.result

    return {
      flowName: 'Signup Flow',
      success,
      steps,
      totalDuration,
      user: lastResult?.user || signupStep.result?.user,
      session: lastResult?.session || signupStep.result?.session,
      error: success ? undefined : new Error(`Signup flow failed at: ${steps.find(s => !s.success)?.step}`)
    }
  }

  async testLoginFlow(): Promise<FlowTestResult> {
    this.log('info', '🔑 Testing Login Flow...')
    const startTime = Date.now()
    const steps: FlowTestResult['steps'] = []

    // Step 1: Attempt login
    const loginStep = await this.executeStep('User Login', async () => {
      this.logger.startTimer('signIn')
      const response = await this.client.auth.signInWithPassword({
        email: this.testUser.email,
        password: this.testUser.password
      })

      await this.logger.logSignIn(this.testUser.email, this.testUser.password, response)

      if (response.error) {
        throw response.error
      }

      return {
        user: response.data.user,
        session: response.data.session,
        hasValidSession: !!response.data.session?.access_token
      }
    })
    steps.push(loginStep)

    // Step 2: Verify session
    if (loginStep.success && loginStep.result?.session) {
      const sessionVerificationStep = await this.executeStep('Session Verification', async () => {
        const { data, error } = await this.client.auth.getSession()
        await this.logger.logSessionCheck(data, error || undefined)
        
        return {
          hasSession: !!data.session,
          sessionValid: !!data.session?.access_token,
          userId: data.session?.user?.id,
          expiresAt: data.session?.expires_at
        }
      })
      steps.push(sessionVerificationStep)
    }

    // Step 3: Test authenticated request
    if (loginStep.success) {
      const authRequestStep = await this.executeStep('Authenticated Request', async () => {
        const { data, error } = await this.client.auth.getUser()
        
        return {
          userRetrieved: !!data.user,
          userId: data.user?.id,
          email: data.user?.email,
          error: error?.message
        }
      })
      steps.push(authRequestStep)
    }

    const success = steps.every(step => step.success)
    const totalDuration = Date.now() - startTime
    const loginResult = loginStep.result

    return {
      flowName: 'Login Flow',
      success,
      steps,
      totalDuration,
      user: loginResult?.user,
      session: loginResult?.session,
      error: success ? undefined : new Error(`Login flow failed at: ${steps.find(s => !s.success)?.step}`)
    }
  }

  async testLogoutFlow(): Promise<FlowTestResult> {
    this.log('info', '🚪 Testing Logout Flow...')
    const startTime = Date.now()
    const steps: FlowTestResult['steps'] = []

    // Step 1: Check current session before logout
    const preLogoutStep = await this.executeStep('Pre-Logout Session Check', async () => {
      const { data } = await this.client.auth.getSession()
      return {
        hadSession: !!data.session,
        userId: data.session?.user?.id
      }
    })
    steps.push(preLogoutStep)

    // Step 2: Perform logout
    const logoutStep = await this.executeStep('User Logout', async () => {
      const response = await this.client.auth.signOut()
      await this.logger.logSignOut(response)
      
      if (response.error) {
        throw response.error
      }

      return { logoutSuccessful: true }
    })
    steps.push(logoutStep)

    // Step 3: Verify session is cleared
    const postLogoutStep = await this.executeStep('Post-Logout Session Check', async () => {
      const { data } = await this.client.auth.getSession()
      return {
        hasSession: !!data.session,
        sessionCleared: !data.session
      }
    })
    steps.push(postLogoutStep)

    const success = steps.every(step => step.success) && postLogoutStep.result?.sessionCleared
    const totalDuration = Date.now() - startTime

    return {
      flowName: 'Logout Flow',
      success,
      steps,
      totalDuration,
      error: success ? undefined : new Error('Logout flow failed - session not properly cleared')
    }
  }

  async testOAuthFlow(provider: 'google' | 'github' = 'google'): Promise<FlowTestResult> {
    this.log('info', `🔗 Testing ${provider} OAuth Flow...`)
    const startTime = Date.now()
    const steps: FlowTestResult['steps'] = []

    // Note: OAuth testing is limited in automated testing since it requires user interaction
    const oauthStep = await this.executeStep('OAuth Configuration Test', async () => {
      try {
        // Test OAuth configuration without actual redirect
        const { error } = await this.client.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/auth/callback`,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent'
            }
          }
        })

        // In a real app, this would redirect, but in tests we can check for configuration errors
        return {
          configurationValid: !error || !error.message.includes('configuration'),
          provider,
          error: error?.message
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('redirect')) {
          // This is expected in a test environment
          return {
            configurationValid: true,
            provider,
            note: 'OAuth would redirect in real environment'
          }
        }
        throw error
      }
    })
    steps.push(oauthStep)

    const success = steps.every(step => step.success)
    const totalDuration = Date.now() - startTime

    return {
      flowName: `${provider} OAuth Flow`,
      success,
      steps,
      totalDuration,
      error: success ? undefined : new Error(`OAuth flow test failed for ${provider}`)
    }
  }

  async runFullTestSuite(): Promise<AuthTestSuite> {
    this.log('info', '🚀 Starting Full Authentication Test Suite')
    console.log('=' .repeat(60))
    
    const results = {
      connectionTest: await this.testConnectionFlow(),
      signupFlow: await this.testSignupFlow(),
      loginFlow: await this.testLoginFlow(),
      logoutFlow: await this.testLogoutFlow(),
      oauthFlow: await this.testOAuthFlow()
    }

    // Calculate overall results
    const testResults = Object.values(results)
    const passedTests = testResults.filter(result => result.success).length
    const totalTests = testResults.length
    const totalDuration = testResults.reduce((sum, result) => sum + result.totalDuration, 0)
    const errors = testResults.filter(result => !result.success).map(result => 
      `${result.flowName}: ${result.error?.message || 'Unknown error'}`
    )

    const overall = {
      success: passedTests === totalTests,
      passedTests,
      totalTests,
      totalDuration,
      errors
    }

    console.log('=' .repeat(60))
    this.log(overall.success ? 'success' : 'warn', 
      `Test Suite Complete: ${passedTests}/${totalTests} flows passed (${totalDuration}ms total)`
    )

    if (!this.config.skipCleanup) {
      await this.cleanup()
    }

    return {
      config: this.config,
      results,
      overall
    }
  }

  async cleanup(): Promise<void> {
    this.log('info', '🧹 Cleaning up test data...')
    
    try {
      // Sign out any active sessions
      await this.client.auth.signOut()
      
      // Note: User deletion would require admin privileges
      // In a real test environment, you might want to use a test-specific database
      // or implement user cleanup through your backend admin functions
      
      this.log('success', 'Cleanup completed')
    } catch (error) {
      this.log('warn', 'Cleanup encountered issues', { error: error instanceof Error ? error.message : error })
    }
  }

  printResults(suite: AuthTestSuite): void {
    console.log('\n📊 AUTHENTICATION TEST SUITE RESULTS')
    console.log('=' .repeat(60))
    console.log(`Overall Status: ${suite.overall.success ? '✅ Passed' : '❌ Failed'}`)
    console.log(`Tests Passed: ${suite.overall.passedTests}/${suite.overall.totalTests}`)
    console.log(`Total Duration: ${suite.overall.totalDuration}ms`)
    console.log(`Test Email: ${suite.config.testEmail}`)

    console.log('\n📋 FLOW RESULTS:')
    Object.values(suite.results).forEach(result => {
      const icon = result.success ? '✅' : '❌'
      console.log(`${icon} ${result.flowName} (${result.totalDuration}ms)`)
      
      result.steps.forEach((step, index) => {
        const stepIcon = step.success ? '  ✓' : '  ✗'
        console.log(`${stepIcon} ${index + 1}. ${step.step} (${step.duration}ms)`)
        if (!step.success && step.error) {
          console.log(`     Error: ${step.error}`)
        }
      })
    })

    if (suite.overall.errors.length > 0) {
      console.log('\n❌ ERRORS:')
      suite.overall.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`)
      })
    }

    console.log('=' .repeat(60))
    
    // Print auth logger report
    this.logger.printReport()
  }
}

// Export functions for easy use
export const createAuthFlowTester = (config?: AuthFlowTestConfig): AuthFlowTester => {
  return new AuthFlowTester(config)
}

export const runFullAuthTest = async (config?: AuthFlowTestConfig): Promise<AuthTestSuite> => {
  const tester = new AuthFlowTester(config)
  return await tester.runFullTestSuite()
}

export const runSignupTest = async (email?: string, password?: string): Promise<FlowTestResult> => {
  const tester = new AuthFlowTester({ testEmail: email, testPassword: password })
  return await tester.testSignupFlow()
}

export const runLoginTest = async (email?: string, password?: string): Promise<FlowTestResult> => {
  const tester = new AuthFlowTester({ testEmail: email, testPassword: password })
  return await tester.testLoginFlow()
}

export { AuthFlowTester }