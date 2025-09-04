import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../../src/utils/supabase/server'
import { DatabaseService } from '../../../../../src/lib/database'

interface RouteContext {
  params: {
    id: string
  }
}

// POST /api/conversations/[id]/duplicate - Duplicate conversation
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id } = context.params

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

    // Check if original conversation exists
    const original = await db.getConversation(id, user.id)
    if (!original) {
      return NextResponse.json(
        { error: 'Original conversation not found' },
        { status: 404 }
      )
    }

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

    // Duplicate conversation
    const duplicatedConversation = await db.duplicateConversation(id, user.id)

    // Update usage
    await db.updateUsage(user.id, { conversations: 1 })

    // Track analytics
    await db.trackEvent(
      user.id,
      'conversation_duplicated',
      { 
        originalId: id,
        duplicatedId: duplicatedConversation.id
      },
      req.headers.get('x-session-id') || undefined
    )

    return NextResponse.json(duplicatedConversation, { status: 201 })

  } catch (error) {
    console.error('Duplicate conversation error:', error)
    return NextResponse.json(
      { error: 'Failed to duplicate conversation' },
      { status: 500 }
    )
  }
}