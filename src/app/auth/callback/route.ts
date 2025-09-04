import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  console.log('🔄 [AUTH] Server-side OAuth callback:', {
    hasCode: !!code,
    origin,
    next
  })

  if (code) {
    try {
      const supabase = await createClient()
      
      console.log('🔐 [AUTH] Exchanging authorization code for session (PKCE flow)')
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('❌ [AUTH] PKCE exchange failed:', error)
        
        // Handle PKCE specific errors
        if (error.message.includes('code verifier') || error.message.includes('invalid request')) {
          console.error('❌ [AUTH] PKCE code verifier error - redirecting to login with error')
          return NextResponse.redirect(`${origin}/login?error=pkce_error&message=${encodeURIComponent('PKCE authentication failed. Please try again.')}`)
        }
        
        return NextResponse.redirect(`${origin}/login?error=auth_error&message=${encodeURIComponent(error.message)}`)
      }

      if (data.user) {
        console.log('✅ [AUTH] PKCE authentication successful:', {
          userId: data.user.id,
          email: data.user.email,
          provider: data.user.app_metadata?.provider
        })
        
        // Successful authentication - redirect to intended destination
        return NextResponse.redirect(`${origin}${next}`)
      } else {
        console.error('❌ [AUTH] No user data received after PKCE exchange')
        return NextResponse.redirect(`${origin}/login?error=no_user&message=${encodeURIComponent('Authentication succeeded but no user profile was received')}`)
      }
      
    } catch (error) {
      console.error('❌ [AUTH] Unexpected error in PKCE callback:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unexpected authentication error'
      return NextResponse.redirect(`${origin}/login?error=callback_error&message=${encodeURIComponent(errorMessage)}`)
    }
  }

  // No code parameter - likely an error callback
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  
  if (error) {
    console.error('❌ [AUTH] OAuth error in callback:', { error, errorDescription })
    return NextResponse.redirect(`${origin}/login?error=${error}&message=${encodeURIComponent(errorDescription || 'OAuth authentication failed')}`)
  }

  // No code and no error - invalid callback
  console.warn('⚠️ [AUTH] Invalid callback - no code or error parameters')
  return NextResponse.redirect(`${origin}/login?error=invalid_callback&message=${encodeURIComponent('Invalid authentication callback')}`)
}