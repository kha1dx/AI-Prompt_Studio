import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const isSupabaseConfigured = supabaseUrl && supabaseAnonKey && 
  !supabaseUrl.includes('your_supabase') && !supabaseAnonKey.includes('your_supabase')

if (!isSupabaseConfigured) {
  console.warn('Supabase environment variables not configured properly. Please update .env.local with your actual Supabase credentials.')
}

// Mock client for when Supabase is not configured
const mockClient = {
  auth: {
    getSession: () => Promise.resolve({ data: { session: null } }),
    getUser: () => Promise.resolve({ data: { user: null } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: () => Promise.resolve({ error: new Error('Supabase not configured') }),
    signUp: () => Promise.resolve({ error: new Error('Supabase not configured') }),
    signOut: () => Promise.resolve({ error: new Error('Supabase not configured') }),
    signInWithOAuth: () => Promise.resolve({ error: new Error('Supabase not configured') }),
  },
} as unknown as SupabaseClient

export const createClient = (): SupabaseClient =>
  isSupabaseConfigured 
    ? createBrowserClient(supabaseUrl, supabaseAnonKey)
    : mockClient

export const supabase = createClient()