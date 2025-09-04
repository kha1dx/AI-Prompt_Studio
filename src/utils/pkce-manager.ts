/**
 * PKCE (Proof Key for Code Exchange) Manager
 * 
 * This utility provides complete control over PKCE flow for OAuth authentication.
 * It handles code verifier generation, storage, retrieval, and validation.
 */

import { base64URLEncode, sha256 } from './crypto-utils'

export interface PKCEParams {
  codeVerifier: string
  codeChallenge: string
  codeChallengeMethod: 'S256'
  state?: string
}

export interface PKCEStorage {
  codeVerifier: string
  codeChallenge: string
  state?: string
  timestamp: number
  provider: string
}

class PKCEManager {
  private readonly STORAGE_KEY = 'supabase-pkce-params'
  private readonly STATE_KEY = 'supabase-oauth-state'
  private readonly VERIFIER_LENGTH = 128
  private readonly PKCE_EXPIRY_MS = 10 * 60 * 1000 // 10 minutes

  /**
   * Generate a cryptographically secure random string for PKCE code verifier
   */
  private generateCodeVerifier(): string {
    const array = new Uint8Array(96) // 96 bytes = 128 characters in base64url
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(array)
    } else {
      // Fallback for non-browser environments
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256)
      }
    }
    return base64URLEncode(array)
  }

  /**
   * Generate OAuth state parameter for CSRF protection
   */
  private generateState(): string {
    const array = new Uint8Array(32)
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(array)
    } else {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256)
      }
    }
    return base64URLEncode(array)
  }

  /**
   * Generate PKCE parameters (code verifier, challenge, and state)
   */
  async generatePKCEParams(provider: string = 'google'): Promise<PKCEParams> {
    try {
      const codeVerifier = this.generateCodeVerifier()
      const codeChallenge = await sha256(codeVerifier)
      const state = this.generateState()

      const params: PKCEParams = {
        codeVerifier,
        codeChallenge: base64URLEncode(new Uint8Array(codeChallenge)),
        codeChallengeMethod: 'S256',
        state
      }

      // Store PKCE parameters
      await this.storePKCEParams(params, provider)

      console.log('✅ [PKCE] Generated PKCE parameters:', {
        verifierLength: codeVerifier.length,
        challengeLength: params.codeChallenge.length,
        method: params.codeChallengeMethod,
        hasState: !!state,
        provider
      })

      return params
    } catch (error) {
      console.error('❌ [PKCE] Failed to generate PKCE parameters:', error)
      throw new Error('Failed to generate PKCE parameters')
    }
  }

  /**
   * Store PKCE parameters in localStorage with expiry
   */
  async storePKCEParams(params: PKCEParams, provider: string): Promise<void> {
    if (typeof window === 'undefined') {
      console.warn('⚠️ [PKCE] Cannot store PKCE params: window is undefined')
      return
    }

    try {
      const storage: PKCEStorage = {
        codeVerifier: params.codeVerifier,
        codeChallenge: params.codeChallenge,
        state: params.state,
        timestamp: Date.now(),
        provider
      }

      // Store in multiple locations for redundancy
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storage))
      localStorage.setItem(`${this.STORAGE_KEY}-${provider}`, JSON.stringify(storage))
      
      // Also store individual components for Supabase compatibility
      localStorage.setItem('supabase-code-verifier', params.codeVerifier)
      localStorage.setItem('supabase-code-challenge', params.codeChallenge)
      if (params.state) {
        localStorage.setItem(this.STATE_KEY, params.state)
      }

      console.log('✅ [PKCE] Stored PKCE parameters:', {
        storageKey: this.STORAGE_KEY,
        providerKey: `${this.STORAGE_KEY}-${provider}`,
        hasVerifier: !!params.codeVerifier,
        hasChallenge: !!params.codeChallenge,
        hasState: !!params.state
      })
    } catch (error) {
      console.error('❌ [PKCE] Failed to store PKCE parameters:', error)
      throw new Error('Failed to store PKCE parameters')
    }
  }

  /**
   * Retrieve PKCE parameters from localStorage
   */
  async retrievePKCEParams(provider: string = 'google'): Promise<PKCEStorage | null> {
    if (typeof window === 'undefined') {
      console.warn('⚠️ [PKCE] Cannot retrieve PKCE params: window is undefined')
      return null
    }

    try {
      // Try provider-specific storage first
      let storageData = localStorage.getItem(`${this.STORAGE_KEY}-${provider}`)
      
      // Fallback to general storage
      if (!storageData) {
        storageData = localStorage.getItem(this.STORAGE_KEY)
      }

      if (!storageData) {
        // Try individual components as final fallback
        const codeVerifier = localStorage.getItem('supabase-code-verifier')
        const codeChallenge = localStorage.getItem('supabase-code-challenge')
        const state = localStorage.getItem(this.STATE_KEY)

        if (codeVerifier) {
          console.log('🔍 [PKCE] Found individual components, reconstructing storage')
          return {
            codeVerifier,
            codeChallenge: codeChallenge || '',
            state: state || undefined,
            timestamp: Date.now(),
            provider
          }
        }

        console.log('⚠️ [PKCE] No PKCE parameters found in storage')
        return null
      }

      const storage: PKCEStorage = JSON.parse(storageData)

      // Check if parameters have expired
      if (Date.now() - storage.timestamp > this.PKCE_EXPIRY_MS) {
        console.warn('⚠️ [PKCE] PKCE parameters expired, clearing storage')
        this.clearPKCEStorage(provider)
        return null
      }

      console.log('✅ [PKCE] Retrieved PKCE parameters:', {
        hasVerifier: !!storage.codeVerifier,
        hasChallenge: !!storage.codeChallenge,
        hasState: !!storage.state,
        provider: storage.provider,
        age: Date.now() - storage.timestamp
      })

      return storage
    } catch (error) {
      console.error('❌ [PKCE] Failed to retrieve PKCE parameters:', error)
      this.clearPKCEStorage(provider)
      return null
    }
  }

  /**
   * Clear PKCE parameters from storage
   */
  clearPKCEStorage(provider?: string): void {
    if (typeof window === 'undefined') return

    try {
      const keysToRemove = [
        this.STORAGE_KEY,
        this.STATE_KEY,
        'supabase-code-verifier',
        'supabase-code-challenge'
      ]

      if (provider) {
        keysToRemove.push(`${this.STORAGE_KEY}-${provider}`)
      }

      // Clear all PKCE-related keys
      keysToRemove.forEach(key => {
        localStorage.removeItem(key)
      })

      // Clear any Supabase-specific PKCE keys
      Object.keys(localStorage).forEach(key => {
        if (key.includes('supabase') && (key.includes('pkce') || key.includes('code'))) {
          localStorage.removeItem(key)
        }
      })

      console.log('✅ [PKCE] Cleared PKCE storage')
    } catch (error) {
      console.error('❌ [PKCE] Failed to clear PKCE storage:', error)
    }
  }

  /**
   * Validate stored PKCE parameters
   */
  async validatePKCEParams(provider: string = 'google'): Promise<boolean> {
    const storage = await this.retrievePKCEParams(provider)
    
    if (!storage) {
      console.log('⚠️ [PKCE] No PKCE parameters to validate')
      return false
    }

    const isValid = !!(
      storage.codeVerifier && 
      storage.codeVerifier.length >= 43 && 
      storage.codeVerifier.length <= 128 &&
      storage.codeChallenge &&
      storage.timestamp &&
      (Date.now() - storage.timestamp) < this.PKCE_EXPIRY_MS
    )

    console.log('🔍 [PKCE] PKCE validation result:', {
      isValid,
      hasVerifier: !!storage.codeVerifier,
      verifierLength: storage.codeVerifier?.length || 0,
      hasChallenge: !!storage.codeChallenge,
      challengeLength: storage.codeChallenge?.length || 0,
      age: Date.now() - storage.timestamp,
      expired: (Date.now() - storage.timestamp) > this.PKCE_EXPIRY_MS
    })

    return isValid
  }

  /**
   * Get code verifier for token exchange
   */
  async getCodeVerifier(provider: string = 'google'): Promise<string | null> {
    const storage = await this.retrievePKCEParams(provider)
    return storage?.codeVerifier || null
  }

  /**
   * Verify OAuth state parameter
   */
  async verifyState(receivedState: string, provider: string = 'google'): Promise<boolean> {
    const storage = await this.retrievePKCEParams(provider)
    
    if (!storage?.state) {
      console.warn('⚠️ [PKCE] No stored state to verify against')
      return true // If we didn't store state, skip verification
    }

    const isValid = storage.state === receivedState

    console.log('🔍 [PKCE] State verification:', {
      isValid,
      storedState: storage.state?.substring(0, 10) + '...',
      receivedState: receivedState?.substring(0, 10) + '...'
    })

    return isValid
  }

  /**
   * Debug PKCE storage state
   */
  debugStorage(): void {
    if (typeof window === 'undefined') {
      console.log('🔍 [PKCE] Debug: Running in non-browser environment')
      return
    }

    const allKeys = Object.keys(localStorage)
    const pkceKeys = allKeys.filter(key => 
      key.includes('supabase') || key.includes('pkce') || key.includes('code') || key.includes('state')
    )

    console.log('🔍 [PKCE] Storage debug:', {
      totalKeys: allKeys.length,
      pkceRelatedKeys: pkceKeys.length,
      keys: pkceKeys,
      values: pkceKeys.reduce((acc, key) => {
        acc[key] = localStorage.getItem(key)?.substring(0, 50) + '...'
        return acc
      }, {} as Record<string, string>)
    })
  }
}

export const pkceManager = new PKCEManager()