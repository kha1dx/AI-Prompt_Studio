import { createBrowserClient } from '@supabase/ssr'

// Types for our database entities
export interface Conversation {
  id: string
  user_id: string
  title: string
  preview?: string
  created_at: string
  updated_at: string
  is_favorite: boolean
  status: 'active' | 'archived'
  message_count: number
  has_prompt: boolean
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: Record<string, any>
  created_at: string
  tokens_used?: number
}

export interface Prompt {
  id: string
  conversation_id: string
  user_id: string
  content: string
  title?: string
  is_final: boolean
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  usage_count: number
  rating?: number
  tags: string[]
}

export interface UserPreferences {
  id: string
  user_id: string
  theme: 'light' | 'dark' | 'system'
  language: string
  notification_settings: Record<string, any>
  prompt_generation_settings: Record<string, any>
  created_at: string
  updated_at: string
}

// Get Supabase client for client-side operations
const getSupabaseClient = () => createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Conversation operations
export const conversationService = {
  // Get all conversations for a user
  async getAll(userId: string, status: 'active' | 'archived' = 'active') {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('status', status)
      .order('updated_at', { ascending: false })

    if (error) throw error
    return data as Conversation[]
  },

  // Get a single conversation
  async getById(id: string, userId: string) {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error) throw error
    return data as Conversation
  },

  // Create a new conversation
  async create(userId: string, title: string = 'New Conversation') {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        title,
        preview: '',
        status: 'active'
      })
      .select()
      .single()

    if (error) throw error
    return data as Conversation
  },

  // Update conversation
  async update(id: string, userId: string, updates: Partial<Conversation>) {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('conversations')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data as Conversation
  },

  // Delete conversation
  async delete(id: string, userId: string) {
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
  },

  // Toggle favorite status
  async toggleFavorite(id: string, userId: string) {
    // First get current status
    const conversation = await this.getById(id, userId)
    
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('conversations')
      .update({ is_favorite: !conversation.is_favorite })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data as Conversation
  },

  // Search conversations
  async search(userId: string, query: string, filters: { 
    is_favorite?: boolean, 
    has_prompt?: boolean,
    status?: 'active' | 'archived'
  } = {}) {
    const supabase = getSupabaseClient()
    let queryBuilder = supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)

    // Add filters
    if (filters.is_favorite !== undefined) {
      queryBuilder = queryBuilder.eq('is_favorite', filters.is_favorite)
    }
    if (filters.has_prompt !== undefined) {
      queryBuilder = queryBuilder.eq('has_prompt', filters.has_prompt)
    }
    if (filters.status) {
      queryBuilder = queryBuilder.eq('status', filters.status)
    }

    // Add text search
    if (query) {
      queryBuilder = queryBuilder.or(`title.ilike.%${query}%,preview.ilike.%${query}%`)
    }

    const { data, error } = await queryBuilder
      .order('updated_at', { ascending: false })

    if (error) throw error
    return data as Conversation[]
  }
}

// Message operations
export const messageService = {
  // Get all messages for a conversation
  async getByConversation(conversationId: string) {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data as Message[]
  },

  // Add a message to conversation
  async create(conversationId: string, role: Message['role'], content: string, metadata: Record<string, any> = {}) {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role,
        content,
        metadata
      })
      .select()
      .single()

    if (error) throw error
    return data as Message
  },

  // Delete all messages in a conversation
  async deleteByConversation(conversationId: string) {
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId)

    if (error) throw error
  }
}

// Prompt operations
export const promptService = {
  // Get prompts by conversation
  async getByConversation(conversationId: string) {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Prompt[]
  },

  // Get all prompts for a user
  async getByUser(userId: string, finalOnly: boolean = false) {
    const supabase = getSupabaseClient()
    let query = supabase
      .from('prompts')
      .select('*')
      .eq('user_id', userId)

    if (finalOnly) {
      query = query.eq('is_final', true)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return data as Prompt[]
  },

  // Create a new prompt
  async create(conversationId: string, userId: string, content: string, isFinal: boolean = false, title?: string) {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('prompts')
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        content,
        title,
        is_final: isFinal
      })
      .select()
      .single()

    if (error) throw error
    return data as Prompt
  },

  // Update prompt
  async update(id: string, userId: string, updates: Partial<Prompt>) {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('prompts')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data as Prompt
  },

  // Delete prompt
  async delete(id: string, userId: string) {
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('prompts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
  },

  // Increment usage count
  async incrementUsage(id: string, userId: string) {
    // First get current usage count
    const supabase = getSupabaseClient()
    const { data: currentPrompt } = await supabase
      .from('prompts')
      .select('usage_count')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    const { data, error } = await supabase
      .from('prompts')
      .update({ 
        usage_count: (currentPrompt?.usage_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data as Prompt
  }
}

// User preferences operations
export const userPreferencesService = {
  // Get user preferences
  async get(userId: string) {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // Not found is ok
      throw error
    }
    
    return data as UserPreferences | null
  },

  // Create or update user preferences
  async upsert(userId: string, preferences: Partial<UserPreferences>) {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        ...preferences
      })
      .select()
      .single()

    if (error) throw error
    return data as UserPreferences
  }
}

// Usage tracking
export const usageTrackingService = {
  // Track user action
  async track(userId: string, action: string, resourceType: string, resourceId?: string, metadata: Record<string, any> = {}) {
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('usage_tracking')
      .insert({
        user_id: userId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        metadata
      })

    if (error) throw error
  },

  // Get usage stats
  async getStats(userId: string, days: number = 30) {
    const supabase = getSupabaseClient()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from('usage_tracking')
      .select('action, resource_type, created_at')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }
}