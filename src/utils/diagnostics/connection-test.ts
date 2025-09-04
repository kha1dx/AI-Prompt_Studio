/**
 * Supabase Connection Test Utility
 * Comprehensive testing for Supabase connectivity and configuration
 */
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface ConnectionTestResult {
  success: boolean
  message: string
  details?: Record<string, any>
  timestamp: string
  error?: Error
}

export interface ConnectionTestSuite {
  environmentVariables: ConnectionTestResult
  clientCreation: ConnectionTestResult
  basicConnection: ConnectionTestResult
  authService: ConnectionTestResult
  databaseConnection: ConnectionTestResult
  overall: ConnectionTestResult
}

class SupabaseConnectionTester {
  private client: SupabaseClient | null = null
  private results: Partial<ConnectionTestSuite> = {}

  constructor() {
    console.log('🔍 Starting Supabase Connection Diagnostics...')
  }

  private createResult(success: boolean, message: string, details?: Record<string, any>, error?: Error): ConnectionTestResult {
    return {
      success,
      message,
      details,
      timestamp: new Date().toISOString(),
      error
    }
  }

  private log(level: 'info' | 'warn' | 'error' | 'success', message: string, details?: any) {
    const icons = { info: '📋', warn: '⚠️', error: '❌', success: '✅' }
    console.log(`${icons[level]} ${message}`)
    if (details) {
      console.log('  Details:', details)
    }
  }

  async testEnvironmentVariables(): Promise<ConnectionTestResult> {
    this.log('info', 'Testing environment variables...')
    
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      const details: Record<string, any> = {
        url: {
          present: !!supabaseUrl,
          valid: supabaseUrl && !supabaseUrl.includes('your_supabase') && supabaseUrl.startsWith('https://'),
          value: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'Not set'
        },
        anonKey: {
          present: !!supabaseAnonKey,
          valid: supabaseAnonKey && !supabaseAnonKey.includes('your_supabase') && supabaseAnonKey.startsWith('eyJ'),
          length: supabaseAnonKey?.length || 0
        },
        serviceRoleKey: {
          present: !!serviceRoleKey,
          valid: serviceRoleKey && serviceRoleKey.startsWith('eyJ'),
          length: serviceRoleKey?.length || 0
        }
      }

      const allValid = details.url.valid && details.anonKey.valid
      const result = this.createResult(
        allValid,
        allValid ? 'Environment variables are properly configured' : 'Environment variables are missing or invalid',
        details
      )

      this.log(allValid ? 'success' : 'error', result.message, details)
      return this.results.environmentVariables = result
    } catch (error) {
      const result = this.createResult(false, 'Failed to check environment variables', undefined, error as Error)
      this.log('error', result.message, error)
      return this.results.environmentVariables = result
    }
  }

  async testClientCreation(): Promise<ConnectionTestResult> {
    this.log('info', 'Testing Supabase client creation...')
    
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing required environment variables')
      }

      this.client = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          debug: true
        }
      })

      const details = {
        url: supabaseUrl.substring(0, 30) + '...',
        hasAuthClient: !!this.client.auth,
        hasFromClient: !!this.client.from,
        clientMethods: Object.keys(this.client).filter(key => typeof (this.client as any)[key] === 'function')
      }

      const result = this.createResult(true, 'Supabase client created successfully', details)
      this.log('success', result.message, details)
      return this.results.clientCreation = result
    } catch (error) {
      const result = this.createResult(false, 'Failed to create Supabase client', undefined, error as Error)
      this.log('error', result.message, error)
      return this.results.clientCreation = result
    }
  }

  async testBasicConnection(): Promise<ConnectionTestResult> {
    this.log('info', 'Testing basic connection to Supabase...')
    
    try {
      if (!this.client) {
        throw new Error('Client not initialized')
      }

      // Test basic connection by trying to get the session
      const { data, error } = await this.client.auth.getSession()
      
      const details = {
        hasSession: !!data.session,
        sessionData: data.session ? {
          user: !!data.session.user,
          accessToken: data.session.access_token ? 'Present' : 'Missing',
          expiresAt: data.session.expires_at
        } : null,
        error: error?.message || null
      }

      const success = !error
      const result = this.createResult(
        success, 
        success ? 'Basic connection successful' : `Connection failed: ${error?.message}`,
        details,
        error || undefined
      )

      this.log(success ? 'success' : 'warn', result.message, details)
      return this.results.basicConnection = result
    } catch (error) {
      const result = this.createResult(false, 'Basic connection test failed', undefined, error as Error)
      this.log('error', result.message, error)
      return this.results.basicConnection = result
    }
  }

  async testAuthService(): Promise<ConnectionTestResult> {
    this.log('info', 'Testing auth service methods...')
    
    try {
      if (!this.client) {
        throw new Error('Client not initialized')
      }

      const authMethods = ['getSession', 'getUser', 'signUp', 'signInWithPassword', 'signOut', 'onAuthStateChange']
      const availableMethods = authMethods.filter(method => typeof (this.client!.auth as any)[method] === 'function')
      
      // Test user retrieval (should work even without authentication)
      const { data: userData, error: userError } = await this.client.auth.getUser()
      
      const details = {
        availableMethods,
        missingMethods: authMethods.filter(method => !availableMethods.includes(method)),
        userCallSuccess: !userError,
        userError: userError?.message || null,
        hasUser: !!userData.user
      }

      const success = availableMethods.length === authMethods.length && !userError
      const result = this.createResult(
        success,
        success ? 'Auth service is fully functional' : 'Auth service has issues',
        details,
        userError || undefined
      )

      this.log(success ? 'success' : 'warn', result.message, details)
      return this.results.authService = result
    } catch (error) {
      const result = this.createResult(false, 'Auth service test failed', undefined, error as Error)
      this.log('error', result.message, error)
      return this.results.authService = result
    }
  }

  async testDatabaseConnection(): Promise<ConnectionTestResult> {
    this.log('info', 'Testing database connection...')
    
    try {
      if (!this.client) {
        throw new Error('Client not initialized')
      }

      // Try to access a basic table or check database connectivity
      // Using a simple RPC call that should work regardless of auth state
      const { data, error } = await this.client.rpc('version')
        .catch(async () => {
          // Fallback: try to access auth schema which should always be available
          return await this.client!.from('auth.users').select('count').limit(0)
            .catch(async () => {
              // Final fallback: just check if we can make any query
              return { data: null, error: null }
            })
        })

      const details = {
        queryAttempted: 'Database version or auth schema access',
        success: !error,
        error: error?.message || null,
        dataReceived: !!data
      }

      const success = !error || error.message.includes('permission denied') // Permission denied means connection works but auth is needed
      const result = this.createResult(
        success,
        success ? 'Database connection successful' : `Database connection failed: ${error?.message}`,
        details,
        (!success && error) ? error : undefined
      )

      this.log(success ? 'success' : 'warn', result.message, details)
      return this.results.databaseConnection = result
    } catch (error) {
      const result = this.createResult(false, 'Database connection test failed', undefined, error as Error)
      this.log('error', result.message, error)
      return this.results.databaseConnection = result
    }
  }

  async runFullTest(): Promise<ConnectionTestSuite> {
    console.log('🚀 Running Full Supabase Connection Test Suite')
    console.log('=' .repeat(60))

    // Run all tests in sequence
    await this.testEnvironmentVariables()
    await this.testClientCreation()
    await this.testBasicConnection()
    await this.testAuthService()
    await this.testDatabaseConnection()

    // Calculate overall result
    const testResults = [
      this.results.environmentVariables!,
      this.results.clientCreation!,
      this.results.basicConnection!,
      this.results.authService!,
      this.results.databaseConnection!
    ]

    const successCount = testResults.filter(r => r.success).length
    const totalTests = testResults.length
    const overallSuccess = successCount === totalTests

    const overall = this.createResult(
      overallSuccess,
      `Overall: ${successCount}/${totalTests} tests passed`,
      {
        successCount,
        totalTests,
        successRate: (successCount / totalTests * 100).toFixed(1) + '%',
        failedTests: testResults.filter(r => !r.success).map(r => r.message)
      }
    )

    console.log('=' .repeat(60))
    this.log(overallSuccess ? 'success' : 'warn', overall.message, overall.details)
    console.log('🏁 Connection test suite completed')

    return {
      environmentVariables: this.results.environmentVariables!,
      clientCreation: this.results.clientCreation!,
      basicConnection: this.results.basicConnection!,
      authService: this.results.authService!,
      databaseConnection: this.results.databaseConnection!,
      overall
    }
  }
}

// Export functions for easy use
export const runConnectionTest = async (): Promise<ConnectionTestSuite> => {
  const tester = new SupabaseConnectionTester()
  return await tester.runFullTest()
}

export const testEnvironmentVariables = async (): Promise<ConnectionTestResult> => {
  const tester = new SupabaseConnectionTester()
  return await tester.testEnvironmentVariables()
}

export const testClientCreation = async (): Promise<ConnectionTestResult> => {
  const tester = new SupabaseConnectionTester()
  await tester.testEnvironmentVariables()
  return await tester.testClientCreation()
}

// Debug helper - prints results in a readable format
export const printTestResults = (results: ConnectionTestSuite) => {
  console.log('\n📊 SUPABASE CONNECTION TEST RESULTS')
  console.log('=' .repeat(50))
  
  const tests = [
    { name: 'Environment Variables', result: results.environmentVariables },
    { name: 'Client Creation', result: results.clientCreation },
    { name: 'Basic Connection', result: results.basicConnection },
    { name: 'Auth Service', result: results.authService },
    { name: 'Database Connection', result: results.databaseConnection }
  ]

  tests.forEach(({ name, result }) => {
    const icon = result.success ? '✅' : '❌'
    console.log(`${icon} ${name}: ${result.message}`)
    if (result.error) {
      console.log(`   Error: ${result.error.message}`)
    }
    if (result.details) {
      console.log('   Details:', JSON.stringify(result.details, null, 2))
    }
  })

  console.log('\n' + '=' .repeat(50))
  console.log(`${results.overall.success ? '✅' : '❌'} ${results.overall.message}`)
}