'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../src/contexts/AuthContext'
import { AuthLayout } from '../../src/components/auth/AuthLayout'
import { AuthForm } from '../../src/components/auth/AuthForm'
import { GoogleAuthButton } from '../../src/components/auth/GoogleAuthButton'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { signIn, signInWithGoogle } = useAuth()
  const router = useRouter()

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