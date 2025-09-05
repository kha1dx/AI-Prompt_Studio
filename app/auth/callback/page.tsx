'use client'

import { useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '../../../src/lib/supabase/client'

function CallbackContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const processedRef = useRef(false)

  useEffect(() => {
    if (processedRef.current) return
    processedRef.current = true

    const handleCallback = async () => {
      try {
        const code = searchParams.get('code')
        const error = searchParams.get('error')

        if (error) {
          console.error('OAuth error:', error)
          router.push(`/login?error=${error}`)
          return
        }

        if (!code) {
          console.error('No authorization code')
          router.push('/login?error=no_code')
          return
        }

        console.log('🔄 Processing OAuth callback with code:', code.substring(0, 10) + '...')

        const supabase = createClient()
        
        // First, check if we already have a session (sometimes OAuth completes despite PKCE errors)
        const { data: existingSession } = await supabase.auth.getSession()
        
        if (existingSession?.session?.user) {
          console.log('✅ Existing session found, redirecting to dashboard')
          router.push('/dashboard')
          return
        }
        
        // Try exchangeCodeForSession with better error handling
        const { data, error: authError } = await supabase.auth.exchangeCodeForSession(code)
        
        if (authError) {
          console.error('Auth error:', authError)
          
          // If it's a PKCE error, let's try a different approach
          if (authError.message.includes('code_verifier') || authError.message.includes('invalid request')) {
            console.log('🔄 PKCE error detected, attempting session recovery...')
            
            // Try to get the session directly (it might have been created despite the error)
            const { data: sessionData } = await supabase.auth.getSession()
            
            if (sessionData?.session?.user) {
              console.log('✅ Session recovered successfully!')
              router.push('/dashboard')
              return
            }
            
            // If that doesn't work, clear everything and try again
            await supabase.auth.signOut()
            console.log('🔄 Redirecting to try authentication again...')
            router.push('/login?message=please_try_again')
            return
          }
          
          // For other errors, show them to user
          router.push(`/login?error=${encodeURIComponent(authError.message)}`)
          return
        }

        if (data?.session && data?.user) {
          console.log('✅ Authentication successful:', {
            userId: data.user.id,
            email: data.user.email
          })
          
          // Success - redirect to dashboard
          router.push('/dashboard')
        } else {
          console.error('No session or user data')
          router.push('/login?error=no_session')
        }

      } catch (error) {
        console.error('Callback error:', error)
        router.push('/login?error=callback_failed')
      }
    }

    handleCallback()
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="text-blue-500 text-4xl mb-4">🔄</div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Completing Sign In...
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Please wait while we complete your authentication.
          </p>
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    </div>
  )
}

export default function QuickFixCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="text-blue-500 text-4xl mb-4">🔄</div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Loading...
            </h1>
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  )
}