'use client'

import { useState, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: {
    extractedInfo?: string[]
    missingInfo?: string[]
    confidence?: number
  }
}

interface UseChatOptions {
  sessionId?: string
  onError?: (error: string) => void
  onPromptGenerated?: (prompt: string) => void
}

export function useChat({
  sessionId: initialSessionId,
  onError,
  onPromptGenerated
}: UseChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  const [sessionId, setSessionId] = useState(initialSessionId || uuidv4())
  const [error, setError] = useState<string | null>(null)
  const [usageStatus, setUsageStatus] = useState<{ used: number; limit: number } | null>(null)
  
  const abortControllerRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(async (
    content: string, 
    options: { generateFinalPrompt?: boolean } = {}
  ) => {
    if (!content.trim() || isStreaming) return

    setError(null)
    
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setIsStreaming(true)
    setStreamingMessage('')

    // Create abort controller for this request
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          sessionId,
          generateFinalPrompt: options.generateFinalPrompt
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.error || 'Failed to get response'
        
        if (response.status === 429) {
          setUsageStatus({ used: errorData.currentUsage, limit: errorData.limit })
        }
        
        setError(errorMessage)
        onError?.(errorMessage)
        setIsStreaming(false)
        return
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response stream')

      let assistantMessage = ''
      const assistantMessageId = uuidv4()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              // Stream complete
              const finalMessage: Message = {
                id: assistantMessageId,
                role: 'assistant',
                content: assistantMessage,
                timestamp: new Date()
              }
              
              setMessages(prev => [...prev, finalMessage])
              setStreamingMessage('')
              
              if (options.generateFinalPrompt && assistantMessage) {
                onPromptGenerated?.(assistantMessage)
              }
              
              setIsStreaming(false)
              return
            }

            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                assistantMessage += parsed.content
                setStreamingMessage(assistantMessage)
              }
            } catch (e) {
              // Ignore parsing errors for malformed chunks
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        const errorMessage = 'Failed to get response. Please try again.'
        console.error('Chat error:', error)
        setError(errorMessage)
        onError?.(errorMessage)
      }
      setIsStreaming(false)
      setStreamingMessage('')
    }
  }, [messages, sessionId, isStreaming, onError, onPromptGenerated])

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setIsStreaming(false)
    setStreamingMessage('')
  }, [])

  const resetConversation = useCallback(() => {
    setMessages([])
    setStreamingMessage('')
    setError(null)
    setSessionId(uuidv4())
    setUsageStatus(null)
  }, [])

  const loadSession = useCallback(async (loadSessionId: string) => {
    try {
      const response = await fetch(`/api/ai/conversation?sessionId=${loadSessionId}`)
      
      if (!response.ok) {
        throw new Error('Failed to load session')
      }
      
      const data = await response.json()
      setMessages(data.conversationHistory || [])
      setSessionId(loadSessionId)
      setError(null)
      
      return data.session
    } catch (error) {
      console.error('Error loading session:', error)
      setError('Failed to load conversation')
      return null
    }
  }, [])

  return {
    messages,
    isStreaming,
    streamingMessage,
    sessionId,
    error,
    usageStatus,
    sendMessage,
    stopGeneration,
    resetConversation,
    loadSession,
    setMessages
  }
}