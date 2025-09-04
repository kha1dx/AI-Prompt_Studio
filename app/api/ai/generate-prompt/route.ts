import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/utils/supabase/server'
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
    const { sessionId } = await req.json()

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get the conversation session
    const { data: session, error: sessionError } = await supabase
      .from('prompt_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Check usage limits
    const { data: usageData } = await supabase
      .from('usage_limits')
      .select('monthly_prompts_used, last_reset_date')
      .eq('user_id', user.id)
      .single()

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()

    const tier = profile?.subscription_tier || 'free'
    const limits = {
      free: 5,
      pro: 100,
      enterprise: -1 // unlimited
    }

    const currentUsage = usageData?.monthly_prompts_used || 0
    const limit = limits[tier as keyof typeof limits]
    
    if (limit !== -1 && currentUsage >= limit) {
      return NextResponse.json(
        { error: 'Monthly usage limit exceeded', limit, currentUsage },
        { status: 429 }
      )
    }

    // Extract conversation history
    const conversationHistory = session.conversation_history || []
    
    // Create a summary of the conversation for prompt generation
    const conversationSummary = conversationHistory
      .map((msg: any) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n\n')

    // Generate the final prompt using GPT-4-turbo for higher quality
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
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

    // Update the session with the final prompt
    const { error: updateError } = await supabase
      .from('prompt_sessions')
      .update({
        final_prompt: generatedPrompt,
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    if (updateError) {
      console.error('Error updating session:', updateError)
    }

    // Update usage count
    await supabase
      .from('usage_limits')
      .upsert({
        user_id: user.id,
        monthly_prompts_used: currentUsage + 1,
        last_reset_date: new Date().toISOString().split('T')[0]
      })

    return NextResponse.json({
      success: true,
      prompt: generatedPrompt,
      sessionId,
      usageStatus: {
        used: currentUsage + 1,
        limit
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