'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../src/contexts/AuthContext'
import { AuthLayout } from '../../src/components/auth/AuthLayout'
import { AuthForm } from '../../src/components/auth/AuthForm'
import { GoogleAuthButton } from '../../src/components/auth/GoogleAuthButton'

export default function SignupPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const { signUp, signInWithGoogle } = useAuth()
  const router = useRouter()

  const handleEmailSignup = async (email: string, password: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const { error } = await signUp(email, password)
      
      if (error) {
        setError(error.message)
      } else {
        setSuccess(true)
        // Redirect to login after showing success message
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { error } = await signInWithGoogle()
      
      if (error) {
        setError(error.message)
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <AuthLayout title="Check your email">
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Registration successful!
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  We&apos;ve sent you a confirmation email. Please check your inbox and click the link to verify your account.
                </p>
              </div>
            </div>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout 
      title="Create your account"
      subtitle="Join us today! Please fill in your details."
    >
      <AuthForm
        type="signup"
        onSubmit={handleEmailSignup}
        loading={loading}
        error={error}
      />
      <GoogleAuthButton
        loading={loading}
        onGoogleSignIn={handleGoogleSignup}
      />
    </AuthLayout>
  )
}