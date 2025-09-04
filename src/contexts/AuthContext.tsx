'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import type { AuthContextType, AuthState } from '../types/auth'
import { createClient } from '../lib/supabase/client'
import { getAuthLogger } from '../utils/diagnostics/auth-logger'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  })

  const supabase = createClient()
  const logger = getAuthLogger(process.env.NODE_ENV === 'development')

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        logger.startTimer('getInitialSession')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        await logger.logSessionCheck({ session }, error || undefined)
        
        setState({
          user: session?.user ?? null,
          session,
          loading: false,
        })
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 [AUTH] Initial session loaded:', {
            hasSession: !!session,
            hasUser: !!session?.user,
            userId: session?.user?.id
          })
        }
      } catch (error) {
        console.error('❌ [AUTH] Error getting initial session:', error)
        setState(prev => ({ ...prev, loading: false }))
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 [AUTH] Auth state changed:', {
            event,
            hasSession: !!session,
            hasUser: !!session?.user,
            userId: session?.user?.id
          })
        }
        
        // Log the auth state change
        logger.logAuthAttempt(
          `authStateChange-${event}`,
          true,
          {
            event,
            sessionExists: !!session,
            userExists: !!session?.user
          },
          undefined,
          session?.user || null,
          session
        )
        
        setState({
          user: session?.user ?? null,
          session,
          loading: false,
        })
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth])

  const signIn = async (email: string, password: string) => {
    try {
      logger.startTimer('signIn')
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔐 [AUTH] Attempting sign in:', {
          email: email.replace(/^(.{3}).*(@.+)$/, '$1***$2'),
          hasPassword: !!password
        })
      }
      
      const response = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      await logger.logSignIn(email, password, response)
      
      if (response.error) {
        console.error('❌ [AUTH] Sign in failed:', response.error.message)
      } else {
        console.log('✅ [AUTH] Sign in successful')
      }
      
      return { error: response.error }
    } catch (error) {
      const authError = error as any
      console.error('❌ [AUTH] Sign in error:', authError)
      return { error: authError }
    }
  }

  const signUp = async (email: string, password: string) => {
    try {
      logger.startTimer('signUp')
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📝 [AUTH] Attempting sign up:', {
          email: email.replace(/^(.{3}).*(@.+)$/, '$1***$2'),
          hasPassword: !!password
        })
      }
      
      const response = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })
      
      await logger.logSignUp(email, password, response)
      
      if (response.error) {
        console.error('❌ [AUTH] Sign up failed:', response.error.message)
      } else if (response.data.user && !response.data.session) {
        console.log('📧 [AUTH] Sign up successful - check email for confirmation')
      } else {
        console.log('✅ [AUTH] Sign up successful with immediate login')
      }
      
      return { error: response.error }
    } catch (error) {
      const authError = error as any
      console.error('❌ [AUTH] Sign up error:', authError)
      return { error: authError }
    }
  }

  const signOut = async () => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🚪 [AUTH] Attempting sign out')
      }
      
      const response = await supabase.auth.signOut()
      
      await logger.logSignOut(response)
      
      if (response.error) {
        console.error('❌ [AUTH] Sign out failed:', response.error.message)
      } else {
        console.log('✅ [AUTH] Sign out successful')
      }
      
      return response
    } catch (error) {
      const authError = error as any
      console.error('❌ [AUTH] Sign out error:', authError)
      return { error: authError }
    }
  }

  const signInWithGoogle = async () => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔗 [AUTH] Attempting Google OAuth sign in')
      }
      
      const response = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        },
      })
      
      await logger.logOAuthSignIn('google', response)
      
      if (response.error) {
        console.error('❌ [AUTH] Google OAuth failed:', response.error.message)
      } else {
        console.log('🔄 [AUTH] Redirecting to Google OAuth...')
      }
      
      return response
    } catch (error) {
      const authError = error as any
      console.error('❌ [AUTH] Google OAuth error:', authError)
      return { error: authError }
    }
  }

  const value: AuthContextType = {
    ...state,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}