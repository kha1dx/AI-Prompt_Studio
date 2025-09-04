import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '../../../../src/utils/supabase/server'
import { cookies } from 'next/headers'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const PROMPT_GENERATOR_SYSTEM = `You are a prompt engineering expert. Generate a comprehensive, well-structured prompt based on the provided conversation history and extracted requirements. Follow these best practices:

1. Clear objective statement
2. Relevant context and background
3. Specific instructions
4. Output format specification
5. Examples if helpful
6. Clear constraints and guidelines

Make the prompt actionable, specific, and optimized for LLM performance. Format it as a complete, ready-to-use prompt that the user can copy and paste directly into any AI system.`

export async function POST(req: NextRequest) {
  try {
    const { sessionId, conversationId } = await req.json()

    // Accept either sessionId or conversationId for flexibility
    const targetId = sessionId || conversationId
    if (!targetId) {
      return NextResponse.json(
        { error: 'Session ID or Conversation ID is required' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
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

    // Try to get conversation data (skip non-existent prompt_sessions table)
    let session = null
    let conversationHistory: any[] = []
    
    // Handle conversationId - get conversation data
    if (conversationId) {
      const { data: conversationData, error: conversationError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('user_id', user.id)
        .single()
      
      if (conversationError || !conversationData) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        )
      }
      
      // Use messages from the conversation's messages field (JSONB)
      conversationHistory = conversationData.messages || []
      
      // Create a session-like object for compatibility
      session = {
        id: conversationData.id,
        user_id: conversationData.user_id,
        title: conversationData.title,
        conversation_history: conversationHistory,
        status: 'in_progress'
      }
    }
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session or conversation not found' },
        { status: 404 }
      )
    }

    // Check usage limits using profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, credits_used, credits_limit')
      .eq('id', user.id)
      .single()

    const tier = profile?.subscription_tier || 'free'
    const limits = {
      free: 5,
      pro: 100,
      enterprise: -1 // unlimited
    }

    const currentUsage = profile?.credits_used || 0
    const usageLimit = limits[tier as keyof typeof limits]
    
    if (usageLimit !== -1 && currentUsage >= usageLimit) {
      return NextResponse.json(
        { error: 'Monthly usage limit exceeded', limit: usageLimit, currentUsage },
        { status: 429 }
      )
    }

    // Use the conversation history we already extracted
    // conversationHistory is already set above
    
    // Create a summary of the conversation for prompt generation
    const conversationSummary = conversationHistory
      .map((msg: any) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n\n')

    // Generate the final prompt using available model
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: PROMPT_GENERATOR_SYSTEM },
        { 
          role: 'user', 
          content: `Based on this conversation, generate an optimized prompt:\n\n${conversationSummary}\n\nGenerate the final prompt now:` 
        }
      ],
      temperature: 0.1,
      max_tokens: 1500,
    })

    const generatedPrompt = response.choices[0]?.message?.content

    if (!generatedPrompt) {
      return NextResponse.json(
        { error: 'Failed to generate prompt' },
        { status: 500 }
      )
    }

    // Update the conversation with the final prompt
    if (conversationId) {
      // Update conversations table
      const { error: updateError } = await supabase
        .from('conversations')
        .update({
          stage: 'completed',
          is_complete: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Error updating conversation:', updateError)
      }
      
      // Note: saved_prompts table doesn't exist, prompt is stored in conversation.generated_prompt
    }

    // Update usage count in profiles table
    const newCreditsUsed = (profile?.credits_used || 0) + 1
    await supabase
      .from('profiles')
      .update({
        credits_used: newCreditsUsed,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    return NextResponse.json({
      success: true,
      prompt: generatedPrompt,
      sessionId: sessionId || conversationId,
      conversationId: conversationId,
      usageStatus: {
        used: newCreditsUsed,
        limit: usageLimit
      }
    })

  } catch (error) {
    console.error('Generate prompt API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}