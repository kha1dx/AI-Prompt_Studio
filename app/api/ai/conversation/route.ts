import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '../../../../src/utils/supabase/server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { sessionId, message, action = 'continue' } = await req.json()

    if (!sessionId || !message) {
      return NextResponse.json(
        { error: 'Session ID and message are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get existing session or create new one
    let session = null
    const { data: existingSession } = await supabase
      .from('prompt_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (existingSession) {
      session = existingSession
    } else {
      // Create new session
      const { data: newSession, error: createError } = await supabase
        .from('prompt_sessions')
        .insert({
          id: sessionId,
          user_id: user.id,
          title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
          conversation_history: [],
          status: 'in_progress'
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating session:', createError)
        return NextResponse.json(
          { error: 'Failed to create session' },
          { status: 500 }
        )
      }
      session = newSession
    }

    // Add user message to conversation history
    const conversationHistory = session.conversation_history || []
    const newMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    }
    
    conversationHistory.push(newMessage)

    // Update session with new message
    await supabase
      .from('prompt_sessions')
      .update({
        conversation_history: conversationHistory,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Message added to conversation',
      conversationHistory
    })

  } catch (error) {
    console.error('Conversation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { data: session, error } = await supabase
      .from('prompt_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (error || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      session,
      conversationHistory: session.conversation_history || []
    })

  } catch (error) {
    console.error('Get conversation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}