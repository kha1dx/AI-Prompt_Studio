/**
 * Debug Mode Authentication Utility
 * Provides detailed debugging information and enhanced error handling for auth operations
 */
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient, AuthError, User, Session, AuthResponse } from '@supabase/supabase-js'
import { getAuthLogger } from './auth-logger'

export interface DebugAuthConfig {
  enableVerboseLogging?: boolean
  logNetworkRequests?: boolean
  captureStackTraces?: boolean
  logEnvironmentDetails?: boolean
}

export interface DebugAuthResult<T = any> {
  success: boolean
  data: T | null
  error: AuthError | Error | null
  debugInfo: {
    timestamp: string
    operation: string
    duration: number
    environment: Record<string, any>
    networkDetails?: Record<string, any>
    stackTrace?: string
  }
}

export interface EnvironmentDebugInfo {
  supabaseUrl: string | undefined
  hasAnonKey: boolean
  hasServiceKey: boolean
  nodeEnv: string | undefined
  userAgent: string | undefined
  currentUrl: string | undefined
  cookies: Record<string, string>
  localStorage: Record<string, any>
  sessionStorage: Record<string, any>
}

class DebugAuthClient {
  private client: SupabaseClient
  private config: DebugAuthConfig
  private logger: ReturnType<typeof getAuthLogger>

  constructor(config: DebugAuthConfig = {}) {
    this.config = {
      enableVerboseLogging: true,
      logNetworkRequests: true,
      captureStackTraces: true,
      logEnvironmentDetails: true,
      ...config
    }

    this.logger = getAuthLogger(this.config.enableVerboseLogging)

    // Initialize Supabase with debug options
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    this.client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        debug: this.config.enableVerboseLogging,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      },
      global: {
        headers: {
          'X-Debug-Mode': 'true',
          'X-Client-Info': 'debug-auth-client'
        }
      }
    })

    // Override fetch if network logging is enabled
    if (this.config.logNetworkRequests && typeof window !== 'undefined') {
      this.setupNetworkLogging()
    }

    this.log('info', 'Debug Auth Client initialized', {
      config: this.config,
      supabaseUrl: supabaseUrl?.substring(0, 30) + '...'
    })
  }

  private log(level: 'info' | 'warn' | 'error' | 'success', message: string, details?: any) {
    const icons = { info: '🐛', warn: '⚠️', error: '❌', success: '✅' }
    if (this.config.enableVerboseLogging) {
      console.log(`${icons[level]} [DEBUG-AUTH] ${message}`)
      if (details) {
        console.log('  Details:', details)
      }
    }
  }

  private setupNetworkLogging() {
    const originalFetch = window.fetch
    window.fetch = async (input, init) => {
      const url = input instanceof Request ? input.url : input
      const method = init?.method || 'GET'
      
      if (url.includes('supabase')) {
        this.log('info', `Network Request: ${method} ${url}`, {
          headers: init?.headers,
          body: init?.body
        })
      }

      const response = await originalFetch(input, init)
      
      if (url.includes('supabase')) {
        const clonedResponse = response.clone()
        try {
          const responseData = await clonedResponse.text()
          this.log('info', `Network Response: ${response.status}`, {
            url,
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            body: responseData.substring(0, 200) + (responseData.length > 200 ? '...' : '')
          })
        } catch (e) {
          this.log('warn', 'Could not read response body for logging')
        }
      }

      return response
    }
  }

  private async executeWithDebug<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<DebugAuthResult<T>> {
    const startTime = Date.now()
    const timestamp = new Date().toISOString()
    
    this.log('info', `Starting ${operation}...`)

    let stackTrace: string | undefined
    if (this.config.captureStackTraces) {
      stackTrace = new Error().stack
    }

    try {
      const result = await fn()
      const duration = Date.now() - startTime
      
      const debugInfo = {
        timestamp,
        operation,
        duration,
        environment: this.config.logEnvironmentDetails ? await this.getEnvironmentInfo() : {},
        stackTrace
      }

      this.log('success', `${operation} completed successfully (${duration}ms)`)

      return {
        success: true,
        data: result,
        error: null,
        debugInfo
      }
    } catch (error) {
      const duration = Date.now() - startTime
      
      const debugInfo = {
        timestamp,
        operation,
        duration,
        environment: this.config.logEnvironmentDetails ? await this.getEnvironmentInfo() : {},
        stackTrace
      }

      this.log('error', `${operation} failed (${duration}ms)`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })

      return {
        success: false,
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
        debugInfo
      }
    }
  }

  async getEnvironmentInfo(): Promise<EnvironmentDebugInfo> {
    const info: EnvironmentDebugInfo = {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      nodeEnv: process.env.NODE_ENV,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
      currentUrl: typeof window !== 'undefined' ? window.location.href : 'Server-side',
      cookies: {},
      localStorage: {},
      sessionStorage: {}
    }

    if (typeof window !== 'undefined') {
      // Get cookies
      try {
        info.cookies = Object.fromEntries(
          document.cookie.split('; ').map(cookie => {
            const [key, value] = cookie.split('=')
            return [key, value]
          }).filter(([key]) => key.includes('supabase') || key.includes('auth'))
        )
      } catch (e) {
        this.log('warn', 'Could not read cookies')
      }

      // Get localStorage
      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i)
          if (key && (key.includes('supabase') || key.includes('auth'))) {
            info.localStorage[key] = window.localStorage.getItem(key)
          }
        }
      } catch (e) {
        this.log('warn', 'Could not read localStorage')
      }

      // Get sessionStorage
      try {
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i)
          if (key && (key.includes('supabase') || key.includes('auth'))) {
            info.sessionStorage[key] = window.sessionStorage.getItem(key)
          }
        }
      } catch (e) {
        this.log('warn', 'Could not read sessionStorage')
      }
    }

    return info
  }

  async debugSignUp(email: string, password: string, options?: any): Promise<DebugAuthResult<AuthResponse>> {
    return this.executeWithDebug('signUp', async () => {
      this.logger.startTimer('signUp')
      
      const response = await this.client.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/auth/callback`,
          ...options
        }
      })

      await this.logger.logSignUp(email, password, response)

      this.log('info', 'SignUp Response Details', {
        hasUser: !!response.data.user,
        hasSession: !!response.data.session,
        userConfirmed: response.data.user?.email_confirmed_at ? true : false,
        error: response.error?.message,
        userRole: response.data.user?.role
      })

      if (response.error) {
        throw response.error
      }

      return response
    })
  }

  async debugSignIn(email: string, password: string): Promise<DebugAuthResult<AuthResponse>> {
    return this.executeWithDebug('signIn', async () => {
      this.logger.startTimer('signIn')
      
      const response = await this.client.auth.signInWithPassword({
        email,
        password
      })

      await this.logger.logSignIn(email, password, response)

      this.log('info', 'SignIn Response Details', {
        hasUser: !!response.data.user,
        hasSession: !!response.data.session,
        accessToken: response.data.session?.access_token ? 'Present' : 'Missing',
        refreshToken: response.data.session?.refresh_token ? 'Present' : 'Missing',
        expiresAt: response.data.session?.expires_at,
        error: response.error?.message
      })

      if (response.error) {
        throw response.error
      }

      return response
    })
  }

  async debugSignOut(): Promise<DebugAuthResult<{error: AuthError | null}>> {
    return this.executeWithDebug('signOut', async () => {
      const response = await this.client.auth.signOut()
      await this.logger.logSignOut(response)

      this.log('info', 'SignOut Response Details', {
        success: !response.error,
        error: response.error?.message
      })

      if (response.error) {
        throw response.error
      }

      return response
    })
  }

  async debugOAuthSignIn(provider: 'google' | 'github', options?: any): Promise<DebugAuthResult<AuthResponse>> {
    return this.executeWithDebug(`oAuth-${provider}`, async () => {
      const response = await this.client.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          },
          ...options
        }
      })

      await this.logger.logOAuthSignIn(provider, response)

      this.log('info', `OAuth ${provider} Response Details`, {
        success: !response.error,
        error: response.error?.message,
        willRedirect: !response.error
      })

      if (response.error) {
        throw response.error
      }

      return response
    })
  }

  async debugGetSession(): Promise<DebugAuthResult<{session: Session | null}>> {
    return this.executeWithDebug('getSession', async () => {
      const { data, error } = await this.client.auth.getSession()
      await this.logger.logSessionCheck(data, error || undefined)

      this.log('info', 'Session Check Details', {
        hasSession: !!data.session,
        sessionValid: !!data.session?.access_token,
        userId: data.session?.user?.id,
        expiresAt: data.session?.expires_at,
        error: error?.message
      })

      if (error) {
        throw error
      }

      return data
    })
  }

  async debugGetUser(): Promise<DebugAuthResult<{user: User | null}>> {
    return this.executeWithDebug('getUser', async () => {
      const { data, error } = await this.client.auth.getUser()

      this.log('info', 'User Check Details', {
        hasUser: !!data.user,
        userId: data.user?.id,
        email: data.user?.email,
        emailConfirmed: !!data.user?.email_confirmed_at,
        role: data.user?.role,
        error: error?.message
      })

      if (error) {
        throw error
      }

      return data
    })
  }

  async debugPasswordReset(email: string): Promise<DebugAuthResult<{error: AuthError | null}>> {
    return this.executeWithDebug('passwordReset', async () => {
      const response = await this.client.auth.resetPasswordForEmail(email, {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/auth/reset-password`
      })

      await this.logger.logPasswordReset(email, response)

      this.log('info', 'Password Reset Details', {
        success: !response.error,
        email: email.replace(/^(.{3}).*(@.+)$/, '$1***$2'),
        error: response.error?.message
      })

      if (response.error) {
        throw response.error
      }

      return response
    })
  }

  async debugEmailConfirmation(token: string): Promise<DebugAuthResult<AuthResponse>> {
    return this.executeWithDebug('emailConfirmation', async () => {
      // This would typically be handled by the callback URL
      // For debugging, we can simulate or test the token
      const response = await this.client.auth.verifyOtp({
        token_hash: token,
        type: 'email'
      })

      await this.logger.logEmailConfirmation(token, response)

      this.log('info', 'Email Confirmation Details', {
        success: !response.error && !!response.data.user,
        hasUser: !!response.data.user,
        hasSession: !!response.data.session,
        userConfirmed: response.data.user?.email_confirmed_at ? true : false,
        error: response.error?.message
      })

      if (response.error) {
        throw response.error
      }

      return response
    })
  }

  printDebugReport(): void {
    console.log('\n🐛 DEBUG AUTH CLIENT REPORT')
    console.log('=' .repeat(50))
    
    // Print auth logger report
    this.logger.printReport()
    
    // Print environment info
    this.getEnvironmentInfo().then(envInfo => {
      console.log('\n🌍 ENVIRONMENT INFO:')
      console.log(`Supabase URL: ${envInfo.supabaseUrl}`)
      console.log(`Has Anon Key: ${envInfo.hasAnonKey}`)
      console.log(`Has Service Key: ${envInfo.hasServiceKey}`)
      console.log(`Node Environment: ${envInfo.nodeEnv}`)
      console.log(`User Agent: ${envInfo.userAgent?.substring(0, 50)}...`)
      console.log(`Current URL: ${envInfo.currentUrl}`)
      
      if (Object.keys(envInfo.cookies).length > 0) {
        console.log(`Auth Cookies: ${Object.keys(envInfo.cookies).join(', ')}`)
      }
      
      if (Object.keys(envInfo.localStorage).length > 0) {
        console.log(`LocalStorage Keys: ${Object.keys(envInfo.localStorage).join(', ')}`)
      }
      
      console.log('=' .repeat(50))
    })
  }

  getClient(): SupabaseClient {
    return this.client
  }
}

// Export functions for easy use
export const createDebugAuthClient = (config?: DebugAuthConfig): DebugAuthClient => {
  return new DebugAuthClient(config)
}

export const debugSignUp = async (email: string, password: string, options?: any): Promise<DebugAuthResult<AuthResponse>> => {
  const client = new DebugAuthClient()
  return await client.debugSignUp(email, password, options)
}

export const debugSignIn = async (email: string, password: string): Promise<DebugAuthResult<AuthResponse>> => {
  const client = new DebugAuthClient()
  return await client.debugSignIn(email, password)
}

export const debugOAuth = async (provider: 'google' | 'github' = 'google'): Promise<DebugAuthResult<AuthResponse>> => {
  const client = new DebugAuthClient()
  return await client.debugOAuthSignIn(provider)
}

export const debugGetSession = async (): Promise<DebugAuthResult<{session: Session | null}>> => {
  const client = new DebugAuthClient()
  return await client.debugGetSession()
}

export const debugGetUser = async (): Promise<DebugAuthResult<{user: User | null}>> => {
  const client = new DebugAuthClient()
  return await client.debugGetUser()
}

export { DebugAuthClient }