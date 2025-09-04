import { useState, useEffect, useCallback } from 'react'
import { messageService, promptService, type Message, type Prompt } from '../lib/database'
import { useAuth } from '../contexts/AuthContext'
import { usageTrackingService } from '../lib/database'

export function useMessages(conversationId?: string) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load messages for conversation
  const loadMessages = useCallback(async (convId?: string) => {
    const targetId = convId || conversationId
    if (!targetId) return

    try {
      setIsLoading(true)
      setError(null)
      const data = await messageService.getByConversation(targetId)
      setMessages(data)
    } catch (err) {
      console.error('Error loading messages:', err)
      setError('Failed to load messages')
    } finally {
      setIsLoading(false)
    }
  }, [conversationId])

  // Load prompts for conversation
  const loadPrompts = useCallback(async (convId?: string) => {
    const targetId = convId || conversationId
    if (!targetId) return []

    try {
      const data = await promptService.getByConversation(targetId)
      setPrompts(data)
      return data
    } catch (err) {
      console.error('Error loading prompts:', err)
      return []
    }
  }, [conversationId])

  // Add a message
  const addMessage = useCallback(async (
    role: Message['role'], 
    content: string, 
    metadata: Record<string, any> = {},
    convId?: string
  ) => {
    const targetId = convId || conversationId
    if (!targetId || !user?.id) return null

    try {
      setError(null)
      const newMessage = await messageService.create(targetId, role, content, metadata)
      
      // Track usage
      await usageTrackingService.track(
        user.id,
        'create',
        'message',
        newMessage.id,
        { role, conversation_id: targetId }
      )
      
      setMessages(prev => [...prev, newMessage])
      return newMessage
    } catch (err) {
      console.error('Error adding message:', err)
      setError('Failed to send message')
      return null
    }
  }, [conversationId, user?.id])

  // Clear messages for conversation
  const clearMessages = useCallback(async (convId?: string) => {
    const targetId = convId || conversationId
    if (!targetId || !user?.id) return false

    try {
      setError(null)
      await messageService.deleteByConversation(targetId)
      
      // Track usage
      await usageTrackingService.track(
        user.id,
        'clear',
        'messages',
        undefined,
        { conversation_id: targetId }
      )
      
      setMessages([])
      return true
    } catch (err) {
      console.error('Error clearing messages:', err)
      setError('Failed to clear messages')
      return false
    }
  }, [conversationId, user?.id])

  // Create a prompt
  const createPrompt = useCallback(async (
    content: string,
    isFinal: boolean = false,
    title?: string,
    convId?: string
  ) => {
    const targetId = convId || conversationId
    if (!targetId || !user?.id) return null

    try {
      setError(null)
      const newPrompt = await promptService.create(targetId, user.id, content, isFinal, title)
      
      // Track usage
      await usageTrackingService.track(
        user.id,
        'create',
        'prompt',
        newPrompt.id,
        { is_final: isFinal, conversation_id: targetId }
      )
      
      setPrompts(prev => [newPrompt, ...prev])
      return newPrompt
    } catch (err) {
      console.error('Error creating prompt:', err)
      setError('Failed to create prompt')
      return null
    }
  }, [conversationId, user?.id])

  // Update a prompt
  const updatePrompt = useCallback(async (id: string, updates: Partial<Prompt>) => {
    if (!user?.id) return null

    try {
      setError(null)
      const updated = await promptService.update(id, user.id, updates)
      
      // Track usage
      await usageTrackingService.track(
        user.id,
        'update',
        'prompt',
        id,
        { updates }
      )
      
      setPrompts(prev => prev.map(p => p.id === id ? updated : p))
      return updated
    } catch (err) {
      console.error('Error updating prompt:', err)
      setError('Failed to update prompt')
      return null
    }
  }, [user?.id])

  // Delete a prompt
  const deletePrompt = useCallback(async (id: string) => {
    if (!user?.id) return false

    try {
      setError(null)
      await promptService.delete(id, user.id)
      
      // Track usage
      await usageTrackingService.track(
        user.id,
        'delete',
        'prompt',
        id
      )
      
      setPrompts(prev => prev.filter(p => p.id !== id))
      return true
    } catch (err) {
      console.error('Error deleting prompt:', err)
      setError('Failed to delete prompt')
      return false
    }
  }, [user?.id])

  // Get final prompt for conversation
  const getFinalPrompt = useCallback(() => {
    return prompts.find(p => p.is_final) || null
  }, [prompts])

  // Export messages as text
  const exportMessages = useCallback((format: 'txt' | 'json' = 'txt') => {
    if (messages.length === 0) return null

    if (format === 'json') {
      return JSON.stringify({
        conversation_id: conversationId,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.created_at
        })),
        exported_at: new Date().toISOString()
      }, null, 2)
    }

    // Text format
    let text = `Conversation Export - ${new Date().toLocaleDateString()}\n`
    text += '=' + '='.repeat(50) + '\n\n'
    
    messages.forEach((message, index) => {
      const timestamp = new Date(message.created_at).toLocaleString()
      const roleLabel = message.role === 'user' ? 'You' : 
                       message.role === 'assistant' ? 'Assistant' : 'System'
      
      text += `[${timestamp}] ${roleLabel}:\n${message.content}\n\n`
    })

    return text
  }, [messages, conversationId])

  // Load messages when conversation changes
  useEffect(() => {
    if (conversationId) {
      loadMessages()
      loadPrompts()
    } else {
      setMessages([])
      setPrompts([])
    }
  }, [conversationId, loadMessages, loadPrompts])

  return {
    messages,
    prompts,
    isLoading,
    error,
    addMessage,
    clearMessages,
    createPrompt,
    updatePrompt,
    deletePrompt,
    getFinalPrompt,
    exportMessages,
    loadMessages,
    loadPrompts,
    refresh: () => {
      loadMessages()
      loadPrompts()
    }
  }
}