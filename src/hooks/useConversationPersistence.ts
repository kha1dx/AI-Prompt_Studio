'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'

export interface ConversationData {
  id: string
  title: string
  messages: Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
  }>
  generatedPrompt?: string
  lastUpdated: Date
  isStarred: boolean
  tags: string[]
  status: 'active' | 'archived' | 'completed'
}

export function useConversationPersistence() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<ConversationData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load conversations from localStorage/IndexedDB for now
  // In production, this would connect to your Supabase backend
  const loadConversations = useCallback(async () => {
    if (!user) return

    try {
      setIsLoading(true)
      setError(null)

      // For now, use localStorage as a simple persistence layer
      const stored = localStorage.getItem(`conversations_${user.id}`)
      if (stored) {
        const parsed = JSON.parse(stored)
        const conversations = parsed.map((conv: any) => ({
          ...conv,
          lastUpdated: new Date(conv.lastUpdated),
          messages: conv.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }))
        setConversations(conversations)
      }
    } catch (err) {
      setError('Failed to load conversations')
      console.error('Error loading conversations:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Save conversation
  const saveConversation = useCallback(async (conversation: ConversationData) => {
    if (!user) return

    try {
      setConversations(prev => {
        const existing = prev.find(c => c.id === conversation.id)
        const updated = existing 
          ? prev.map(c => c.id === conversation.id ? { ...conversation, lastUpdated: new Date() } : c)
          : [...prev, { ...conversation, lastUpdated: new Date() }]
        
        // Persist to localStorage
        localStorage.setItem(`conversations_${user.id}`, JSON.stringify(updated))
        
        return updated
      })
    } catch (err) {
      setError('Failed to save conversation')
      console.error('Error saving conversation:', err)
    }
  }, [user])

  // Create new conversation
  const createConversation = useCallback(async (title: string): Promise<string> => {
    const id = crypto.randomUUID()
    const newConversation: ConversationData = {
      id,
      title,
      messages: [],
      lastUpdated: new Date(),
      isStarred: false,
      tags: [],
      status: 'active'
    }

    await saveConversation(newConversation)
    return id
  }, [saveConversation])

  // Update conversation
  const updateConversation = useCallback(async (
    id: string, 
    updates: Partial<ConversationData>
  ) => {
    const conversation = conversations.find(c => c.id === id)
    if (!conversation) return

    await saveConversation({
      ...conversation,
      ...updates,
      lastUpdated: new Date()
    })
  }, [conversations, saveConversation])

  // Add message to conversation
  const addMessage = useCallback(async (
    conversationId: string,
    message: {
      role: 'user' | 'assistant'
      content: string
    }
  ) => {
    const conversation = conversations.find(c => c.id === conversationId)
    if (!conversation) return

    const newMessage = {
      id: crypto.randomUUID(),
      ...message,
      timestamp: new Date()
    }

    await saveConversation({
      ...conversation,
      messages: [...conversation.messages, newMessage],
      lastUpdated: new Date()
    })
  }, [conversations, saveConversation])

  // Delete conversation
  const deleteConversation = useCallback(async (id: string) => {
    if (!user) return

    try {
      setConversations(prev => {
        const updated = prev.filter(c => c.id !== id)
        localStorage.setItem(`conversations_${user.id}`, JSON.stringify(updated))
        return updated
      })
    } catch (err) {
      setError('Failed to delete conversation')
      console.error('Error deleting conversation:', err)
    }
  }, [user])

  // Toggle star status
  const toggleStar = useCallback(async (id: string) => {
    const conversation = conversations.find(c => c.id === id)
    if (!conversation) return

    await updateConversation(id, {
      isStarred: !conversation.isStarred
    })
  }, [conversations, updateConversation])

  // Get conversation by ID
  const getConversation = useCallback((id: string) => {
    return conversations.find(c => c.id === id)
  }, [conversations])

  // Search conversations
  const searchConversations = useCallback((query: string) => {
    if (!query.trim()) return conversations

    const lowerQuery = query.toLowerCase()
    return conversations.filter(conv => 
      conv.title.toLowerCase().includes(lowerQuery) ||
      conv.messages.some(msg => msg.content.toLowerCase().includes(lowerQuery)) ||
      conv.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    )
  }, [conversations])

  // Get conversations by status
  const getConversationsByStatus = useCallback((status: ConversationData['status']) => {
    return conversations.filter(c => c.status === status)
  }, [conversations])

  // Get starred conversations
  const getStarredConversations = useCallback(() => {
    return conversations.filter(c => c.isStarred)
  }, [conversations])

  // Auto-save functionality
  useEffect(() => {
    if (user && conversations.length > 0) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem(`conversations_${user.id}`, JSON.stringify(conversations))
      }, 1000) // Auto-save every second

      return () => clearTimeout(timeoutId)
    }
  }, [user, conversations])

  // Load conversations on mount
  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  return {
    conversations,
    isLoading,
    error,
    createConversation,
    saveConversation,
    updateConversation,
    deleteConversation,
    addMessage,
    toggleStar,
    getConversation,
    searchConversations,
    getConversationsByStatus,
    getStarredConversations,
    loadConversations
  }
}