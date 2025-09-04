/**
 * Custom OAuth Handler
 * 
 * This utility completely bypasses Supabase's built-in OAuth handling and implements
 * a custom PKCE flow that directly interacts with Google OAuth and Supabase's token endpoint.
 */

import { pkceManager } from './pkce-manager'
import { createClient } from '../lib/supabase/client'

interface GoogleOAuthConfig {
  clientId: string
  redirectUri: string
  scope: string[]
  responseType: string
  codeChallenge: string
  codeChallengeMethod: string
  state: string
  accessType?: string
  prompt?: string
}

interface TokenExchangeRequest {
  code: string
  codeVerifier: string
  redirectUri: string
}

interface TokenExchangeResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  id_token?: string
}

class CustomOAuthHandler {
  private readonly GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
  private readonly GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
  private readonly SUPABASE_TOKEN_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token`

  /**
   * Get Google OAuth Client ID from environment or construct from Supabase URL
   */
  private getGoogleClientId(): string {
    // Try to get from environment variable first
    if (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
      return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    }
    
    // Fallback: Construct from Supabase URL (this may not work for all setups)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || 'unknown'
    
    console.warn('⚠️ [CUSTOM-OAUTH] NEXT_PUBLIC_GOOGLE_CLIENT_ID not set, using constructed client ID')
    return `${projectRef}.apps.googleusercontent.com`
  }

  /**
   * Initiate custom OAuth flow with complete PKCE control
   */
  async initiateOAuthFlow(provider: 'google' = 'google'): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🚀 [CUSTOM-OAUTH] Starting custom OAuth flow with full PKCE control')
      
      // Clear any existing PKCE state
      pkceManager.clearPKCEStorage(provider)
      
      // Generate fresh PKCE parameters
      const pkceParams = await pkceManager.generatePKCEParams(provider)
      
      // Get current URL for redirect
      const redirectUri = `${window.location.origin}/auth/callback`
      
      // Build Google OAuth URL with our PKCE parameters
      const oauthConfig: GoogleOAuthConfig = {
        clientId: this.getGoogleClientId(),
        redirectUri,
        scope: ['openid', 'email', 'profile'],
        responseType: 'code',
        codeChallenge: pkceParams.codeChallenge,
        codeChallengeMethod: pkceParams.codeChallengeMethod,
        state: pkceParams.state || 'custom-oauth-state',
        accessType: 'offline',
        prompt: 'consent'
      }
      
      console.log('🔧 [CUSTOM-OAUTH] OAuth configuration:', {
        clientId: oauthConfig.clientId.substring(0, 20) + '...',
        redirectUri: oauthConfig.redirectUri,
        scope: oauthConfig.scope,
        challengeLength: oauthConfig.codeChallenge.length,
        method: oauthConfig.codeChallengeMethod,
        state: oauthConfig.state?.substring(0, 10) + '...'
      })
      
      // Construct OAuth URL
      const params = new URLSearchParams({
        client_id: oauthConfig.clientId,
        redirect_uri: oauthConfig.redirectUri,
        scope: oauthConfig.scope.join(' '),
        response_type: oauthConfig.responseType,
        code_challenge: oauthConfig.codeChallenge,
        code_challenge_method: oauthConfig.codeChallengeMethod,
        state: oauthConfig.state,
        access_type: oauthConfig.accessType || 'offline',
        prompt: oauthConfig.prompt || 'consent'
      })
      
      const oauthUrl = `${this.GOOGLE_OAUTH_URL}?${params.toString()}`
      
      console.log('🔗 [CUSTOM-OAUTH] Redirecting to OAuth URL:', oauthUrl.substring(0, 100) + '...')
      
      // Store additional metadata for callback verification
      localStorage.setItem('custom-oauth-initiated', 'true')
      localStorage.setItem('custom-oauth-timestamp', Date.now().toString())
      localStorage.setItem('custom-oauth-redirect-uri', redirectUri)
      
      // Redirect to Google OAuth
      window.location.href = oauthUrl
      
      return { success: true }
    } catch (error) {
      console.error('❌ [CUSTOM-OAUTH] Failed to initiate OAuth flow:', error)
      pkceManager.clearPKCEStorage(provider)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to initiate OAuth' 
      }
    }
  }

  /**
   * Handle OAuth callback with custom token exchange
   */
  async handleCallback(
    authCode: string,
    state?: string,
    provider: 'google' = 'google'
  ): Promise<{ success: boolean; session?: any; error?: string }> {
    try {
      console.log('🔄 [CUSTOM-OAUTH] Handling OAuth callback with custom token exchange')
      
      // Verify this is a custom OAuth callback
      const isCustomOAuth = localStorage.getItem('custom-oauth-initiated') === 'true'
      if (!isCustomOAuth) {
        console.log('ℹ️ [CUSTOM-OAUTH] Not a custom OAuth callback, falling back to standard flow')
        return { success: false, error: 'Not a custom OAuth callback' }
      }
      
      // Retrieve PKCE parameters
      const pkceParams = await pkceManager.retrievePKCEParams(provider)
      if (!pkceParams) {
        console.error('❌ [CUSTOM-OAUTH] No PKCE parameters found')
        return { success: false, error: 'PKCE parameters not found' }
      }
      
      // Verify state parameter
      if (state && !(await pkceManager.verifyState(state, provider))) {
        console.error('❌ [CUSTOM-OAUTH] State verification failed')
        return { success: false, error: 'OAuth state verification failed' }
      }
      
      console.log('✅ [CUSTOM-OAUTH] PKCE parameters validated, proceeding with token exchange')
      
      // Exchange authorization code for tokens using multiple strategies
      const tokenResult = await this.exchangeCodeForTokens({
        code: authCode,
        codeVerifier: pkceParams.codeVerifier,
        redirectUri: localStorage.getItem('custom-oauth-redirect-uri') || `${window.location.origin}/auth/callback`
      })
      
      if (!tokenResult.success) {
        console.error('❌ [CUSTOM-OAUTH] Token exchange failed:', tokenResult.error)
        return { success: false, error: tokenResult.error }
      }
      
      console.log('✅ [CUSTOM-OAUTH] Token exchange successful, creating session')
      
      // Create Supabase session with obtained tokens
      const supabase = createClient()
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: tokenResult.tokens!.access_token,
        refresh_token: tokenResult.tokens!.refresh_token
      })
      
      if (sessionError) {
        console.error('❌ [CUSTOM-OAUTH] Failed to create session:', sessionError)
        return { success: false, error: sessionError.message }
      }
      
      // Clean up custom OAuth state
      this.cleanupOAuthState()
      pkceManager.clearPKCEStorage(provider)
      
      console.log('🎉 [CUSTOM-OAUTH] Custom OAuth flow completed successfully')
      
      return { 
        success: true, 
        session: sessionData.session 
      }
      
    } catch (error) {
      console.error('❌ [CUSTOM-OAUTH] Callback handling failed:', error)
      this.cleanupOAuthState()
      pkceManager.clearPKCEStorage(provider)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Callback handling failed' 
      }
    }
  }

  /**
   * Exchange authorization code for tokens with multiple fallback strategies
   */
  private async exchangeCodeForTokens(request: TokenExchangeRequest): Promise<{
    success: boolean
    tokens?: TokenExchangeResponse
    error?: string
  }> {
    const strategies = [
      'supabase-direct',
      'google-direct',
      'supabase-with-verifier'
    ]

    for (const strategy of strategies) {
      try {
        console.log(`🔄 [CUSTOM-OAUTH] Trying token exchange strategy: ${strategy}`)
        
        const result = await this.executeTokenExchange(strategy, request)
        if (result.success) {
          console.log(`✅ [CUSTOM-OAUTH] Strategy ${strategy} succeeded`)
          return result
        }
        
        console.log(`⚠️ [CUSTOM-OAUTH] Strategy ${strategy} failed:`, result.error)
      } catch (error) {
        console.log(`❌ [CUSTOM-OAUTH] Strategy ${strategy} threw error:`, error)
      }
    }

    return { success: false, error: 'All token exchange strategies failed' }
  }

  /**
   * Execute specific token exchange strategy
   */
  private async executeTokenExchange(
    strategy: string,
    request: TokenExchangeRequest
  ): Promise<{ success: boolean; tokens?: TokenExchangeResponse; error?: string }> {
    switch (strategy) {
      case 'supabase-direct':
        return await this.supabaseDirectExchange(request)
      
      case 'google-direct':
        return await this.googleDirectExchange(request)
      
      case 'supabase-with-verifier':
        return await this.supabaseWithVerifierExchange(request)
      
      default:
        return { success: false, error: 'Unknown strategy' }
    }
  }

  /**
   * Strategy 1: Direct Supabase token exchange
   */
  private async supabaseDirectExchange(request: TokenExchangeRequest): Promise<{
    success: boolean
    tokens?: TokenExchangeResponse
    error?: string
  }> {
    const response = await fetch(`${this.SUPABASE_TOKEN_URL}?grant_type=authorization_code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      },
      body: JSON.stringify({
        code: request.code,
        code_verifier: request.codeVerifier
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      return { success: false, error: errorData.error_description || errorData.error || 'Supabase exchange failed' }
    }

    const tokens = await response.json()
    return { success: true, tokens }
  }

  /**
   * Strategy 2: Direct Google token exchange
   */
  private async googleDirectExchange(request: TokenExchangeRequest): Promise<{
    success: boolean
    tokens?: TokenExchangeResponse
    error?: string
  }> {
    const params = new URLSearchParams({
      client_id: this.getGoogleClientId(),
      code: request.code,
      code_verifier: request.codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: request.redirectUri
    })

    const response = await fetch(this.GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      return { success: false, error: errorData.error_description || errorData.error || 'Google exchange failed' }
    }

    const tokens = await response.json()
    return { success: true, tokens }
  }

  /**
   * Strategy 3: Supabase with explicit verifier parameter
   */
  private async supabaseWithVerifierExchange(request: TokenExchangeRequest): Promise<{
    success: boolean
    tokens?: TokenExchangeResponse
    error?: string
  }> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: request.code,
      code_verifier: request.codeVerifier,
      redirect_uri: request.redirectUri
    })

    const response = await fetch(`${this.SUPABASE_TOKEN_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      },
      body: params.toString()
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      return { success: false, error: errorData.error_description || errorData.error || 'Supabase with verifier failed' }
    }

    const tokens = await response.json()
    return { success: true, tokens }
  }

  /**
   * Check if current callback should use custom OAuth handling
   */
  isCustomOAuthCallback(): boolean {
    return localStorage.getItem('custom-oauth-initiated') === 'true'
  }

  /**
   * Clean up custom OAuth state
   */
  private cleanupOAuthState(): void {
    const keysToRemove = [
      'custom-oauth-initiated',
      'custom-oauth-timestamp',
      'custom-oauth-redirect-uri'
    ]

    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
    })
  }

  /**
   * Get debug information about custom OAuth state
   */
  getDebugInfo(): {
    isInitiated: boolean
    timestamp: string | null
    redirectUri: string | null
    age: number | null
  } {
    const isInitiated = localStorage.getItem('custom-oauth-initiated') === 'true'
    const timestamp = localStorage.getItem('custom-oauth-timestamp')
    const redirectUri = localStorage.getItem('custom-oauth-redirect-uri')
    
    const age = timestamp ? Date.now() - parseInt(timestamp) : null

    return {
      isInitiated,
      timestamp,
      redirectUri,
      age
    }
  }
}

export const customOAuthHandler = new CustomOAuthHandler()