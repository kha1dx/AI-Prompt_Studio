'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

interface ErrorState {
  error: string | null
  errorDescription: string | null
}

const ERROR_MESSAGES = {
  missing_code: 'No authorization code received from OAuth provider',
  exchange_failed: 'Failed to exchange authorization code for session',
  no_session: 'Session exchange succeeded but no session was created',
  no_user: 'Session created but no user profile found',
  unexpected_error: 'An unexpected error occurred during authentication',
  pkce_error: 'PKCE flow verification failed',
  code_verifier_missing: 'Code verifier not found in browser storage',
  state_mismatch: 'OAuth state parameter mismatch'
}

function CallbackErrorContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    errorDescription: null
  })

  useEffect(() => {
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    
    setErrorState({
      error,
      errorDescription
    })
    
    console.error('🚨 [AUTH ERROR] OAuth callback failed:', {
      error,
      errorDescription,
      searchParams: searchParams.toString()
    })
  }, [searchParams])

  const getErrorMessage = () => {
    if (errorState.errorDescription) {
      return errorState.errorDescription
    }
    if (errorState.error && ERROR_MESSAGES[errorState.error as keyof typeof ERROR_MESSAGES]) {
      return ERROR_MESSAGES[errorState.error as keyof typeof ERROR_MESSAGES]
    }
    return errorState.error || 'An unknown error occurred during authentication'
  }

  const getErrorTitle = () => {
    switch (errorState.error) {
      case 'missing_code':
        return 'Authorization Failed'
      case 'exchange_failed':
      case 'pkce_error':
      case 'code_verifier_missing':
        return 'Authentication Exchange Failed'
      case 'no_session':
      case 'no_user':
        return 'Session Creation Failed'
      case 'state_mismatch':
        return 'Security Validation Failed'
      default:
        return 'Authentication Error'
    }
  }

  const handleRetry = () => {
    // Clear any existing auth cookies/storage before retry
    if (typeof window !== 'undefined') {
      localStorage.removeItem('supabase.auth.token')
      sessionStorage.clear()
    }
    router.push('/login')
  }

  const handleDiagnostics = () => {
    router.push('/auth/diagnostics')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {getErrorTitle()}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {getErrorMessage()}
          </p>
          
          {errorState.error === 'exchange_failed' && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 mb-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                This is typically a PKCE flow issue. Check browser console for detailed logs.
              </p>
            </div>
          )}
          
          <div className="space-y-3">
            <button 
              onClick={handleRetry}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
            >
              Try Again
            </button>
            <button 
              onClick={handleDiagnostics}
              className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-md transition-colors"
            >
              Run Diagnostics
            </button>
          </div>
          
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded text-left">
              <p className="text-xs text-gray-600 dark:text-gray-300 font-mono">
                Debug Info: {errorState.error} | {errorState.errorDescription}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AuthCallbackErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="text-gray-500 text-4xl mb-4">⏳</div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Loading...
            </h1>
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </div>
    }>
      <CallbackErrorContent />
    </Suspense>
  )
}