import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '../../../src/utils/supabase/server'

// Debug environment variables
if (process.env.NODE_ENV === 'development') {
  console.log('🔍 [API ENV CHECK]', {
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    openAIKeyPrefix: process.env.OPENAI_API_KEY?.substring(0, 10) + '...',
  })
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// System prompt for prompt engineering guidance - aligned with PRD requirements
const SYSTEM_PROMPT = `You are an expert Prompt Engineering Assistant at Prompt Studio. Your mission is to transform vague ideas into perfectly crafted LLM prompts through engaging, conversational guidance.

**Your Core Approach:**
- Be warm, friendly, and encouraging 
- Ask ONE focused question at a time (never multiple questions in one response)
- Keep responses concise but engaging
- Use a conversational, helpful tone
- Guide users step-by-step through the process

**Information to Extract (through conversation):**
1. **Objective**: What they want to accomplish
2. **Context**: Background information and situation
3. **Constraints**: Specific requirements or limitations  
4. **Output Format**: How they want the response structured
5. **Audience**: Who the output is for
6. **Tone & Style**: Preferred communication style

**Conversation Flow:**
1. Start by understanding their general goal
2. Ask clarifying questions one at a time
3. Build on their previous answers
4. Once you have sufficient info (4-6 exchanges), offer to generate their optimized prompt
5. When generating the final prompt, create a comprehensive, well-structured prompt following best practices

**Final Prompt Format:**
When ready to generate, create a detailed prompt in a code block with:
- Clear objective statement
- Relevant context and background
- Specific instructions
- Output format requirements
- Examples if helpful
- Clear constraints and guidelines

Remember: Keep it conversational, friendly, and focused on one question at a time. You're helping them build something amazing!`

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
      console.error('🚨 [CONFIG ERROR] OpenAI API key missing')
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // Authenticate user with detailed error handling
    let supabase
    let user
    
    try {
      supabase = await createClient()
      const { data: authData, error: authError } = await supabase.auth.getUser()
      user = authData?.user
      
      if (authError) {
        console.error('🚨 [AUTH ERROR]', authError)
        return NextResponse.json(
          { error: 'Authentication failed', details: authError.message },
          { status: 401 }
        )
      }
      
      if (!user) {
        console.log('🚨 [NO USER] No authenticated user found')
        return NextResponse.json(
          { error: 'No authenticated user found. Please login first.' },
          { status: 401 }
        )
      }
      
      console.log('✅ [AUTH SUCCESS]', { userId: user.id, email: user.email })
      
    } catch (error) {
      console.error('🚨 [SUPABASE ERROR]', error)
      return NextResponse.json(
        { error: 'Database connection failed', details: error.message },
        { status: 500 }
      )
    }

    // Check usage limits using correct database schema
    let tier = 'free'
    let currentUsage = 0
    let limit = 5

    try {
      // Get profile info
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .single()

      if (profile) {
        tier = profile.subscription_tier || 'free'
      }

      // Get usage limits from proper table
      const { data: usageLimits, error: usageError } = await supabase
        .from('usage_limits')
        .select('monthly_prompts_used')
        .eq('user_id', user.id)
        .single()

      if (usageLimits) {
        currentUsage = usageLimits.monthly_prompts_used || 0
      }

      // Set limits based on tier
      limit = tier === 'pro' ? 100 : 5

      console.log('📊 [USAGE CHECK]', { tier, currentUsage, limit })

      // Handle missing profile/usage data
      if (profileError || usageError) {
        console.log('⚠️ [MISSING DATA] Creating missing user data:', {
          profileError: profileError?.message,
          usageError: usageError?.message
        })

        // Create profile if missing
        if (profileError) {
          await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              subscription_tier: 'free'
            })
            .select()
            .single()
        }

        // Create usage limits if missing
        if (usageError) {
          await supabase
            .from('usage_limits')
            .insert({
              user_id: user.id,
              monthly_prompts_used: 0
            })
            .select()
            .single()
        }
      }

    } catch (dbError) {
      console.error('🚨 [DB QUERY ERROR]', dbError)
      // Continue with defaults if DB query fails
      console.log('⚠️ [FALLBACK] Using default limits due to DB error')
    }
    
    if (limit !== -1 && currentUsage >= limit) {
      console.log('🛑 [LIMIT EXCEEDED]', { currentUsage, limit })
      return NextResponse.json(
        { error: 'Monthly usage limit exceeded', limit, currentUsage },
        { status: 429 }
      )
    }

    // Prepare messages with system prompt
    const systemMessage = { role: 'system' as const, content: SYSTEM_PROMPT }
    const conversationMessages = [systemMessage, ...messages]

    // Use available model - updated based on API testing
    const model = 'gpt-4.1-mini' // Use available model from OpenAI API
    
    console.log('🤖 [OPENAI REQUEST]', { model, messageCount: conversationMessages.length })
    
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
          
          // Save conversation to prompt_sessions table if sessionId provided
          if (sessionId) {
            const conversationHistory = [...messages, { role: 'assistant', content: fullResponse }]
            
            try {
              const { error: saveError } = await supabase
                .from('prompt_sessions')
                .upsert({
                  id: sessionId,
                  user_id: user.id,
                  conversation_history: conversationHistory,
                  final_prompt: generateFinalPrompt ? fullResponse : null,
                  status: generateFinalPrompt ? 'completed' : 'in_progress',
                  title: messages[0]?.content?.substring(0, 50) + '...' || 'New Session',
                  updated_at: new Date().toISOString()
                })
                
              if (saveError) {
                console.error('🚨 [SAVE ERROR]', saveError)
              } else {
                console.log('✅ [SESSION SAVED]', sessionId)
              }
            } catch (saveError) {
              console.error('🚨 [SAVE EXCEPTION]', saveError)
            }
          }

          // Update usage count in usage_limits table
          if (generateFinalPrompt) {
            try {
              const { error: updateError } = await supabase
                .from('usage_limits')
                .update({
                  monthly_prompts_used: currentUsage + 1
                })
                .eq('user_id', user.id)
                
              if (updateError) {
                console.error('🚨 [UPDATE ERROR]', updateError)
              } else {
                console.log('✅ [USAGE UPDATED]', { userId: user.id, newUsage: currentUsage + 1 })
              }
            } catch (updateError) {
              console.error('🚨 [UPDATE EXCEPTION]', updateError)
            }
          }
          
          controller.enqueue(`data: [DONE]\n\n`)
          controller.close()
        } catch (error) {
          console.error('🚨 [STREAMING ERROR]', error)
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
    console.error('🚨 [CHAT API ERROR]', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}