'use client'

import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react'
import type { Message, ChatState, ChatContextType, ChatExportData } from '../types/chat'
import { chatDebug } from '../utils/debug'

const initialState: ChatState = {
  messages: [],
  isLoading: false,
  error: null,
}

type ChatAction =
  | { type: 'START_LOADING' }
  | { type: 'STOP_LOADING' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_MESSAGE'; payload: { id: string; content: string } }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'MARK_MESSAGE_COMPLETE'; payload: string }

const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case 'START_LOADING':
      return { ...state, isLoading: true, error: null }
    case 'STOP_LOADING':
      return { ...state, isLoading: false }
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false }
    case 'CLEAR_ERROR':
      return { ...state, error: null }
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] }
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id === action.payload.id
            ? { ...msg, content: action.payload.content }
            : msg
        ),
      }
    case 'MARK_MESSAGE_COMPLETE':
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id === action.payload
            ? { ...msg, isStreaming: false }
            : msg
        ),
      }
    case 'CLEAR_MESSAGES':
      return { ...state, messages: [] }
    default:
      return state
  }
}

const ChatContext = createContext<ChatContextType | null>(null)

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState)

  const sendMessage = useCallback(async (content: string) => {
    // Prevent sending messages if there are existing loading states or errors
    if (state.isLoading) {
      console.warn('Message send blocked: already loading')
      return
    }
    const userMessageId = crypto.randomUUID()
    const assistantMessageId = crypto.randomUUID()

    // Add user message
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: userMessageId,
        role: 'user',
        content,
        timestamp: new Date(),
      },
    })

    // Add empty assistant message for streaming
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      },
    })

    dispatch({ type: 'START_LOADING' })
    chatDebug.log('Sending message to API', { contentLength: content.length })

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...state.messages.map(({ id, isStreaming, ...msg }) => msg),
            { role: 'user', content, timestamp: new Date() },
          ],
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`
        
        chatDebug.api('/api/chat', 'POST', response.status, errorData)
        
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.')
        } else if (response.status === 429) {
          throw new Error(errorMessage)
        } else {
          throw new Error(errorMessage)
        }
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response stream')
      }

      let accumulatedContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              dispatch({ type: 'MARK_MESSAGE_COMPLETE', payload: assistantMessageId })
              dispatch({ type: 'STOP_LOADING' })
              return
            }

            try {
              const parsed = JSON.parse(data)
              // Handle OpenAI streaming format: choices[0].delta.content
              const content = parsed.content || parsed.choices?.[0]?.delta?.content
              if (content) {
                accumulatedContent += content
                dispatch({
                  type: 'UPDATE_MESSAGE',
                  payload: { id: assistantMessageId, content: accumulatedContent },
                })
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      chatDebug.error('Message send failed', error)
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to send message',
      })
      // Remove the failed assistant message
      dispatch({
        type: 'UPDATE_MESSAGE',
        payload: { id: assistantMessageId, content: 'Sorry, something went wrong. Please try again.' },
      })
      dispatch({ type: 'MARK_MESSAGE_COMPLETE', payload: assistantMessageId })
    } finally {
      dispatch({ type: 'STOP_LOADING' })
    }
  }, [state.messages])

  const clearChat = useCallback(() => {
    dispatch({ type: 'CLEAR_MESSAGES' })
    dispatch({ type: 'CLEAR_ERROR' })
  }, [])

  const exportChat = useCallback(() => {
    const exportData: ChatExportData = {
      messages: state.messages,
      exportDate: new Date().toISOString(),
      totalMessages: state.messages.length,
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-export-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [state.messages])

  const generateFinalPrompt = useCallback(async () => {
    if (state.isLoading || state.messages.length < 4) {
      return
    }

    const promptRequestId = crypto.randomUUID()
    
    // Add a system message requesting final prompt generation
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: promptRequestId,
        role: 'assistant',
        content: 'Perfect! Let me create your optimized prompt based on our conversation...',
        timestamp: new Date(),
        isStreaming: true,
      },
    })

    dispatch({ type: 'START_LOADING' })

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...state.messages.map(({ id, isStreaming, ...msg }) => msg),
            { 
              role: 'user', 
              content: 'Based on our conversation, please create my final optimized prompt. Include all the details we discussed and format it clearly in a code block for easy copying.',
              timestamp: new Date() 
            },
          ],
          generateFinalPrompt: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response stream')
      }

      let accumulatedContent = 'Perfect! Let me create your optimized prompt based on our conversation...\n\n'

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              dispatch({ type: 'MARK_MESSAGE_COMPLETE', payload: promptRequestId })
              dispatch({ type: 'STOP_LOADING' })
              return
            }

            try {
              const parsed = JSON.parse(data)
              const content = parsed.content || parsed.choices?.[0]?.delta?.content
              if (content) {
                accumulatedContent += content
                dispatch({
                  type: 'UPDATE_MESSAGE',
                  payload: { id: promptRequestId, content: accumulatedContent },
                })
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Final prompt generation failed:', error)
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to generate final prompt',
      })
      dispatch({
        type: 'UPDATE_MESSAGE',
        payload: { id: promptRequestId, content: 'Sorry, I encountered an error generating your final prompt. Please try again.' },
      })
      dispatch({ type: 'MARK_MESSAGE_COMPLETE', payload: promptRequestId })
    } finally {
      dispatch({ type: 'STOP_LOADING' })
    }
  }, [state.messages, state.isLoading])

  const copyMessage = useCallback(async (messageId: string) => {
    const message = state.messages.find((msg) => msg.id === messageId)
    if (message) {
      try {
        await navigator.clipboard.writeText(message.content)
      } catch (error) {
        console.error('Failed to copy message:', error)
      }
    }
  }, [state.messages])

  // Determine if we can generate a prompt (need at least 4 messages: 2 user, 2 assistant)
  const canGeneratePrompt = useMemo(() => {
    const userMessages = state.messages.filter(msg => msg.role === 'user')
    const assistantMessages = state.messages.filter(msg => msg.role === 'assistant')
    return userMessages.length >= 2 && assistantMessages.length >= 2 && !state.isLoading
  }, [state.messages, state.isLoading])

  const value: ChatContextType = {
    messages: state.messages,
    isLoading: state.isLoading,
    error: state.error,
    sendMessage,
    generateFinalPrompt,
    clearChat,
    exportChat,
    copyMessage,
    canGeneratePrompt,
  }

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  )
}

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}