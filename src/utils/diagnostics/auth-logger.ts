/**
 * Comprehensive Authentication Error Logger
 * Provides detailed logging and error tracking for authentication flows
 */
import type { AuthError, AuthResponse, User, Session } from '@supabase/supabase-js'

export interface AuthLogEntry {
  timestamp: string
  action: string
  success: boolean
  details: Record<string, any>
  error?: AuthError | Error
  duration?: number
  userId?: string
  sessionId?: string
}

export interface AuthFlowResult {
  success: boolean
  user: User | null
  session: Session | null
  error: AuthError | Error | null
  logs: AuthLogEntry[]
  metadata: {
    totalDuration: number
    attemptCount: number
    lastAttemptAt: string
  }
}

class AuthLogger {
  private logs: AuthLogEntry[] = []
  private startTimes: Map<string, number> = new Map()
  private debugMode: boolean

  constructor(debugMode = true) {
    this.debugMode = debugMode
    this.log('info', 'Auth Logger initialized', { debugMode })
  }

  private log(level: 'info' | 'warn' | 'error' | 'success', message: string, details?: any) {
    const icons = { info: '📋', warn: '⚠️', error: '❌', success: '✅' }
    if (this.debugMode) {
      console.log(`${icons[level]} [AUTH] ${message}`)
      if (details) {
        console.log('  Details:', details)
      }
    }
  }

  startTimer(action: string): void {
    this.startTimes.set(action, Date.now())
  }

  stopTimer(action: string): number {
    const startTime = this.startTimes.get(action)
    if (startTime) {
      const duration = Date.now() - startTime
      this.startTimes.delete(action)
      return duration
    }
    return 0
  }

  logAuthAttempt(
    action: string, 
    success: boolean, 
    details: Record<string, any>, 
    error?: AuthError | Error,
    user?: User | null,
    session?: Session | null
  ): AuthLogEntry {
    const duration = this.stopTimer(action)
    const entry: AuthLogEntry = {
      timestamp: new Date().toISOString(),
      action,
      success,
      details: {
        ...details,
        environment: {
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
          url: typeof window !== 'undefined' ? window.location.href : 'Server-side',
          timestamp: Date.now()
        }
      },
      error,
      duration: duration > 0 ? duration : undefined,
      userId: user?.id,
      sessionId: session?.access_token ? session.access_token.substring(0, 10) + '...' : undefined
    }

    this.logs.push(entry)
    
    // Log to console if in debug mode
    const level = success ? 'success' : 'error'
    const message = `${action} ${success ? 'succeeded' : 'failed'}${duration > 0 ? ` (${duration}ms)` : ''}`
    this.log(level, message, {
      ...details,
      error: error?.message,
      userId: user?.id,
      duration
    })

    return entry
  }

  async logSignUp(email: string, password: string, authResponse: AuthResponse): Promise<AuthLogEntry> {
    const { data, error } = authResponse
    return this.logAuthAttempt(
      'signUp',
      !error && !!data.user,
      {
        email: email.replace(/^(.{3}).*(@.+)$/, '$1***$2'), // Partially hide email
        hasPassword: !!password,
        passwordLength: password?.length || 0,
        responseData: {
          hasUser: !!data.user,
          hasSession: !!data.session,
          userConfirmed: data.user?.email_confirmed_at ? true : false,
          userRole: data.user?.role || 'none'
        }
      },
      error || undefined,
      data.user,
      data.session
    )
  }

  async logSignIn(email: string, password: string, authResponse: AuthResponse): Promise<AuthLogEntry> {
    const { data, error } = authResponse
    return this.logAuthAttempt(
      'signIn',
      !error && !!data.user && !!data.session,
      {
        email: email.replace(/^(.{3}).*(@.+)$/, '$1***$2'),
        hasPassword: !!password,
        passwordLength: password?.length || 0,
        responseData: {
          hasUser: !!data.user,
          hasSession: !!data.session,
          sessionExpiresAt: data.session?.expires_at,
          userLastSignIn: data.user?.last_sign_in_at,
          userRole: data.user?.role || 'none'
        }
      },
      error || undefined,
      data.user,
      data.session
    )
  }

  async logSignOut(authResponse: { error: AuthError | null }): Promise<AuthLogEntry> {
    const { error } = authResponse
    return this.logAuthAttempt(
      'signOut',
      !error,
      {
        cleanLogout: !error
      },
      error || undefined
    )
  }

  async logOAuthSignIn(provider: string, authResponse: AuthResponse): Promise<AuthLogEntry> {
    const { data, error } = authResponse
    return this.logAuthAttempt(
      'oauthSignIn',
      !error,
      {
        provider,
        responseData: {
          hasUser: !!data.user,
          hasSession: !!data.session,
          providerToken: !!data.session?.provider_token,
          providerRefreshToken: !!data.session?.provider_refresh_token
        }
      },
      error || undefined,
      data.user,
      data.session
    )
  }

  async logSessionCheck(sessionData: any, error?: AuthError): Promise<AuthLogEntry> {
    return this.logAuthAttempt(
      'sessionCheck',
      !error && !!sessionData.session,
      {
        hasSession: !!sessionData.session,
        sessionValid: !!sessionData.session?.access_token,
        sessionExpiry: sessionData.session?.expires_at,
        userPresent: !!sessionData.session?.user
      },
      error,
      sessionData.session?.user,
      sessionData.session
    )
  }

  async logPasswordReset(email: string, response: { error: AuthError | null }): Promise<AuthLogEntry> {
    const { error } = response
    return this.logAuthAttempt(
      'passwordReset',
      !error,
      {
        email: email.replace(/^(.{3}).*(@.+)$/, '$1***$2'),
        requestSent: !error
      },
      error || undefined
    )
  }

  async logEmailConfirmation(token: string, response: AuthResponse): Promise<AuthLogEntry> {
    const { data, error } = response
    return this.logAuthAttempt(
      'emailConfirmation',
      !error && !!data.user,
      {
        hasToken: !!token,
        tokenLength: token?.length || 0,
        confirmationSuccess: !error && !!data.user,
        userConfirmed: data.user?.email_confirmed_at ? true : false
      },
      error || undefined,
      data.user,
      data.session
    )
  }

  generateReport(): AuthFlowResult {
    const successfulLogs = this.logs.filter(log => log.success)
    const failedLogs = this.logs.filter(log => !log.success)
    const totalDuration = this.logs.reduce((sum, log) => sum + (log.duration || 0), 0)
    
    const lastLog = this.logs[this.logs.length - 1]
    const overallSuccess = this.logs.length > 0 && successfulLogs.length === this.logs.length

    return {
      success: overallSuccess,
      user: lastLog?.userId ? { id: lastLog.userId } as User : null,
      session: lastLog?.sessionId ? { access_token: lastLog.sessionId } as Session : null,
      error: failedLogs.length > 0 ? failedLogs[failedLogs.length - 1].error || null : null,
      logs: [...this.logs], // Return copy
      metadata: {
        totalDuration,
        attemptCount: this.logs.length,
        lastAttemptAt: lastLog?.timestamp || new Date().toISOString()
      }
    }
  }

  getLogsByAction(action: string): AuthLogEntry[] {
    return this.logs.filter(log => log.action === action)
  }

  getFailedAttempts(): AuthLogEntry[] {
    return this.logs.filter(log => !log.success)
  }

  clearLogs(): void {
    this.logs = []
    this.startTimes.clear()
    this.log('info', 'Auth logs cleared')
  }

  printReport(): void {
    const report = this.generateReport()
    
    console.log('\n📊 AUTHENTICATION FLOW REPORT')
    console.log('=' .repeat(50))
    console.log(`Overall Status: ${report.success ? '✅ Success' : '❌ Failed'}`)
    console.log(`Total Attempts: ${report.metadata.attemptCount}`)
    console.log(`Total Duration: ${report.metadata.totalDuration}ms`)
    console.log(`Last Attempt: ${report.metadata.lastAttemptAt}`)
    
    if (report.user) {
      console.log(`Current User: ${report.user.id}`)
    }
    
    if (report.error) {
      console.log(`Last Error: ${report.error.message}`)
    }

    console.log('\n📋 DETAILED LOG ENTRIES:')
    this.logs.forEach((log, index) => {
      const icon = log.success ? '✅' : '❌'
      const duration = log.duration ? ` (${log.duration}ms)` : ''
      console.log(`${index + 1}. ${icon} ${log.action}${duration} - ${log.timestamp}`)
      
      if (!log.success && log.error) {
        console.log(`   Error: ${log.error.message}`)
      }
      
      if (this.debugMode) {
        console.log(`   Details:`, log.details)
      }
    })
    
    console.log('=' .repeat(50))
  }

  exportLogs(): string {
    return JSON.stringify({
      report: this.generateReport(),
      detailedLogs: this.logs
    }, null, 2)
  }
}

// Singleton instance for easy global access
let globalAuthLogger: AuthLogger | null = null

export const getAuthLogger = (debugMode = true): AuthLogger => {
  if (!globalAuthLogger) {
    globalAuthLogger = new AuthLogger(debugMode)
  }
  return globalAuthLogger
}

export const createAuthLogger = (debugMode = true): AuthLogger => {
  return new AuthLogger(debugMode)
}

// Convenience functions
export const logAuthAttempt = (
  action: string, 
  success: boolean, 
  details: Record<string, any>, 
  error?: AuthError | Error
): AuthLogEntry => {
  return getAuthLogger().logAuthAttempt(action, success, details, error)
}

export const printAuthReport = (): void => {
  getAuthLogger().printReport()
}

export const clearAuthLogs = (): void => {
  getAuthLogger().clearLogs()
}

export { AuthLogger }