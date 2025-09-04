import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Check if Supabase is configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your_supabase') || supabaseAnonKey.includes('your_supabase')) {
    // If Supabase is not configured, just continue without auth checks
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  let user = null
  try {
    // Add timeout and error handling for auth checks
    const authPromise = supabase.auth.getUser()
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Auth check timeout')), 5000)
    )
    
    const { data, error } = await Promise.race([authPromise, timeoutPromise]) as any
    
    if (error) {
      console.warn('⚠️ [MIDDLEWARE] Auth error:', error.message)
    } else {
      user = data?.user || null
      
      // Validate token freshness
      if (user) {
        const session = data?.session
        if (session?.expires_at) {
          const expiresAt = session.expires_at
          const now = Math.floor(Date.now() / 1000)
          
          if (expiresAt < now) {
            console.warn('⚠️ [MIDDLEWARE] Token expired, treating as no user')
            user = null
          }
        }
      }
    }
  } catch (error: any) {
    console.error('❌ [MIDDLEWARE] Auth check failed:', error.message)
    user = null // Treat auth failures as unauthenticated
  }

  // Enhanced logging for debugging auth flow
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [MIDDLEWARE]', {
      path: request.nextUrl.pathname,
      hasUser: !!user,
      userId: user?.id ? user.id.substring(0, 8) + '...' : 'undefined...',
      userEmail: user?.email?.replace(/^(.{3}).*(@.+)$/, '$1***$2') || undefined,
      timestamp: new Date().toISOString()
    })
  }

  // Protected routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!user) {
      // no user, redirect to login page
      console.log('🚪 [MIDDLEWARE] Redirecting to login: no user for protected route')
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  // Redirect authenticated users away from auth pages
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    console.log('🔄 [MIDDLEWARE] Redirecting authenticated user to dashboard')
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}