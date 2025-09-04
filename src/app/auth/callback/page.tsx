import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'

export default async function AuthCallback({
  searchParams,
}: {
  searchParams: { code?: string; error?: string; error_description?: string }
}) {
  const { code, error, error_description } = searchParams

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="text-red-500 text-4xl mb-4">❌</div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Authentication Error
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {error_description || error}
            </p>
            <a 
              href="/auth/login" 
              className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
            >
              Try Again
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (code) {
    const supabase = await createClient()
    
    try {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        throw exchangeError
      }

      // Successful authentication
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="text-center">
              <div className="text-green-500 text-4xl mb-4">✅</div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Authentication Successful
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Welcome! You have been successfully authenticated.
              </p>
              <div className="space-y-2">
                <a 
                  href="/dashboard" 
                  className="block w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors text-center"
                >
                  Go to Dashboard
                </a>
                <a 
                  href="/auth/diagnostics" 
                  className="block w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-md transition-colors text-center"
                >
                  View Diagnostics
                </a>
              </div>
            </div>
          </div>
        </div>
      )
    } catch (exchangeError) {
      console.error('Auth callback error:', exchangeError)
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="text-center">
              <div className="text-red-500 text-4xl mb-4">❌</div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Session Exchange Failed
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {exchangeError instanceof Error ? exchangeError.message : 'Unknown error occurred'}
              </p>
              <div className="space-y-2">
                <a 
                  href="/auth/login" 
                  className="block w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors text-center"
                >
                  Try Again
                </a>
                <a 
                  href="/auth/diagnostics" 
                  className="block w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-md transition-colors text-center"
                >
                  Run Diagnostics
                </a>
              </div>
            </div>
          </div>
        </div>
      )
    }
  }

  // No code or error - might be a direct visit
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="text-blue-500 text-4xl mb-4">🔄</div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Processing Authentication
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Please wait while we process your authentication...
          </p>
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            If this takes too long, you can{' '}
            <a href="/auth/login" className="text-blue-600 hover:text-blue-700 underline">
              try again
            </a>
            {' '}or{' '}
            <a href="/auth/diagnostics" className="text-blue-600 hover:text-blue-700 underline">
              run diagnostics
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}