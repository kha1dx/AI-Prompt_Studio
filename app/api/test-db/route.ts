import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../src/utils/supabase/server'

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 [test-db] Starting database connection test...')
    
    const supabase = await createClient()
    
    // Test 1: Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('🔍 [test-db] Auth test:', { 
      hasUser: !!user, 
      userId: user?.id, 
      email: user?.email,
      authError: authError?.message 
    })

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication failed',
        details: authError?.message,
        tests: {
          auth: false
        }
      })
    }

    const results = {
      auth: true,
      user: {
        id: user.id,
        email: user.email,
        conversationCount: 0,
        sampleConversations: [] as any[]
      },
      tables: {} as any,
      errors: [] as any[]
    }

    // Test 2: Check if conversations table exists and is accessible
    try {
      console.log('🔍 [test-db] Testing conversations table...')
      const { data: conversationsTest, error: conversationsError } = await supabase
        .from('conversations')
        .select('count(*)')
        .limit(1)

      if (conversationsError) {
        console.error('🚨 [test-db] Conversations table error:', conversationsError)
        results.tables.conversations = false
        results.errors.push({
          table: 'conversations',
          error: conversationsError.message,
          details: conversationsError.details,
          hint: conversationsError.hint,
          code: conversationsError.code
        })
      } else {
        results.tables.conversations = true
        console.log('✅ [test-db] Conversations table accessible')
      }
    } catch (error: any) {
      results.tables.conversations = false
      results.errors.push({
        table: 'conversations',
        error: error.message,
        stack: error.stack
      })
    }

    // Test 3: Try to get user's conversations
    try {
      console.log('🔍 [test-db] Testing user conversations query...')
      const { data: userConversations, error: userConversationsError } = await supabase
        .from('conversations')
        .select('id, title, created_at')
        .eq('user_id', user.id)
        .limit(5)

      if (userConversationsError) {
        console.error('🚨 [test-db] User conversations error:', userConversationsError)
        results.tables.userConversations = false
        results.errors.push({
          table: 'userConversations',
          error: userConversationsError.message,
          details: userConversationsError.details,
          hint: userConversationsError.hint,
          code: userConversationsError.code
        })
      } else {
        results.tables.userConversations = true
        results.user.conversationCount = userConversations?.length || 0
        results.user.sampleConversations = userConversations?.map(c => ({
          id: c.id,
          title: c.title
        })) || []
        console.log('✅ [test-db] User conversations accessible:', userConversations?.length || 0)
      }
    } catch (error: any) {
      results.tables.userConversations = false
      results.errors.push({
        table: 'userConversations',
        error: error.message,
        stack: error.stack
      })
    }

    // Test 4: Check environment variables
    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    }

    return NextResponse.json({
      success: results.errors.length === 0,
      timestamp: new Date().toISOString(),
      environment: envCheck,
      results,
      summary: {
        auth: results.auth,
        tablesWorking: Object.values(results.tables).filter(Boolean).length,
        totalTables: Object.keys(results.tables).length,
        errorCount: results.errors.length
      }
    })

  } catch (error: any) {
    console.error('🚨 [test-db] Fatal error:', error)
    return NextResponse.json({
      success: false,
      error: 'Fatal database test error',
      message: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
