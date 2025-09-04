/**
 * PKCE Flow Debugger Utility
 * 
 * Provides comprehensive debugging and validation for OAuth PKCE flow
 * Used to diagnose "invalid request: both auth code and code verifier should be non-empty" errors
 */

interface PKCEStorageItem {
  key: string
  value: string | null
  size: number
}

interface PKCEDebugInfo {
  timestamp: string
  storage: {
    available: boolean
    items: PKCEStorageItem[]
    totalSize: number
  }
  session: {
    hasActiveSession: boolean
    sessionData?: any
    cookies: string[]
  }
  url: {
    current: string
    params: Record<string, string>
    hasAuthCode: boolean
    hasState: boolean
    hasError: boolean
  }
  supabase: {
    configured: boolean
    clientInitialized: boolean
    authSettings?: any
  }
}

export class PKCEDebugger {
  private static instance: PKCEDebugger
  
  public static getInstance(): PKCEDebugger {
    if (!PKCEDebugger.instance) {
      PKCEDebugger.instance = new PKCEDebugger()
    }
    return PKCEDebugger.instance
  }

  /**
   * Comprehensive PKCE flow diagnostic
   */
  public async diagnose(): Promise<PKCEDebugInfo> {
    const timestamp = new Date().toISOString()
    
    console.log('🔍 [PKCE DEBUGGER] Starting comprehensive PKCE flow diagnosis')
    
    // Check storage
    const storage = this.analyzeStorage()
    
    // Check session
    const session = await this.analyzeSession()
    
    // Check URL parameters
    const url = this.analyzeURL()
    
    // Check Supabase configuration
    const supabase = this.analyzeSupabaseConfig()
    
    const debugInfo: PKCEDebugInfo = {
      timestamp,
      storage,
      session,
      url,
      supabase
    }
    
    console.log('📊 [PKCE DEBUGGER] Diagnosis complete:', debugInfo)
    
    return debugInfo
  }

  /**
   * Analyze browser storage for PKCE-related items
   */
  private analyzeStorage(): PKCEDebugInfo['storage'] {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return {
        available: false,
        items: [],
        totalSize: 0
      }
    }

    const items: PKCEStorageItem[] = []
    let totalSize = 0

    // Check localStorage for Supabase auth items
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.includes('supabase')) {
        const value = localStorage.getItem(key)
        const size = (key.length + (value?.length || 0)) * 2 // Rough byte estimate
        
        items.push({
          key,
          value: value?.substring(0, 100) + (value && value.length > 100 ? '...' : ''), // Truncate for logging
          size
        })
        
        totalSize += size
      }
    }

    return {
      available: true,
      items,
      totalSize
    }
  }

  /**
   * Analyze current session state
   */
  private async analyzeSession(): Promise<PKCEDebugInfo['session']> {
    try {
      // Import createClient dynamically to avoid SSR issues
      const { createClient } = await import('../lib/supabase/client')
      const supabase = createClient()
      
      const { data, error } = await supabase.auth.getSession()
      
      return {
        hasActiveSession: !!data.session && !error,
        sessionData: data.session ? {
          user_id: data.session.user?.id,
          expires_at: data.session.expires_at,
          provider: data.session.user?.app_metadata?.provider
        } : null,
        cookies: typeof document !== 'undefined' ? 
          document.cookie.split(';').map(c => c.trim()).filter(c => c.includes('supabase')) : []
      }
    } catch (error) {
      return {
        hasActiveSession: false,
        cookies: []
      }
    }
  }

  /**
   * Analyze URL parameters for OAuth callback data
   */
  private analyzeURL(): PKCEDebugInfo['url'] {
    if (typeof window === 'undefined') {
      return {
        current: '',
        params: {},
        hasAuthCode: false,
        hasState: false,
        hasError: false
      }
    }

    const url = new URL(window.location.href)
    const params: Record<string, string> = {}
    
    url.searchParams.forEach((value, key) => {
      params[key] = value
    })

    return {
      current: window.location.href,
      params,
      hasAuthCode: url.searchParams.has('code'),
      hasState: url.searchParams.has('state'),
      hasError: url.searchParams.has('error')
    }
  }

  /**
   * Analyze Supabase configuration
   */
  private analyzeSupabaseConfig(): PKCEDebugInfo['supabase'] {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    const configured = !!(
      supabaseUrl && 
      supabaseKey && 
      !supabaseUrl.includes('your_supabase') && 
      !supabaseKey.includes('your_supabase')
    )

    return {
      configured,
      clientInitialized: configured,
      authSettings: configured ? {
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: true
      } : null
    }
  }

  /**
   * Clear all PKCE-related storage
   */
  public clearPKCEStorage(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return
    }

    console.log('🧹 [PKCE DEBUGGER] Clearing PKCE storage')
    
    const keys = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.includes('supabase')) {
        keys.push(key)
      }
    }

    keys.forEach(key => {
      localStorage.removeItem(key)
      console.log(`🗑️ [PKCE DEBUGGER] Removed: ${key}`)
    })

    console.log(`✅ [PKCE DEBUGGER] Cleared ${keys.length} storage items`)
  }

  /**
   * Validate PKCE flow requirements
   */
  public async validatePKCEFlow(): Promise<{
    valid: boolean
    issues: string[]
    recommendations: string[]
  }> {
    const debugInfo = await this.diagnose()
    const issues: string[] = []
    const recommendations: string[] = []

    // Check if storage is available
    if (!debugInfo.storage.available) {
      issues.push('localStorage not available')
      recommendations.push('Enable localStorage or check browser privacy settings')
    }

    // Check if Supabase is configured
    if (!debugInfo.supabase.configured) {
      issues.push('Supabase not properly configured')
      recommendations.push('Update environment variables with valid Supabase credentials')
    }

    // Check for OAuth callback parameters
    if (debugInfo.url.hasError) {
      issues.push('OAuth provider returned an error')
      recommendations.push('Check OAuth provider configuration and credentials')
    }

    // Check for code verifier in storage during callback
    if (debugInfo.url.hasAuthCode && debugInfo.storage.items.length === 0) {
      issues.push('Authorization code present but no PKCE verifier found in storage')
      recommendations.push('This indicates the PKCE flow was interrupted or storage was cleared')
    }

    return {
      valid: issues.length === 0,
      issues,
      recommendations
    }
  }

  /**
   * Generate diagnostic report
   */
  public async generateReport(): Promise<string> {
    const debugInfo = await this.diagnose()
    const validation = await this.validatePKCEFlow()
    
    return `
🔍 PKCE FLOW DIAGNOSTIC REPORT
Generated: ${debugInfo.timestamp}

📊 STORAGE ANALYSIS:
- Available: ${debugInfo.storage.available}
- Items Found: ${debugInfo.storage.items.length}
- Total Size: ${debugInfo.storage.totalSize} bytes
- Keys: ${debugInfo.storage.items.map(i => i.key).join(', ')}

🔐 SESSION ANALYSIS:
- Active Session: ${debugInfo.session.hasActiveSession}
- Session Data: ${JSON.stringify(debugInfo.session.sessionData, null, 2)}
- Auth Cookies: ${debugInfo.session.cookies.length}

🌐 URL ANALYSIS:
- Current URL: ${debugInfo.url.current}
- Has Auth Code: ${debugInfo.url.hasAuthCode}
- Has State: ${debugInfo.url.hasState}
- Has Error: ${debugInfo.url.hasError}
- Parameters: ${JSON.stringify(debugInfo.url.params, null, 2)}

⚙️ SUPABASE CONFIG:
- Configured: ${debugInfo.supabase.configured}
- Client Initialized: ${debugInfo.supabase.clientInitialized}
- Auth Settings: ${JSON.stringify(debugInfo.supabase.authSettings, null, 2)}

✅ VALIDATION RESULTS:
- Flow Valid: ${validation.valid}
- Issues Found: ${validation.issues.length}
- Issues: ${validation.issues.join(', ')}
- Recommendations: ${validation.recommendations.join(', ')}
    `.trim()
  }
}

// Export singleton instance
export const pkceDebugger = PKCEDebugger.getInstance()

// Global debug function for browser console
if (typeof window !== 'undefined') {
  (window as any).__debugPKCE = async () => {
    const report = await pkceDebugger.generateReport()
    console.log(report)
    return report
  }
  
  (window as any).__clearPKCE = () => {
    pkceDebugger.clearPKCEStorage()
  }
  
  console.log('🔧 [PKCE DEBUGGER] Global debug functions available:')
  console.log('  - window.__debugPKCE() - Generate diagnostic report')
  console.log('  - window.__clearPKCE() - Clear PKCE storage')
}