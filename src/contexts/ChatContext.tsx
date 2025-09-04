'use client'

import React, { createContext, useContext, useReducer, useCallback } from 'react'
import type { Message, ChatState, ChatContextType, ChatExportData } from '../types/chat'

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
        throw new Error('Failed to send message')
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
              if (parsed.content) {
                accumulatedContent += parsed.content
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

  const value: ChatContextType = {
    messages: state.messages,
    isLoading: state.isLoading,
    error: state.error,
    sendMessage,
    clearChat,
    exportChat,
    copyMessage,
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