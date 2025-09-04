/**
 * OAUTH FLOW DEBUGGER
 * 
 * Real-time OAuth PKCE flow monitoring and debugging utility.
 * This tool provides comprehensive logging and state tracking for OAuth flows.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

interface OAuthDebugEvent {
  timestamp: number
  event: string
  phase: 'initiation' | 'redirect' | 'callback' | 'exchange' | 'completion'
  success: boolean
  data?: Record<string, any>
  error?: string
  performance?: {
    duration: number
    memoryUsage: number
  }
}

interface PKCEDebugData {
  codeVerifier?: string
  codeChallenge?: string
  codeChallengeMethod?: string
  state?: string
  authCode?: string
  redirectUrl?: string
}

interface OAuthSession {
  sessionId: string
  startTime: number
  endTime?: number
  events: OAuthDebugEvent[]
  finalState: 'success' | 'failure' | 'pending'
  pkceData: PKCEDebugData
  errorCount: number
  performanceMetrics: {
    totalDuration: number
    initiationTime: number
    callbackTime: number
    exchangeTime: number
  }
}

export class OAuthFlowDebugger {
  private sessions: Map<string, OAuthSession> = new Map()
  private currentSessionId: string | null = null
  private supabase: SupabaseClient
  private debugEnabled: boolean = true

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseAnonKey) {
      this.supabase = createClient(supabaseUrl, supabaseAnonKey)
    }

    // Auto-enable in development
    this.debugEnabled = process.env.NODE_ENV === 'development'
    
    if (typeof window !== 'undefined') {
      // Make debugger available globally for browser console access
      (window as any).__oauthDebugger = this
    }
  }

  /**
   * Start debugging an OAuth session
   */
  public startSession(sessionId?: string): string {
    const id = sessionId || this.generateSessionId()
    this.currentSessionId = id

    const session: OAuthSession = {
      sessionId: id,
      startTime: Date.now(),
      events: [],
      finalState: 'pending',
      pkceData: {},
      errorCount: 0,
      performanceMetrics: {
        totalDuration: 0,
        initiationTime: 0,
        callbackTime: 0,
        exchangeTime: 0
      }
    }

    this.sessions.set(id, session)

    this.logEvent('OAuth Session Started', 'initiation', true, {
      sessionId: id,
      timestamp: session.startTime
    })

    console.log(`🔍 [OAUTH-DEBUG] Session started: ${id}`)
    return id
  }

  /**
   * Log OAuth initiation
   */
  public logOAuthInitiation(provider: string, redirectUrl: string, pkceData: Partial<PKCEDebugData>): void {
    const startTime = Date.now()

    this.updatePKCEData(pkceData)

    this.logEvent('OAuth Initiation', 'initiation', true, {
      provider,
      redirectUrl,
      pkceData: {
        hasCodeVerifier: !!pkceData.codeVerifier,
        hasCodeChallenge: !!pkceData.codeChallenge,
        codeChallengeMethod: pkceData.codeChallengeMethod,
        hasState: !!pkceData.state,
        codeVerifierLength: pkceData.codeVerifier?.length,
        codeChallengeLength: pkceData.codeChallenge?.length
      }
    })

    // Store in session storage for callback retrieval
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('oauth-debug-session', this.currentSessionId || '')
      sessionStorage.setItem('oauth-debug-pkce', JSON.stringify(pkceData))
      sessionStorage.setItem('oauth-debug-initiation-time', startTime.toString())
    }

    console.log(`🚀 [OAUTH-DEBUG] OAuth initiated for ${provider}`)
    console.log(`   Code Verifier: ${pkceData.codeVerifier ? 'Generated ✅' : 'Missing ❌'}`)
    console.log(`   Code Challenge: ${pkceData.codeChallenge ? 'Generated ✅' : 'Missing ❌'}`)
    console.log(`   State: ${pkceData.state ? 'Generated ✅' : 'Missing ❌'}`)
  }

  /**
   * Log OAuth callback receipt
   */
  public logOAuthCallback(urlParams: URLSearchParams): void {
    const callbackTime = Date.now()
    
    // Restore session from storage
    if (typeof window !== 'undefined' && !this.currentSessionId) {
      const storedSessionId = sessionStorage.getItem('oauth-debug-session')
      if (storedSessionId) {
        this.currentSessionId = storedSessionId
      }
    }

    const authCode = urlParams.get('code')
    const error = urlParams.get('error')
    const errorDescription = urlParams.get('error_description')
    const state = urlParams.get('state')

    const callbackData = {
      hasAuthCode: !!authCode,
      hasError: !!error,
      authCodeLength: authCode?.length,
      error,
      errorDescription,
      state,
      receivedParams: Array.from(urlParams.entries())
    }

    this.logEvent('OAuth Callback Received', 'callback', !error, callbackData, error || undefined)

    // Update performance metrics
    if (typeof window !== 'undefined') {
      const initiationTime = sessionStorage.getItem('oauth-debug-initiation-time')
      if (initiationTime) {
        const session = this.getCurrentSession()
        if (session) {
          session.performanceMetrics.callbackTime = callbackTime - parseInt(initiationTime)
        }
      }
    }

    console.log(`📞 [OAUTH-DEBUG] Callback received`)
    console.log(`   Auth Code: ${authCode ? 'Received ✅' : 'Missing ❌'}`)
    console.log(`   Error: ${error ? `Yes ❌ (${error})` : 'No ✅'}`)
    console.log(`   State: ${state ? 'Present ✅' : 'Missing ❌'}`)
  }

  /**
   * Log code exchange attempt
   */
  public logCodeExchange(authCode: string, storedVerifier?: string): void {
    const exchangeStartTime = Date.now()

    // Retrieve stored PKCE data
    let pkceData: Partial<PKCEDebugData> = {}
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('oauth-debug-pkce')
      if (stored) {
        try {
          pkceData = JSON.parse(stored)
        } catch (e) {
          console.warn('[OAUTH-DEBUG] Failed to parse stored PKCE data')
        }
      }
    }

    const actualVerifier = storedVerifier || pkceData.codeVerifier
    
    const exchangeData = {
      authCode: authCode?.substring(0, 20) + '...',
      hasStoredVerifier: !!actualVerifier,
      storedVerifierLength: actualVerifier?.length,
      verifierMatches: storedVerifier === pkceData.codeVerifier,
      sessionStorageWorking: !!pkceData.codeVerifier
    }

    // Check for the classic error condition
    const hasError = !authCode || !actualVerifier
    const errorMessage = !authCode ? 'Missing auth code' : !actualVerifier ? 'Missing code verifier' : undefined

    this.logEvent('Code Exchange Attempt', 'exchange', !hasError, exchangeData, errorMessage)

    // Update performance metrics
    const session = this.getCurrentSession()
    if (session) {
      session.performanceMetrics.exchangeTime = Date.now() - exchangeStartTime
    }

    console.log(`🔄 [OAUTH-DEBUG] Code exchange attempt`)
    console.log(`   Auth Code: ${authCode ? 'Present ✅' : 'Missing ❌'}`)
    console.log(`   Stored Verifier: ${actualVerifier ? 'Found ✅' : 'Missing ❌'}`)
    console.log(`   Session Storage: ${pkceData.codeVerifier ? 'Working ✅' : 'Failed ❌'}`)
    
    if (hasError) {
      console.log(`   ❌ CRITICAL ERROR: ${errorMessage}`)
      console.log(`   This will cause the "auth code and code verifier should be non-empty" error!`)
    }
  }

  /**
   * Log session creation result
   */
  public logSessionCreation(success: boolean, session?: any, error?: any): void {
    const sessionData = {
      success,
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      accessTokenLength: session?.access_token?.length,
      refreshTokenLength: session?.refresh_token?.length,
      expiresAt: session?.expires_at,
      error: error?.message
    }

    this.logEvent('Session Creation', 'completion', success, sessionData, error?.message)

    // Finalize session
    this.finalizeSession(success ? 'success' : 'failure')

    console.log(`${success ? '✅' : '❌'} [OAUTH-DEBUG] Session creation ${success ? 'successful' : 'failed'}`)
    if (success) {
      console.log(`   User: ${session?.user?.email || 'Unknown'}`)
      console.log(`   Session expires: ${new Date(session?.expires_at * 1000 || 0).toLocaleString()}`)
    } else {
      console.log(`   Error: ${error?.message || 'Unknown error'}`)
    }
  }

  /**
   * Log performance metrics
   */
  public logPerformanceMetrics(): void {
    const session = this.getCurrentSession()
    if (!session) return

    const totalDuration = Date.now() - session.startTime
    session.performanceMetrics.totalDuration = totalDuration

    console.log(`📊 [OAUTH-DEBUG] Performance Metrics`)
    console.log(`   Total Duration: ${totalDuration}ms`)
    console.log(`   Initiation→Callback: ${session.performanceMetrics.callbackTime}ms`)
    console.log(`   Code Exchange: ${session.performanceMetrics.exchangeTime}ms`)
    console.log(`   Total Events: ${session.events.length}`)
    console.log(`   Error Count: ${session.errorCount}`)
  }

  /**
   * Get debugging report
   */
  public getDebugReport(sessionId?: string): OAuthSession | null {
    const id = sessionId || this.currentSessionId
    if (!id) return null

    const session = this.sessions.get(id)
    if (!session) return null

    return { ...session }
  }

  /**
   * Export debug data for analysis
   */
  public exportDebugData(): string {
    const data = {
      sessions: Array.from(this.sessions.values()),
      exportTime: Date.now(),
      debuggerVersion: '1.0.0'
    }

    return JSON.stringify(data, null, 2)
  }

  /**
   * Clear debug data
   */
  public clearDebugData(): void {
    this.sessions.clear()
    this.currentSessionId = null
    
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('oauth-debug-session')
      sessionStorage.removeItem('oauth-debug-pkce')
      sessionStorage.removeItem('oauth-debug-initiation-time')
    }

    console.log('🧹 [OAUTH-DEBUG] Debug data cleared')
  }

  // Private helper methods
  private generateSessionId(): string {
    return `oauth-debug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private getCurrentSession(): OAuthSession | null {
    if (!this.currentSessionId) return null
    return this.sessions.get(this.currentSessionId) || null
  }

  private updatePKCEData(data: Partial<PKCEDebugData>): void {
    const session = this.getCurrentSession()
    if (session) {
      session.pkceData = { ...session.pkceData, ...data }
    }
  }

  private logEvent(
    event: string, 
    phase: OAuthDebugEvent['phase'], 
    success: boolean, 
    data?: Record<string, any>,
    error?: string
  ): void {
    if (!this.debugEnabled) return

    const session = this.getCurrentSession()
    if (!session) return

    const debugEvent: OAuthDebugEvent = {
      timestamp: Date.now(),
      event,
      phase,
      success,
      data,
      error,
      performance: {
        duration: Date.now() - session.startTime,
        memoryUsage: typeof window !== 'undefined' && (performance as any).memory 
          ? (performance as any).memory.usedJSHeapSize 
          : 0
      }
    }

    session.events.push(debugEvent)

    if (!success) {
      session.errorCount++
    }
  }

  private finalizeSession(finalState: OAuthSession['finalState']): void {
    const session = this.getCurrentSession()
    if (session) {
      session.finalState = finalState
      session.endTime = Date.now()
      session.performanceMetrics.totalDuration = session.endTime - session.startTime
    }
  }

  /**
   * Browser console helper methods
   */
  public debug = {
    getCurrentSession: () => this.getCurrentSession(),
    getAllSessions: () => Array.from(this.sessions.values()),
    getReport: (id?: string) => this.getDebugReport(id),
    export: () => this.exportDebugData(),
    clear: () => this.clearDebugData(),
    enable: () => { this.debugEnabled = true },
    disable: () => { this.debugEnabled = false }
  }
}

// Global instance
export const oauthDebugger = new OAuthFlowDebugger()

// Browser console access
if (typeof window !== 'undefined') {
  (window as any).__oauthDebugger = oauthDebugger.debug
}