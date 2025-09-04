'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { pkceManager } from '../../../utils/pkce-manager'
import { createClient } from '../../../lib/supabase/client'

interface PKCEDebugInfo {
  localStorage: Record<string, string>
  pkceParams: {
    codeVerifier: string
    codeChallenge: string
    state?: string
    timestamp: number
    provider: string
  } | null
  validation: boolean
  supabaseConfig: {
    url: string
    hasAnonKey: boolean
    flowType: string
  }
  browserSupport: {
    localStorage: boolean
    webCrypto: boolean
    fetch: boolean
  }
}

export default function PKCEDebugPage() {
  const [debugInfo, setDebugInfo] = useState<PKCEDebugInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [testResults, setTestResults] = useState<Record<string, {
    success: boolean
    error?: string
    timestamp: string
    params?: Record<string, unknown>
    data?: unknown
    hasSession?: boolean
    validation?: boolean
  }>>({})
  const router = useRouter()

  useEffect(() => {
    loadDebugInfo()
  }, [])

  const loadDebugInfo = async () => {
    try {
      setLoading(true)

      // Get localStorage info
      const localStorageInfo: Record<string, string> = {}
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach(key => {
          if (key.includes('supabase') || key.includes('pkce') || key.includes('code') || key.includes('state')) {
            const value = localStorage.getItem(key) || ''
            localStorageInfo[key] = value.length > 100 ? value.substring(0, 100) + '...' : value
          }
        })
      }

      // Get PKCE params
      const pkceParams = await pkceManager.retrievePKCEParams('google')
      const validation = await pkceManager.validatePKCEParams('google')

      // Check browser support
      const browserSupport = {
        localStorage: typeof window !== 'undefined' && typeof localStorage !== 'undefined',
        webCrypto: typeof window !== 'undefined' && 'crypto' in window && 'subtle' in window.crypto,
        fetch: typeof fetch !== 'undefined'
      }

      // Get Supabase config
      const supabaseConfig = {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not configured',
        hasAnonKey: !!(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        flowType: 'pkce'
      }

      const info: PKCEDebugInfo = {
        localStorage: localStorageInfo,
        pkceParams,
        validation,
        supabaseConfig,
        browserSupport
      }

      setDebugInfo(info)
    } catch (error) {
      console.error('Failed to load debug info:', error)
    } finally {
      setLoading(false)
    }
  }

  const testPKCEGeneration = async () => {
    try {
      console.log('🧪 [TEST] Testing PKCE parameter generation...')
      
      // Clear existing storage
      pkceManager.clearPKCEStorage('google')
      
      // Generate new PKCE params
      const params = await pkceManager.generatePKCEParams('google')
      
      // Validate generated params
      const validation = await pkceManager.validatePKCEParams('google')
      
      setTestResults(prev => ({
        ...prev,
        pkceGeneration: {
          success: true,
          params: {
            verifierLength: params.codeVerifier.length,
            challengeLength: params.codeChallenge.length,
            method: params.codeChallengeMethod,
            hasState: !!params.state
          },
          validation,
          timestamp: new Date().toISOString()
        }
      }))
      
      // Reload debug info
      await loadDebugInfo()
      
      console.log('✅ [TEST] PKCE generation test completed successfully')
    } catch (error) {
      console.error('❌ [TEST] PKCE generation test failed:', error)
      setTestResults(prev => ({
        ...prev,
        pkceGeneration: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      }))
    }
  }

  const testSupabaseConnection = async () => {
    try {
      console.log('🧪 [TEST] Testing Supabase connection...')
      
      const supabase = createClient()
      const { data, error } = await supabase.auth.getSession()
      
      setTestResults(prev => ({
        ...prev,
        supabaseConnection: {
          success: !error,
          hasSession: !!data.session,
          error: error?.message,
          timestamp: new Date().toISOString()
        }
      }))
      
      console.log('✅ [TEST] Supabase connection test completed')
    } catch (error) {
      console.error('❌ [TEST] Supabase connection test failed:', error)
      setTestResults(prev => ({
        ...prev,
        supabaseConnection: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      }))
    }
  }

  const testOAuthFlow = async () => {
    try {
      console.log('🧪 [TEST] Testing OAuth flow initialization...')
      
      const supabase = createClient()
      
      // Generate PKCE params
      await pkceManager.clearPKCEStorage('google')
      const pkceParams = await pkceManager.generatePKCEParams('google')
      
      const redirectUrl = `${window.location.origin}/auth/callback`
      
      // Test OAuth initialization (without redirect)
      const response = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            code_challenge: pkceParams.codeChallenge,
            code_challenge_method: pkceParams.codeChallengeMethod,
            ...(pkceParams.state && { state: pkceParams.state })
          },
          skipBrowserRedirect: true // Don't redirect for test
        },
      })
      
      setTestResults(prev => ({
        ...prev,
        oauthFlow: {
          success: !response.error,
          error: response.error?.message,
          data: response.data,
          timestamp: new Date().toISOString()
        }
      }))
      
      console.log('✅ [TEST] OAuth flow test completed')
    } catch (error) {
      console.error('❌ [TEST] OAuth flow test failed:', error)
      setTestResults(prev => ({
        ...prev,
        oauthFlow: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      }))
    }
  }

  const clearAllStorage = () => {
    pkceManager.clearPKCEStorage()
    loadDebugInfo()
    console.log('🧹 [DEBUG] Cleared all PKCE storage')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading PKCE debug information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
          >
            ← Back
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            PKCE Debug Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive debugging and testing for PKCE OAuth flow
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <button
            onClick={loadDebugInfo}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            🔄 Refresh Info
          </button>
          
          <button
            onClick={testPKCEGeneration}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
          >
            🧪 Test PKCE Gen
          </button>
          
          <button
            onClick={testSupabaseConnection}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
          >
            🔗 Test Supabase
          </button>
          
          <button
            onClick={clearAllStorage}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
          >
            🧹 Clear Storage
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current PKCE State */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Current PKCE State
            </h2>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <span className={`w-3 h-3 rounded-full ${debugInfo?.validation ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="text-gray-700 dark:text-gray-300">
                  PKCE Validation: {debugInfo?.validation ? 'Valid' : 'Invalid'}
                </span>
              </div>
              
              {debugInfo?.pkceParams && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">PKCE Parameters</h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <div>Verifier Length: {debugInfo.pkceParams.codeVerifier?.length || 'N/A'}</div>
                    <div>Challenge Length: {debugInfo.pkceParams.codeChallenge?.length || 'N/A'}</div>
                    <div>Has State: {debugInfo.pkceParams.state ? 'Yes' : 'No'}</div>
                    <div>Provider: {debugInfo.pkceParams.provider || 'N/A'}</div>
                    <div>Age: {debugInfo.pkceParams.timestamp ? Math.round((Date.now() - debugInfo.pkceParams.timestamp) / 1000) + 's' : 'N/A'}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Browser Support */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Browser Support
            </h2>
            
            <div className="space-y-3">
              {Object.entries(debugInfo?.browserSupport || {}).map(([feature, supported]) => (
                <div key={feature} className="flex items-center space-x-2">
                  <span className={`w-3 h-3 rounded-full ${supported ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="text-gray-700 dark:text-gray-300 capitalize">
                    {feature.replace(/([A-Z])/g, ' $1')}: {supported ? 'Supported' : 'Not Supported'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Local Storage */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Local Storage ({Object.keys(debugInfo?.localStorage || {}).length} items)
            </h2>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {Object.entries(debugInfo?.localStorage || {}).length > 0 ? (
                Object.entries(debugInfo.localStorage).map(([key, value]) => (
                  <div key={key} className="bg-gray-50 dark:bg-gray-700 rounded-md p-2">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{key}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 font-mono break-all">
                      {value}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No PKCE-related items in storage</p>
              )}
            </div>
          </div>

          {/* Test Results */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Test Results
            </h2>
            
            <div className="space-y-3">
              {Object.entries(testResults).length > 0 ? (
                Object.entries(testResults).map(([testName, result]) => (
                  <div key={testName} className="bg-gray-50 dark:bg-gray-700 rounded-md p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`w-3 h-3 rounded-full ${result.success ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      <span className="font-medium text-gray-900 dark:text-white capitalize">
                        {testName.replace(/([A-Z])/g, ' $1')}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {result.error && <div className="text-red-600 dark:text-red-400">Error: {result.error}</div>}
                      {result.timestamp && <div>Tested: {new Date(result.timestamp).toLocaleTimeString()}</div>}
                      {result.params && (
                        <div className="mt-1">
                          <strong>Parameters:</strong> {JSON.stringify(result.params, null, 2)}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No test results yet. Run tests above.</p>
              )}
            </div>
          </div>
        </div>

        {/* Supabase Config */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Supabase Configuration
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">URL</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 font-mono break-all">
                {debugInfo?.supabaseConfig.url}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Anonymous Key</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {debugInfo?.supabaseConfig.hasAnonKey ? 'Configured' : 'Missing'}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Flow Type</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {debugInfo?.supabaseConfig.flowType}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}