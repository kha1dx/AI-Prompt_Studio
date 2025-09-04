import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../src/utils/supabase/server'
import { DatabaseService } from '../../../src/lib/database'

// GET /api/conversations - List user conversations with pagination/search
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100) // Max 100 per request
    const search = searchParams.get('search')
    const status = searchParams.get('status') as 'active' | 'archived' | 'deleted' | null
    const isFavorite = searchParams.get('favorite') === 'true'
    const tags = searchParams.get('tags')?.split(',').filter(Boolean)
    const sortBy = searchParams.get('sortBy') as 'created_at' | 'updated_at' | 'last_activity_at' | 'title' || 'last_activity_at'
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc'

    // Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const db = new DatabaseService()

    // Build filters
    const filters = {
      ...(status && { status }),
      ...(search && { search }),
      ...(isFavorite && { isFavorite }),
      ...(tags && tags.length > 0 && { tags })
    }

    const pagination = {
      page,
      limit,
      sortBy,
      sortOrder
    }

    const result = await db.getConversations(user.id, filters, pagination)

    // Track analytics event
    await db.trackEvent(
      user.id,
      'conversations_listed',
      { filters, pagination },
      req.headers.get('x-session-id') || undefined,
      req.headers.get('x-forwarded-for') || req.ip,
      req.headers.get('user-agent') || undefined
    )

    return NextResponse.json({
      conversations: result.data,
      pagination: {
        page: result.page,
        limit,
        totalPages: result.totalPages,
        totalCount: result.count,
        hasMore: result.hasMore
      }
    })

  } catch (error) {
    console.error('Get conversations error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}

// POST /api/conversations - Create new conversation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { title, initialMessage, tags = [] } = body

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    // Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const db = new DatabaseService()

    // Check usage limits
    const usage = await db.getUsageLimits(user.id)
    const profile = await db.getProfile(user.id)
    
    if (usage && profile) {
      const limits = {
        free: 10,
        pro: 500,
        enterprise: -1 // Unlimited
      }
      
      const limit = limits[profile.subscription_tier as keyof typeof limits] || limits.free
      if (limit !== -1 && usage.monthly_conversations_created >= limit) {
        return NextResponse.json(
          { error: 'Monthly conversation limit exceeded' },
          { status: 429 }
        )
      }
    }

    // Create conversation
    const conversation = await db.createConversation(user.id, title, initialMessage)

    // Update conversation with tags if provided
    if (tags.length > 0) {
      await db.updateConversation(conversation.id, user.id, { tags })
    }

    // Update usage
    await db.updateUsage(user.id, { conversations: 1 })

    // Track analytics
    await db.trackEvent(
      user.id,
      'conversation_created',
      { 
        conversationId: conversation.id,
        hasInitialMessage: !!initialMessage,
        tagCount: tags.length
      },
      req.headers.get('x-session-id') || undefined,
      req.headers.get('x-forwarded-for') || req.ip,
      req.headers.get('user-agent') || undefined
    )

    return NextResponse.json(conversation, { status: 201 })

  } catch (error) {
    console.error('Create conversation error:', error)
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    )
  }
}