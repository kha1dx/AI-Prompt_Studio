'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '../../../lib/supabase/client'

interface AuthState {
  loading: boolean
  error: string | null
  success: boolean
}

export default function AuthCallbackPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [state, setState] = useState<AuthState>({
    loading: true,
    error: null,
    success: false
  })

  useEffect(() => {
    const handleAuthCallback = async () => {
      const error = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')

      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 [AUTH] Callback received:', {
          hasError: !!error,
          url: window.location.href
        })
      }

      // Handle OAuth error from provider
      if (error) {
        console.error('❌ [AUTH] OAuth error:', { error, errorDescription })
        setState({
          loading: false,
          error: errorDescription || error,
          success: false
        })
        return
      }

      try {
        const supabase = createClient()
        
        // Let Supabase handle the code exchange automatically
        const { data, error: exchangeError } = await supabase.auth.getSession()
        
        if (exchangeError) {
          console.error('❌ [AUTH] Session retrieval error:', exchangeError)
          setState({
            loading: false,
            error: exchangeError.message,
            success: false
          })
          return
        }

        if (!data?.session?.user) {
          console.log('ℹ️ [AUTH] No session found, waiting for auth state change...')
          // The auth state change will be handled by the AuthContext
          // Just redirect to login and let the auth flow handle it
          setTimeout(() => {
            router.push('/login')
          }, 1000)
          return
        }

        console.log('✅ [AUTH] OAuth authentication successful:', {
          userId: data.session.user.id,
          email: data.session.user.email
        })

        setState({
          loading: false,
          error: null,
          success: true
        })

        // Redirect to dashboard after a brief success display
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)

      } catch (error) {
        console.error('❌ [AUTH] Unexpected error in auth callback:', error)
        setState({
          loading: false,
          error: error instanceof Error ? error.message : 'An unexpected error occurred during authentication.',
          success: false
        })
      }
    }

    handleAuthCallback()
  }, [searchParams, router])

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="text-blue-500 text-4xl mb-4">🔄</div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Processing Authentication
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Please wait while we complete your sign-in...
            </p>
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  if (state.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="text-green-500 text-4xl mb-4">✅</div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Authentication Successful!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Welcome! You have been successfully signed in.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Redirecting to dashboard...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Authentication Error
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {state.error}
          </p>
          <div className="space-y-3">
            <button 
              onClick={() => router.push('/login')}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
            >
              Try Again
            </button>
            <button 
              onClick={() => router.push('/auth/diagnostics')}
              className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-md transition-colors"
            >
              Run Diagnostics
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}