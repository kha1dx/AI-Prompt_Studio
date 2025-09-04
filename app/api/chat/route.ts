import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '../../../src/utils/supabase/server'
import { cookies } from 'next/headers'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// System prompt for prompt engineering guidance
const SYSTEM_PROMPT = `You are a prompt engineering expert helping users create better LLM prompts. Your job is to have a natural conversation to extract:
1. The user's objective/goal
2. Relevant context and background
3. Specific constraints or requirements
4. Desired output format
5. Target audience
6. Preferred tone/style

Ask follow-up questions naturally and conversationally. Be concise but thorough. Once you have sufficient information, offer to generate a comprehensive, well-structured prompt that follows best practices:
- Clear objective statement
- Relevant context and background
- Specific instructions
- Output format specification
- Examples if helpful
- Clear constraints and guidelines

When generating the final prompt, format it in a code block for easy copying.`

export async function POST(req: NextRequest) {
  try {
    const { messages, sessionId, generateFinalPrompt = false } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
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

    // Prepare messages with system prompt
    const systemMessage = { role: 'system' as const, content: SYSTEM_PROMPT }
    const conversationMessages = [systemMessage, ...messages]

    // Use GPT-4-mini as specified in PRD
    const model = generateFinalPrompt ? 'gpt-4-turbo' : 'gpt-4o-mini'
    
    const response = await openai.chat.completions.create({
      model,
      messages: conversationMessages,
      stream: true,
      temperature: generateFinalPrompt ? 0.1 : 0.3,
      max_tokens: generateFinalPrompt ? 1500 : 1000,
    })

    // Create a readable stream for the response
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = ''
        
        try {
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content
            if (content) {
              fullResponse += content
              const data = JSON.stringify({ 
                content,
                sessionId: sessionId || null,
                timestamp: new Date().toISOString()
              })
              controller.enqueue(`data: ${data}\n\n`)
            }
          }
          
          // Save conversation to database if sessionId provided
          if (sessionId) {
            const { error: saveError } = await supabase
              .from('prompt_sessions')
              .upsert({
                id: sessionId,
                user_id: user.id,
                conversation_history: [...messages, { role: 'assistant', content: fullResponse }],
                updated_at: new Date().toISOString(),
                ...(generateFinalPrompt && { 
                  final_prompt: fullResponse,
                  status: 'completed' 
                })
              })
              
            if (saveError) {
              console.error('Error saving conversation:', saveError)
            }
          }

          // Update usage count
          if (generateFinalPrompt) {
            await supabase
              .from('usage_limits')
              .upsert({
                user_id: user.id,
                monthly_prompts_used: currentUsage + 1,
                last_reset_date: new Date().toISOString().split('T')[0]
              })
          }
          
          controller.enqueue(`data: [DONE]\n\n`)
          controller.close()
        } catch (error) {
          console.error('Streaming error:', error)
          controller.error(error)
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}