import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '../../../../src/utils/supabase/server'
import { DatabaseService } from '../../../../src/lib/database'

interface RouteContext {
  params: {
    conversationId: string
  }
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// System prompt for enhanced conversation experience
const SYSTEM_PROMPT = `You are an expert Prompt Engineering Assistant at Prompt Studio. Your mission is to transform vague ideas into perfectly crafted LLM prompts through engaging, conversational guidance.

**Your Core Approach:**
- Be warm, friendly, and encouraging 
- Ask ONE focused question at a time (never multiple questions in one response)
- Keep responses concise but engaging (2-3 sentences max unless generating final prompt)
- Use a conversational, helpful tone
- Guide users step-by-step through the process
- Show genuine interest in their project

**Information to Extract (through conversation):**
1. **Objective**: What they want to accomplish
2. **Context**: Background information and situation
3. **Constraints**: Specific requirements or limitations  
4. **Output Format**: How they want the response structured
5. **Audience**: Who the output is for
6. **Tone & Style**: Preferred communication style

**Conversation Flow:**
1. Start by understanding their general goal (be enthusiastic!)
2. Ask clarifying questions one at a time to build understanding
3. Build on their previous answers naturally
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

// POST /api/chat/[conversationId] - Send message to specific conversation
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { conversationId } = context.params
    const body = await req.json()
    const { message, generateFinalPrompt = false, model = 'gpt-4-1106-preview' } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
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

    // Verify conversation exists and user owns it
    const conversation = await db.getConversation(conversationId, user.id)
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Check usage limits if generating final prompt
    if (generateFinalPrompt) {
      const usage = await db.getUsageLimits(user.id)
      const profile = await db.getProfile(user.id)
      
      if (usage && profile) {
        const limits = {
          free: 5,
          pro: 100,
          enterprise: -1 // Unlimited
        }
        
        const limit = limits[profile.subscription_tier as keyof typeof limits] || limits.free
        if (limit !== -1 && usage.monthly_prompts_used >= limit) {
          return NextResponse.json(
            { error: 'Monthly prompt generation limit exceeded' },
            { status: 429 }
          )
        }
      }
    }

    // Build conversation history for OpenAI
    const messages = conversation.messages || []
    const conversationMessages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...messages.map((msg: any) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      { role: 'user' as const, content: message }
    ]

    // Track start time for performance metrics
    const startTime = Date.now()

    // Make OpenAI API call
    const response = await openai.chat.completions.create({
      model,
      messages: conversationMessages,
      stream: true,
      temperature: generateFinalPrompt ? 0.1 : 0.3,
      max_tokens: generateFinalPrompt ? 2000 : 1000,
    })

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = ''
        const processingStartTime = Date.now()
        
        try {
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content
            if (content) {
              fullResponse += content
              const data = JSON.stringify({ 
                content,
                conversationId,
                timestamp: new Date().toISOString(),
                isGeneratingPrompt: generateFinalPrompt
              })
              controller.enqueue(`data: ${data}\n\n`)
            }
          }
          
          const processingTime = Date.now() - processingStartTime

          // Add user message to conversation
          await db.addMessage(conversationId, {
            role: 'user',
            content: message,
            token_count: estimateTokens(message),
            processing_time_ms: 0
          })

          // Add assistant response to conversation
          await db.addMessage(conversationId, {
            role: 'assistant',
            content: fullResponse,
            token_count: estimateTokens(fullResponse),
            processing_time_ms: processingTime,
            metadata: { model, generateFinalPrompt }
          })

          // Update conversation
          const updateData: any = {
            messages: [
              ...messages,
              {
                id: crypto.randomUUID(),
                role: 'user',
                content: message,
                timestamp: new Date().toISOString()
              },
              {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: fullResponse,
                timestamp: new Date().toISOString()
              }
            ]
          }

          // If generating final prompt, save it
          if (generateFinalPrompt) {
            updateData.generated_prompt = fullResponse
            updateData.prompt_generated_at = new Date().toISOString()
            updateData.status = 'archived'
            
            // Update usage for prompt generation
            await db.updateUsage(user.id, { prompts: 1, apiCalls: 1 })
          } else {
            await db.updateUsage(user.id, { apiCalls: 1 })
          }

          await db.updateConversation(conversationId, user.id, updateData)

          // Track analytics
          await db.trackEvent(
            user.id,
            generateFinalPrompt ? 'prompt_generated' : 'message_sent',
            {
              conversationId,
              messageLength: message.length,
              responseLength: fullResponse.length,
              processingTimeMs: processingTime,
              model
            },
            req.headers.get('x-session-id') || undefined,
            req.headers.get('x-forwarded-for') || req.ip,
            req.headers.get('user-agent') || undefined
          )
          
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
      { error: 'Failed to process message' },
      { status: 500 }
    )
  }
}

// Utility function to estimate token count (rough approximation)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}