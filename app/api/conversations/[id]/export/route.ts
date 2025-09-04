import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../../src/utils/supabase/server'
import { DatabaseService } from '../../../../../src/lib/database'

interface RouteContext {
  params: {
    id: string
  }
}

// GET /api/conversations/[id]/export - Export conversation
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = context.params
    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format') || 'json' // json, markdown, txt

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

    // Track analytics
    await db.trackEvent(
      user.id,
      'conversation_exported',
      { 
        conversationId: id,
        format
      },
      req.headers.get('x-session-id') || undefined
    )

    let content: string
    let contentType: string
    let filename: string

    switch (format) {
      case 'markdown':
        content = formatAsMarkdown(conversation)
        contentType = 'text/markdown'
        filename = `${conversation.title.replace(/[^a-zA-Z0-9]/g, '_')}.md`
        break

      case 'txt':
        content = formatAsText(conversation)
        contentType = 'text/plain'
        filename = `${conversation.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`
        break

      case 'json':
      default:
        content = JSON.stringify(conversation, null, 2)
        contentType = 'application/json'
        filename = `${conversation.title.replace(/[^a-zA-Z0-9]/g, '_')}.json`
        break
    }

    return new NextResponse(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Export conversation error:', error)
    return NextResponse.json(
      { error: 'Failed to export conversation' },
      { status: 500 }
    )
  }
}

function formatAsMarkdown(conversation: any): string {
  let content = `# ${conversation.title}\n\n`
  content += `**Created:** ${new Date(conversation.created_at).toLocaleDateString()}\n`
  content += `**Status:** ${conversation.status}\n`
  
  if (conversation.tags && conversation.tags.length > 0) {
    content += `**Tags:** ${conversation.tags.join(', ')}\n`
  }
  
  content += `\n## Messages\n\n`

  if (conversation.messages && conversation.messages.length > 0) {
    conversation.messages.forEach((message: any, index: number) => {
      const role = message.role === 'user' ? '🧑 User' : '🤖 Assistant'
      content += `### ${role} (${new Date(message.timestamp).toLocaleString()})\n\n`
      content += `${message.content}\n\n---\n\n`
    })
  }

  if (conversation.generated_prompt) {
    content += `## Generated Prompt\n\n`
    content += `\`\`\`\n${conversation.generated_prompt}\n\`\`\`\n\n`
    content += `**Generated on:** ${new Date(conversation.prompt_generated_at).toLocaleString()}\n`
  }

  return content
}

function formatAsText(conversation: any): string {
  let content = `${conversation.title}\n`
  content += `${'='.repeat(conversation.title.length)}\n\n`
  content += `Created: ${new Date(conversation.created_at).toLocaleDateString()}\n`
  content += `Status: ${conversation.status}\n`
  
  if (conversation.tags && conversation.tags.length > 0) {
    content += `Tags: ${conversation.tags.join(', ')}\n`
  }
  
  content += `\nMessages:\n${'-'.repeat(50)}\n\n`

  if (conversation.messages && conversation.messages.length > 0) {
    conversation.messages.forEach((message: any, index: number) => {
      const role = message.role === 'user' ? 'USER' : 'ASSISTANT'
      content += `[${role}] ${new Date(message.timestamp).toLocaleString()}\n`
      content += `${message.content}\n\n`
    })
  }

  if (conversation.generated_prompt) {
    content += `Generated Prompt:\n${'-'.repeat(50)}\n`
    content += `${conversation.generated_prompt}\n\n`
    content += `Generated on: ${new Date(conversation.prompt_generated_at).toLocaleString()}\n`
  }

  return content
}