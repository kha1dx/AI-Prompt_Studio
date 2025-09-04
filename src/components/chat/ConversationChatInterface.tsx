'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Loader2, Sparkles, Copy, Download, User, Bot } from 'lucide-react'
import { useConversations } from '../../hooks/useConversations'
import { useMessages } from '../../hooks/useMessages'
import { useAuth } from '../../contexts/AuthContext'
import { conversationService, messageService } from '../../lib/database'
import type { Message } from '../../lib/database'

interface ConversationChatInterfaceProps {
  conversationId?: string
  onConversationCreate?: (conversationId: string) => void
  onConversationUpdate?: () => void
  templateText?: string
  onTemplateUsed?: () => void
}

export default function ConversationChatInterface({
  conversationId,
  onConversationCreate,
  onConversationUpdate,
  templateText,
  onTemplateUsed
}: ConversationChatInterfaceProps) {
  const { user } = useAuth()
  const { createConversation, updateConversation } = useConversations()
  const { messages, addMessage, loadMessages } = useMessages(conversationId)
  
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingResponse, setStreamingResponse] = useState('')
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(conversationId)
  const [error, setError] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingResponse])

  // Update conversation ID when prop changes
  useEffect(() => {
    setCurrentConversationId(conversationId)
  }, [conversationId])

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversationId) {
      loadMessages(currentConversationId)
    }
  }, [currentConversationId, loadMessages])

  // Handle template text insertion
  useEffect(() => {
    if (templateText) {
      setInput(templateText)
      onTemplateUsed?.()
    }
  }, [templateText, onTemplateUsed])

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading || !user) return

    const messageContent = input.trim()
    setInput('')
    setError(null)
    setIsLoading(true)
    setStreamingResponse('')

    try {
      let workingConversationId = currentConversationId

      // Create conversation if it doesn't exist
      if (!workingConversationId) {
        const newConversation = await createConversation(
          messageContent.length > 50 
            ? messageContent.substring(0, 50) + '...'
            : messageContent
        )
        
        if (!newConversation) {
          throw new Error('Failed to create conversation')
        }
        
        workingConversationId = newConversation.id
        setCurrentConversationId(workingConversationId)
        onConversationCreate?.(workingConversationId)
      }

      // Add user message to database
      const userMessage = await messageService.create(
        workingConversationId,
        'user',
        messageContent
      )

      // Update local messages
      await loadMessages(workingConversationId)

      // Create abort controller for this request
      abortControllerRef.current = new AbortController()

      // Stream AI response
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...messages.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            {
              role: 'user',
              content: messageContent
            }
          ],
          conversationId: workingConversationId
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response stream available')
      }

      let assistantResponse = ''
      const decoder = new TextDecoder()

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim()
              if (data === '[DONE]') {
                // Save final assistant message to database
                if (assistantResponse.trim()) {
                  await messageService.create(
                    workingConversationId,
                    'assistant',
                    assistantResponse.trim()
                  )
                  
                  // Update conversation with latest activity
                  await updateConversation(workingConversationId, {
                    last_activity_at: new Date().toISOString(),
                    message_count: messages.length + 2, // +2 for user and assistant messages
                    messages: [
                      ...messages.map(msg => ({ 
                        role: msg.role, 
                        content: msg.content, 
                        timestamp: msg.created_at 
                      })),
                      { role: 'user', content: messageContent, timestamp: new Date().toISOString() },
                      { role: 'assistant', content: assistantResponse.trim(), timestamp: new Date().toISOString() }
                    ]
                  })
                  
                  onConversationUpdate?.()
                }
                setStreamingResponse('')
                await loadMessages(workingConversationId)
                return
              }

              try {
                const parsed = JSON.parse(data)
                const content = parsed.content || parsed.choices?.[0]?.delta?.content
                if (content) {
                  assistantResponse += content
                  setStreamingResponse(assistantResponse)
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request aborted')
        return
      }
      
      console.error('Chat error:', error)
      setError(error.message || 'Failed to send message')
      setStreamingResponse('')
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [
    input, 
    isLoading, 
    user, 
    currentConversationId, 
    messages, 
    createConversation, 
    updateConversation, 
    loadMessages,
    onConversationCreate,
    onConversationUpdate
  ])

  const copyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
    } catch (error) {
      console.error('Failed to copy message:', error)
    }
  }

  const exportConversation = () => {
    if (messages.length === 0) return

    const exportData = {
      conversation_id: currentConversationId,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.created_at
      })),
      exported_at: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    })
    
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `conversation-${currentConversationId}-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsLoading(false)
      setStreamingResponse('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const renderMessage = (message: Message, index: number) => {
    const isUser = message.role === 'user'
    
    return (
      <div key={`${message.id}-${index}`} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`flex items-start space-x-3 max-w-3xl ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            isUser 
              ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white' 
              : 'bg-slate-700/80 text-gray-300'
          }`}>
            {isUser ? <User size={16} /> : <Bot size={16} />}
          </div>
          
          <div className={`p-4 rounded-lg ${
            isUser
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
              : 'bg-slate-800/80 backdrop-blur-sm border border-slate-600/50 text-gray-100'
          }`}>
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap mb-0">{message.content}</p>
            </div>
            
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-600/30">
              <span className="text-xs opacity-70">
                {new Date(message.created_at).toLocaleTimeString()}
              </span>
              
              <div className="flex space-x-1">
                <button
                  onClick={() => copyMessage(message.content)}
                  className={`p-1.5 rounded hover:bg-gray-600/50 transition-colors ${
                    isUser ? 'text-white/80 hover:text-white' : 'text-gray-400 hover:text-gray-200'
                  }`}
                  title="Copy message"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-900/90 backdrop-blur-sm">
      {/* Chat Header */}
      <div className="p-4 border-b border-slate-700/50 bg-slate-800/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Prompt Assistant</h2>
              <p className="text-sm text-gray-300">
                {currentConversationId ? 'Continuing conversation' : 'Start a new conversation'}
              </p>
            </div>
          </div>
          
          {messages.length > 0 && (
            <button
              onClick={exportConversation}
              className="p-2 text-gray-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
              title="Export conversation"
            >
              <Download size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !streamingResponse && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-500/30">
              <Sparkles className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Start Your Prompt Journey</h3>
            <p className="text-gray-300 max-w-md mx-auto">
              Describe what you want to create, and I'll help you craft the perfect prompt for any AI system.
            </p>
          </div>
        )}

        {messages.map((message, index) => renderMessage(message, index))}

        {/* Streaming Response */}
        {streamingResponse && (
          <div className="flex justify-start mb-4">
            <div className="flex items-start space-x-3 max-w-3xl">
              <div className="w-8 h-8 rounded-full bg-slate-700/80 text-gray-300 flex items-center justify-center flex-shrink-0">
                <Bot size={16} />
              </div>
              
              <div className="p-4 rounded-lg bg-slate-800/80 backdrop-blur-sm border border-slate-600/50">
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap mb-0 text-gray-100">{streamingResponse}</p>
                </div>
                
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-600/30">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-3 h-3 animate-spin text-purple-600" />
                    <span className="text-xs text-gray-400">Generating...</span>
                  </div>
                  
                  <button
                    onClick={stopGeneration}
                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    Stop
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mb-4 p-3 bg-red-900/20 border border-red-700/50 rounded-lg backdrop-blur-sm">
          <p className="text-sm text-red-300">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-xs text-red-400 hover:text-red-300 mt-1 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-slate-700/50 bg-slate-800/80 backdrop-blur-sm">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                currentConversationId 
                  ? "Continue the conversation..." 
                  : "Describe what you want to create..."
              }
              className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none backdrop-blur-sm"
              rows={input.split('\n').length}
              disabled={isLoading}
            />
          </div>
          
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        
        <div className="mt-2 text-xs text-gray-400 text-center">
          Press Enter to send • Shift+Enter for new line
        </div>
      </div>
    </div>
  )
}