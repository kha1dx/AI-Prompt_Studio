import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../src/utils/supabase/server'
import { DatabaseService } from '../../../../src/lib/database'

interface RouteContext {
  params: {
    id: string
  }
}

// GET /api/conversations/[id] - Get specific conversation
export async function GET(req: NextRequest, context: RouteContext) {
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
    const conversation = await db.getConversation(id, user.id)

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Track view event
    await db.trackEvent(
      user.id,
      'conversation_viewed',
      { conversationId: id },
      req.headers.get('x-session-id') || undefined
    )

    return NextResponse.json(conversation)

  } catch (error) {
    console.error('Get conversation error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    )
  }
}

// PUT /api/conversations/[id] - Update conversation (title, tags, favorite)
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { id } = context.params
    const body = await req.json()
    const { title, tags, is_favorite, status } = body

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

    // Verify conversation exists and user owns it
    const existing = await db.getConversation(id, user.id)
    if (!existing) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Build updates object
    const updates: any = {}
    if (title !== undefined) updates.title = title
    if (tags !== undefined) updates.tags = tags
    if (is_favorite !== undefined) updates.is_favorite = is_favorite
    if (status !== undefined) updates.status = status

    const updatedConversation = await db.updateConversation(id, user.id, updates)

    // Track analytics
    await db.trackEvent(
      user.id,
      'conversation_updated',
      { 
        conversationId: id,
        updates: Object.keys(updates)
      },
      req.headers.get('x-session-id') || undefined
    )

    return NextResponse.json(updatedConversation)

  } catch (error) {
    console.error('Update conversation error:', error)
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    )
  }
}

// DELETE /api/conversations/[id] - Delete conversation
export async function DELETE(req: NextRequest, context: RouteContext) {
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

    // Verify conversation exists
    const existing = await db.getConversation(id, user.id)
    if (!existing) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    await db.deleteConversation(id, user.id)

    // Track analytics
    await db.trackEvent(
      user.id,
      'conversation_deleted',
      { conversationId: id },
      req.headers.get('x-session-id') || undefined
    )

    return NextResponse.json({ message: 'Conversation deleted successfully' })

  } catch (error) {
    console.error('Delete conversation error:', error)
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    )
  }
}