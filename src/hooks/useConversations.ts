import { useState, useEffect, useCallback } from 'react'
import { conversationService, messageService, type Conversation } from '../lib/database'
import { useAuth } from '../contexts/AuthContext'
import { usageTrackingService } from '../lib/database'

export function useConversations() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!user?.id) {
      setConversations([])
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const data = await conversationService.getAll(user.id)
      setConversations(data)
    } catch (err) {
      console.error('Error loading conversations:', err)
      setError('Failed to load conversations')
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  // Create new conversation
  const createConversation = useCallback(async (title?: string) => {
    if (!user?.id) return null

    try {
      setError(null)
      const newConversation = await conversationService.create(user.id, title)
      
      // Track usage
      await usageTrackingService.track(
        user.id, 
        'create', 
        'conversation', 
        newConversation.id
      )
      
      setConversations(prev => [newConversation, ...prev])
      return newConversation
    } catch (err) {
      console.error('Error creating conversation:', err)
      setError('Failed to create conversation')
      return null
    }
  }, [user?.id])

  // Update conversation
  const updateConversation = useCallback(async (id: string, updates: Partial<Conversation>) => {
    if (!user?.id) return null

    try {
      setError(null)
      const updated = await conversationService.update(id, user.id, updates)
      
      // Track usage
      await usageTrackingService.track(
        user.id, 
        'update', 
        'conversation', 
        id, 
        { updates }
      )
      
      setConversations(prev => 
        prev.map(conv => conv.id === id ? updated : conv)
      )
      return updated
    } catch (err) {
      console.error('Error updating conversation:', err)
      setError('Failed to update conversation')
      return null
    }
  }, [user?.id])

  // Delete conversation
  const deleteConversation = useCallback(async (id: string) => {
    if (!user?.id) return false

    try {
      setError(null)
      await conversationService.delete(id, user.id)
      
      // Track usage
      await usageTrackingService.track(
        user.id, 
        'delete', 
        'conversation', 
        id
      )
      
      setConversations(prev => prev.filter(conv => conv.id !== id))
      return true
    } catch (err) {
      console.error('Error deleting conversation:', err)
      setError('Failed to delete conversation')
      return false
    }
  }, [user?.id])

  // Toggle favorite status
  const toggleFavorite = useCallback(async (id: string) => {
    if (!user?.id) return null

    try {
      setError(null)
      const updated = await conversationService.toggleFavorite(id, user.id)
      
      // Track usage
      await usageTrackingService.track(
        user.id, 
        updated.is_favorite ? 'favorite' : 'unfavorite', 
        'conversation', 
        id
      )
      
      setConversations(prev => 
        prev.map(conv => conv.id === id ? updated : conv)
      )
      return updated
    } catch (err) {
      console.error('Error toggling favorite:', err)
      setError('Failed to toggle favorite')
      return null
    }
  }, [user?.id])

  // Search conversations
  const searchConversations = useCallback(async (
    query: string, 
    filters: { 
      is_favorite?: boolean, 
      has_prompt?: boolean,
      status?: 'active' | 'archived'
    } = {}
  ) => {
    if (!user?.id) return []

    try {
      setError(null)
      const results = await conversationService.search(user.id, query, filters)
      
      // Track search if query is provided
      if (query) {
        await usageTrackingService.track(
          user.id, 
          'search', 
          'conversation', 
          undefined, 
          { query, filters }
        )
      }
      
      return results
    } catch (err) {
      console.error('Error searching conversations:', err)
      setError('Failed to search conversations')
      return []
    }
  }, [user?.id])

  // Clear conversation messages
  const clearConversation = useCallback(async (id: string) => {
    if (!user?.id) return false

    try {
      setError(null)
      await messageService.deleteByConversation(id)
      
      // Update conversation to reset stats
      await updateConversation(id, { 
        message_count: 0, 
        has_prompt: false,
        preview: ''
      })
      
      // Track usage
      await usageTrackingService.track(
        user.id, 
        'clear', 
        'conversation', 
        id
      )
      
      return true
    } catch (err) {
      console.error('Error clearing conversation:', err)
      setError('Failed to clear conversation')
      return false
    }
  }, [user?.id, updateConversation])

  // Get conversation by ID
  const getConversation = useCallback((id: string) => {
    return conversations.find(conv => conv.id === id) || null
  }, [conversations])

  // Load conversations on mount and when user changes
  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  return {
    conversations,
    isLoading,
    error,
    createConversation,
    updateConversation,
    deleteConversation,
    toggleFavorite,
    searchConversations,
    clearConversation,
    getConversation,
    refresh: loadConversations
  }
}