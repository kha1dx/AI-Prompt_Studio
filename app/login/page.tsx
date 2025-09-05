'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../../src/contexts/AuthContext'
import { AuthLayout } from '../../src/components/auth/AuthLayout'
import { AuthForm } from '../../src/components/auth/AuthForm'
import { GoogleAuthButton } from '../../src/components/auth/GoogleAuthButton'

function LoginContent() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { signIn, signInWithGoogle } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Handle OAuth callback errors
  useEffect(() => {
    const oauthError = searchParams.get('error')
    const errorMessage = searchParams.get('message')
    
    if (oauthError) {
      console.log('🔍 [AUTH] OAuth error detected:', { oauthError, errorMessage })
      
      switch (oauthError) {
        case 'pkce_error':
          setError('PKCE authentication failed. This is a security feature. Please try signing in again.')
          break
        case 'auth_error':
          setError(errorMessage ? decodeURIComponent(errorMessage) : 'Authentication failed')
          break
        case 'no_user':
          setError('Authentication succeeded but no user profile was received. Please try again.')
          break
        case 'callback_error':
          setError(errorMessage ? decodeURIComponent(errorMessage) : 'Unexpected authentication error')
          break
        case 'invalid_callback':
          setError('Invalid authentication callback. Please try signing in again.')
          break
        case 'bad_oauth_state':
          setError('OAuth state validation failed. This security check has failed. Please try again.')
          break
        default:
          setError(errorMessage ? decodeURIComponent(errorMessage) : 'Authentication failed')
      }
      
      // Clear URL parameters after displaying error
      const cleanUrl = window.location.pathname
      window.history.replaceState(null, '', cleanUrl)
    }
    
    if (errorMessage === 'please_try_again') {
      setError('Authentication session recovery needed. Please try signing in again.')
    }
  }, [searchParams])

  const handleEmailLogin = async (email: string, password: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const { error } = await signIn(email, password)
      
      if (error) {
        setError(error.message)
      } else {
        router.push('/dashboard')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { error } = await signInWithGoogle()
      
      if (error) {
        setError(error.message)
      }
      // Note: For OAuth, the user will be redirected to the provider,
      // then back to our app, so we don't need to handle success here
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout 
      title="Sign in to your account"
      subtitle="Welcome back! Please enter your details."
    >
      <AuthForm
        type="login"
        onSubmit={handleEmailLogin}
        loading={loading}
        error={error}
      />
      <GoogleAuthButton
        loading={loading}
        onGoogleSignIn={handleGoogleLogin}
      />
    </AuthLayout>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}