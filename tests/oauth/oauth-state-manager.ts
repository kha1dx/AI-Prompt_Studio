/**
 * OAUTH STATE MANAGEMENT TESTING UTILITIES
 * 
 * Comprehensive testing and validation for OAuth state management
 * to ensure proper flow state tracking and prevent issues.
 */

import crypto from 'crypto'

interface OAuthStateData {
  sessionId: string
  codeVerifier: string
  codeChallenge: string
  state: string
  redirectUrl: string
  timestamp: number
  expiresAt: number
  provider: string
}

interface StateTransition {
  from: OAuthFlowState
  to: OAuthFlowState
  timestamp: number
  trigger: string
  data?: Record<string, any>
  success: boolean
}

enum OAuthFlowState {
  IDLE = 'idle',
  INITIATING = 'initiating',
  REDIRECTING = 'redirecting',
  CALLBACK_RECEIVED = 'callback_received',
  EXCHANGING_CODE = 'exchanging_code',
  SESSION_CREATED = 'session_created',
  COMPLETED = 'completed',
  ERROR = 'error',
  EXPIRED = 'expired'
}

interface StateValidationResult {
  valid: boolean
  currentState: OAuthFlowState
  expectedState: OAuthFlowState
  issues: string[]
  recommendations: string[]
  canRecover: boolean
  data: Record<string, any>
}

interface StateManagerTestResult {
  success: boolean
  testName: string
  initialState: OAuthFlowState
  finalState: OAuthFlowState
  transitionCount: number
  errors: string[]
  duration: number
  details: Record<string, any>
}

export class OAuthStateManager {
  private currentState: OAuthFlowState = OAuthFlowState.IDLE
  private stateData: Map<string, OAuthStateData> = new Map()
  private transitions: StateTransition[] = []
  private stateTimeout: number = 15 * 60 * 1000 // 15 minutes
  private testResults: Map<string, StateManagerTestResult> = new Map()

  constructor() {
    console.log('⚡ [STATE-MANAGER] OAuth State Manager initialized')
    this.startStateCleanup()
  }

  /**
   * Initialize OAuth flow
   */
  public initializeOAuthFlow(provider: string, redirectUrl: string): OAuthStateData {
    console.log(`🚀 [STATE-MANAGER] Initializing OAuth flow for ${provider}`)

    this.transitionState(OAuthFlowState.IDLE, OAuthFlowState.INITIATING, 'initializeFlow')

    const sessionId = this.generateSessionId()
    const codeVerifier = this.generateCodeVerifier()
    const codeChallenge = this.generateCodeChallenge(codeVerifier)
    const state = this.generateState()
    const now = Date.now()

    const stateData: OAuthStateData = {
      sessionId,
      codeVerifier,
      codeChallenge,
      state,
      redirectUrl,
      timestamp: now,
      expiresAt: now + this.stateTimeout,
      provider
    }

    this.stateData.set(sessionId, stateData)

    this.transitionState(OAuthFlowState.INITIATING, OAuthFlowState.REDIRECTING, 'stateStored', {
      sessionId,
      provider
    })

    console.log(`✅ [STATE-MANAGER] OAuth flow initialized - Session: ${sessionId}`)
    return stateData
  }

  /**
   * Handle OAuth callback
   */
  public handleOAuthCallback(authCode: string, state: string): StateValidationResult {
    console.log('📞 [STATE-MANAGER] Handling OAuth callback')

    this.transitionState(this.currentState, OAuthFlowState.CALLBACK_RECEIVED, 'callbackReceived', {
      authCode: authCode?.substring(0, 20) + '...',
      state: state?.substring(0, 10) + '...'
    })

    // Find matching state data
    const matchingSession = this.findSessionByState(state)
    
    if (!matchingSession) {
      this.transitionState(OAuthFlowState.CALLBACK_RECEIVED, OAuthFlowState.ERROR, 'stateNotFound')
      
      return {
        valid: false,
        currentState: OAuthFlowState.ERROR,
        expectedState: OAuthFlowState.CALLBACK_RECEIVED,
        issues: ['State parameter not found in storage', 'Possible CSRF attack or expired session'],
        recommendations: [
          'Check if OAuth session has expired',
          'Verify state parameter generation and storage',
          'Start new OAuth flow'
        ],
        canRecover: false,
        data: { authCode: !!authCode, state: !!state }
      }
    }

    // Validate state and session
    const validation = this.validateOAuthSession(matchingSession, authCode, state)
    
    if (validation.valid) {
      this.transitionState(OAuthFlowState.CALLBACK_RECEIVED, OAuthFlowState.EXCHANGING_CODE, 'validationPassed')
    } else {
      this.transitionState(OAuthFlowState.CALLBACK_RECEIVED, OAuthFlowState.ERROR, 'validationFailed')
    }

    return validation
  }

  /**
   * Complete OAuth flow
   */
  public completeOAuthFlow(sessionId: string, success: boolean, userData?: any): void {
    console.log(`🏁 [STATE-MANAGER] Completing OAuth flow - Success: ${success}`)

    const finalState = success ? OAuthFlowState.COMPLETED : OAuthFlowState.ERROR
    
    this.transitionState(this.currentState, finalState, success ? 'flowCompleted' : 'flowFailed', {
      sessionId,
      userData: !!userData
    })

    // Clean up session data if successful
    if (success) {
      this.stateData.delete(sessionId)
      console.log(`🧹 [STATE-MANAGER] Session ${sessionId} cleaned up`)
    }
  }

  /**
   * Test state transitions
   */
  public async testStateTransitions(): Promise<StateManagerTestResult> {
    console.log('🧪 [STATE-MANAGER] Testing state transitions...')

    const testName = 'state-transitions'
    const startTime = Date.now()
    const initialState = this.currentState
    let errors: string[] = []

    try {
      // Test valid transition sequence
      const validTransitions = [
        { from: OAuthFlowState.IDLE, to: OAuthFlowState.INITIATING, trigger: 'test-init' },
        { from: OAuthFlowState.INITIATING, to: OAuthFlowState.REDIRECTING, trigger: 'test-redirect' },
        { from: OAuthFlowState.REDIRECTING, to: OAuthFlowState.CALLBACK_RECEIVED, trigger: 'test-callback' },
        { from: OAuthFlowState.CALLBACK_RECEIVED, to: OAuthFlowState.EXCHANGING_CODE, trigger: 'test-exchange' },
        { from: OAuthFlowState.EXCHANGING_CODE, to: OAuthFlowState.SESSION_CREATED, trigger: 'test-session' },
        { from: OAuthFlowState.SESSION_CREATED, to: OAuthFlowState.COMPLETED, trigger: 'test-complete' }
      ]

      // Reset to idle for testing
      this.currentState = OAuthFlowState.IDLE

      for (const transition of validTransitions) {
        if (this.currentState !== transition.from) {
          errors.push(`Expected state ${transition.from}, but was ${this.currentState}`)
          break
        }

        try {
          this.transitionState(transition.from, transition.to, transition.trigger)
        } catch (error) {
          errors.push(`Transition ${transition.from} -> ${transition.to} failed: ${(error as Error).message}`)
          break
        }
      }

      // Test invalid transitions
      this.currentState = OAuthFlowState.IDLE
      try {
        this.transitionState(OAuthFlowState.IDLE, OAuthFlowState.COMPLETED, 'invalid-jump')
        errors.push('Invalid transition was allowed (IDLE -> COMPLETED)')
      } catch {
        // This should fail, so we're good
      }

      const result: StateManagerTestResult = {
        success: errors.length === 0,
        testName,
        initialState,
        finalState: this.currentState,
        transitionCount: this.transitions.length,
        errors,
        duration: Date.now() - startTime,
        details: {
          validTransitions: validTransitions.length,
          actualTransitions: this.transitions.filter(t => t.trigger.startsWith('test-')).length
        }
      }

      this.testResults.set(testName, result)
      
      const status = result.success ? '✅' : '❌'
      console.log(`${status} [STATE-MANAGER] State transitions test: ${result.success ? 'PASSED' : 'FAILED'} (${result.duration}ms)`)
      
      return result

    } catch (error) {
      const result: StateManagerTestResult = {
        success: false,
        testName,
        initialState,
        finalState: this.currentState,
        transitionCount: this.transitions.length,
        errors: [(error as Error).message],
        duration: Date.now() - startTime,
        details: { testError: true }
      }

      this.testResults.set(testName, result)
      return result
    }
  }

  /**
   * Test session expiration handling
   */
  public async testSessionExpiration(): Promise<StateManagerTestResult> {
    console.log('🧪 [STATE-MANAGER] Testing session expiration...')

    const testName = 'session-expiration'
    const startTime = Date.now()
    let errors: string[] = []

    try {
      // Create a session that expires immediately
      const sessionId = this.generateSessionId()
      const expiredData: OAuthStateData = {
        sessionId,
        codeVerifier: this.generateCodeVerifier(),
        codeChallenge: 'challenge',
        state: 'state123',
        redirectUrl: 'http://localhost:3000/callback',
        timestamp: Date.now() - this.stateTimeout - 1000, // Expired 1 second ago
        expiresAt: Date.now() - 1000,
        provider: 'test'
      }

      this.stateData.set(sessionId, expiredData)

      // Try to validate expired session
      const validation = this.validateOAuthSession(expiredData, 'auth-code', 'state123')
      
      if (validation.valid) {
        errors.push('Expired session was validated as valid')
      }

      if (!validation.issues.some(issue => issue.includes('expired'))) {
        errors.push('Expiration issue not detected')
      }

      // Test cleanup of expired sessions
      const beforeCleanup = this.stateData.size
      this.cleanupExpiredSessions()
      const afterCleanup = this.stateData.size

      if (afterCleanup >= beforeCleanup) {
        errors.push('Expired sessions were not cleaned up')
      }

      const result: StateManagerTestResult = {
        success: errors.length === 0,
        testName,
        initialState: this.currentState,
        finalState: this.currentState,
        transitionCount: 0,
        errors,
        duration: Date.now() - startTime,
        details: {
          expiredSessionDetected: !validation.valid,
          cleanupWorking: afterCleanup < beforeCleanup,
          beforeCleanup,
          afterCleanup
        }
      }

      this.testResults.set(testName, result)

      const status = result.success ? '✅' : '❌'
      console.log(`${status} [STATE-MANAGER] Session expiration test: ${result.success ? 'PASSED' : 'FAILED'} (${result.duration}ms)`)

      return result

    } catch (error) {
      const result: StateManagerTestResult = {
        success: false,
        testName,
        initialState: this.currentState,
        finalState: this.currentState,
        transitionCount: 0,
        errors: [(error as Error).message],
        duration: Date.now() - startTime,
        details: { testError: true }
      }

      this.testResults.set(testName, result)
      return result
    }
  }

  /**
   * Test concurrent session handling
   */
  public async testConcurrentSessions(): Promise<StateManagerTestResult> {
    console.log('🧪 [STATE-MANAGER] Testing concurrent sessions...')

    const testName = 'concurrent-sessions'
    const startTime = Date.now()
    let errors: string[] = []

    try {
      const sessionCount = 5
      const sessions: OAuthStateData[] = []

      // Create multiple concurrent sessions
      for (let i = 0; i < sessionCount; i++) {
        const session = this.initializeOAuthFlow(`provider-${i}`, `http://localhost:3000/callback-${i}`)
        sessions.push(session)
      }

      // Verify all sessions are stored
      if (this.stateData.size < sessionCount) {
        errors.push(`Expected ${sessionCount} sessions, but only ${this.stateData.size} stored`)
      }

      // Verify session isolation
      const stateValues = sessions.map(s => s.state)
      const uniqueStates = new Set(stateValues)
      
      if (uniqueStates.size !== stateValues.length) {
        errors.push('Duplicate state values detected in concurrent sessions')
      }

      // Test callback handling for each session
      for (const session of sessions) {
        const validation = this.handleOAuthCallback(`auth-code-${session.sessionId}`, session.state)
        
        if (!validation.valid) {
          errors.push(`Callback validation failed for session ${session.sessionId}`)
        }
      }

      const result: StateManagerTestResult = {
        success: errors.length === 0,
        testName,
        initialState: OAuthFlowState.IDLE,
        finalState: this.currentState,
        transitionCount: this.transitions.length,
        errors,
        duration: Date.now() - startTime,
        details: {
          expectedSessions: sessionCount,
          actualSessions: this.stateData.size,
          uniqueStates: uniqueStates.size,
          sessionIds: sessions.map(s => s.sessionId)
        }
      }

      this.testResults.set(testName, result)

      const status = result.success ? '✅' : '❌'
      console.log(`${status} [STATE-MANAGER] Concurrent sessions test: ${result.success ? 'PASSED' : 'FAILED'} (${result.duration}ms)`)

      return result

    } catch (error) {
      const result: StateManagerTestResult = {
        success: false,
        testName,
        initialState: this.currentState,
        finalState: this.currentState,
        transitionCount: this.transitions.length,
        errors: [(error as Error).message],
        duration: Date.now() - startTime,
        details: { testError: true }
      }

      this.testResults.set(testName, result)
      return result
    }
  }

  /**
   * Run complete state management test suite
   */
  public async runCompleteTestSuite(): Promise<Map<string, StateManagerTestResult>> {
    console.log('🚀 [STATE-MANAGER] Running complete test suite...')
    console.log('='.repeat(60))

    const tests = [
      this.testStateTransitions(),
      this.testSessionExpiration(),
      this.testConcurrentSessions()
    ]

    await Promise.all(tests)

    const totalTests = this.testResults.size
    const passedTests = Array.from(this.testResults.values()).filter(r => r.success).length
    const failedTests = totalTests - passedTests

    console.log('='.repeat(60))
    console.log(`📊 [STATE-MANAGER] Test Suite Complete`)
    console.log(`   Total Tests: ${totalTests}`)
    console.log(`   Passed: ${passedTests} ✅`)
    console.log(`   Failed: ${failedTests} ${failedTests > 0 ? '❌' : '✅'}`)
    console.log(`   Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`)

    if (failedTests === 0) {
      console.log('\n🎉 [STATE-MANAGER] ALL TESTS PASSED!')
      console.log('   OAuth state management is working correctly.')
    } else {
      console.log('\n⚠️  [STATE-MANAGER] SOME TESTS FAILED!')
      console.log('   Review failed tests to improve state management.')
    }

    return new Map(this.testResults)
  }

  // Private helper methods
  private transitionState(from: OAuthFlowState, to: OAuthFlowState, trigger: string, data?: Record<string, any>): void {
    // Validate transition is allowed
    if (!this.isValidTransition(from, to)) {
      throw new Error(`Invalid state transition: ${from} -> ${to}`)
    }

    const transition: StateTransition = {
      from,
      to,
      timestamp: Date.now(),
      trigger,
      data,
      success: true
    }

    this.transitions.push(transition)
    this.currentState = to

    console.log(`🔄 [STATE-MANAGER] ${from} -> ${to} (${trigger})`)
  }

  private isValidTransition(from: OAuthFlowState, to: OAuthFlowState): boolean {
    const validTransitions: Record<OAuthFlowState, OAuthFlowState[]> = {
      [OAuthFlowState.IDLE]: [OAuthFlowState.INITIATING],
      [OAuthFlowState.INITIATING]: [OAuthFlowState.REDIRECTING, OAuthFlowState.ERROR],
      [OAuthFlowState.REDIRECTING]: [OAuthFlowState.CALLBACK_RECEIVED, OAuthFlowState.ERROR, OAuthFlowState.EXPIRED],
      [OAuthFlowState.CALLBACK_RECEIVED]: [OAuthFlowState.EXCHANGING_CODE, OAuthFlowState.ERROR],
      [OAuthFlowState.EXCHANGING_CODE]: [OAuthFlowState.SESSION_CREATED, OAuthFlowState.ERROR],
      [OAuthFlowState.SESSION_CREATED]: [OAuthFlowState.COMPLETED, OAuthFlowState.ERROR],
      [OAuthFlowState.COMPLETED]: [OAuthFlowState.IDLE],
      [OAuthFlowState.ERROR]: [OAuthFlowState.IDLE],
      [OAuthFlowState.EXPIRED]: [OAuthFlowState.IDLE]
    }

    return validTransitions[from]?.includes(to) ?? false
  }

  private validateOAuthSession(sessionData: OAuthStateData, authCode: string, state: string): StateValidationResult {
    const issues: string[] = []
    const recommendations: string[] = []

    // Check expiration
    if (Date.now() > sessionData.expiresAt) {
      issues.push('OAuth session has expired')
      recommendations.push('Start a new OAuth flow')
      
      return {
        valid: false,
        currentState: OAuthFlowState.EXPIRED,
        expectedState: OAuthFlowState.CALLBACK_RECEIVED,
        issues,
        recommendations,
        canRecover: false,
        data: { expired: true, age: Date.now() - sessionData.timestamp }
      }
    }

    // Check state parameter
    if (sessionData.state !== state) {
      issues.push('State parameter mismatch')
      recommendations.push('Verify state parameter storage and retrieval')
    }

    // Check auth code presence
    if (!authCode) {
      issues.push('Authorization code is missing')
      recommendations.push('Check OAuth callback URL parameters')
    }

    // Check code verifier presence
    if (!sessionData.codeVerifier) {
      issues.push('Code verifier is missing from session data')
      recommendations.push('Ensure PKCE parameters are stored correctly')
    }

    const valid = issues.length === 0

    return {
      valid,
      currentState: valid ? OAuthFlowState.CALLBACK_RECEIVED : OAuthFlowState.ERROR,
      expectedState: OAuthFlowState.CALLBACK_RECEIVED,
      issues,
      recommendations,
      canRecover: !issues.some(issue => issue.includes('expired')),
      data: {
        sessionAge: Date.now() - sessionData.timestamp,
        hasCodeVerifier: !!sessionData.codeVerifier,
        stateMatch: sessionData.state === state,
        hasAuthCode: !!authCode
      }
    }
  }

  private findSessionByState(state: string): OAuthStateData | null {
    for (const sessionData of this.stateData.values()) {
      if (sessionData.state === state) {
        return sessionData
      }
    }
    return null
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now()
    const expiredSessions: string[] = []

    for (const [sessionId, data] of this.stateData.entries()) {
      if (now > data.expiresAt) {
        expiredSessions.push(sessionId)
      }
    }

    for (const sessionId of expiredSessions) {
      this.stateData.delete(sessionId)
    }

    if (expiredSessions.length > 0) {
      console.log(`🧹 [STATE-MANAGER] Cleaned up ${expiredSessions.length} expired sessions`)
    }
  }

  private startStateCleanup(): void {
    setInterval(() => {
      this.cleanupExpiredSessions()
    }, 60000) // Cleanup every minute
  }

  private generateSessionId(): string {
    return `oauth-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url')
  }

  private generateCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url')
  }

  private generateState(): string {
    return crypto.randomBytes(24).toString('base64url')
  }

  /**
   * Get current state information
   */
  public getCurrentStateInfo(): Record<string, any> {
    return {
      currentState: this.currentState,
      activeSessions: this.stateData.size,
      totalTransitions: this.transitions.length,
      recentTransitions: this.transitions.slice(-5),
      sessionIds: Array.from(this.stateData.keys())
    }
  }

  /**
   * Export state management data
   */
  public exportStateData(): string {
    const data = {
      currentState: this.currentState,
      stateData: Object.fromEntries(
        Array.from(this.stateData.entries()).map(([id, data]) => [
          id, 
          {
            ...data,
            codeVerifier: data.codeVerifier.substring(0, 10) + '...',
            state: data.state.substring(0, 10) + '...'
          }
        ])
      ),
      transitions: this.transitions,
      testResults: Object.fromEntries(this.testResults),
      exportTime: Date.now()
    }

    return JSON.stringify(data, null, 2)
  }
}

// Export singleton instance
export const oauthStateManager = new OAuthStateManager()