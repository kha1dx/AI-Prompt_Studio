import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

// Types for our database entities (aligned with enhanced schema)
export interface Conversation {
  id: string
  user_id: string
  title: string
  messages?: any[] // JSONB array
  status: 'active' | 'archived' | 'deleted'
  generated_prompt?: string | null
  prompt_generated_at?: string | null
  created_at: string
  updated_at: string
  tags: string[]
  is_favorite: boolean
  message_count: number
  last_activity_at: string
  preview?: string // computed field
  has_prompt?: boolean // computed field
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  message_index: number
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

// Get Supabase client for client-side operations with error handling
const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }
  
  if (typeof window !== 'undefined') {
    // Client-side
    return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
  } else {
    // Server-side fallback
    return createClient<Database>(supabaseUrl, supabaseAnonKey)
  }
}

// Conversation operations
export const conversationService = {
  // Get all conversations for a user
  async getAll(userId: string, status: 'active' | 'archived' = 'active') {
    try {
      const supabase = getSupabaseClient()
      
      // Add timeout and better error handling
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .eq('status', status)
        .order('last_activity_at', { ascending: false })
        .abortSignal(controller.signal)

      clearTimeout(timeoutId)

      if (error) {
        // Handle authentication errors gracefully
        if (error.message?.includes('JWT') || error.code === 'PGRST301') {
          return []
        }
        throw error
      }
      
      // Add computed fields
      const conversations = (data || []).map((conv: any) => ({
        ...conv,
        preview: conv.messages?.[0]?.content?.substring(0, 100) + '...' || '',
        has_prompt: !!conv.generated_prompt
      }))
      
      return conversations as Conversation[]
    } catch (error: any) {
      // Enhanced error logging with proper serialization and circular reference handling
      const errorDetails = {
        message: error?.message || 'Unknown error',
        code: error?.code || 'UNKNOWN',
        status: error?.status || 500,
        details: error?.details || null,
        hint: error?.hint || null,
        name: error?.name || 'Error',
        // Safely handle potential circular references
        ...(process.env.NODE_ENV === 'development' && {
          stack: error?.stack,
          cause: error?.cause ? String(error.cause) : null
        })
      }
      
      // Use JSON.stringify with replacer to handle circular references
      console.error('Database error in getAll:', JSON.stringify(errorDetails, null, 2))
      
      // Handle specific error types
      const isAuthError = (
        error?.message?.includes('JWT') || 
        error?.code === 'PGRST301' || 
        error?.status === 401 ||
        error?.message?.includes('Auth session missing') ||
        error?.message?.includes('Invalid JWT') ||
        error?.name === 'AuthError'
      )
      
      const isNetworkError = (
        error?.name === 'AbortError' ||
        error?.message?.includes('fetch') ||
        error?.message?.includes('network') ||
        error?.code === 'ECONNREFUSED'
      )
      
      if (isAuthError) {
        console.warn('Authentication error in getAll - returning empty array')
        return []
      }
      
      if (isNetworkError) {
        console.error('Network error in getAll - check connection to Supabase')
        throw new Error('Network connection error - please check your internet connection')
      }
      
      // For other errors, still throw but with better context
      const enhancedError = new Error(`Database operation failed: ${error?.message || 'Unknown error'}`)
      enhancedError.cause = error
      throw enhancedError
    }
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
    
    // Add computed fields
    const conversation = data as any
    conversation.preview = conversation.messages?.[0]?.content?.substring(0, 100) + '...' || ''
    conversation.has_prompt = !!conversation.generated_prompt
    
    return conversation as Conversation
  },

  // Create a new conversation
  async create(userId: string, title: string = 'New Conversation') {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        title,
        messages: [],
        status: 'active',
        tags: [],
        is_favorite: false,
        message_count: 0
      })
      .select()
      .single()

    if (error) throw error
    
    // Add computed fields
    const conversation = data as any
    conversation.preview = ''
    conversation.has_prompt = !!conversation.generated_prompt
    
    return conversation as Conversation
  },

  // Update conversation
  async update(id: string, userId: string, updates: Partial<Conversation>) {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('conversations')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    
    // Add computed fields
    const conversation = data as any
    conversation.preview = conversation.messages?.[0]?.content?.substring(0, 100) + '...' || ''
    conversation.has_prompt = !!conversation.generated_prompt
    
    return conversation as Conversation
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
      .update({ 
        is_favorite: !conversation.is_favorite,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    
    // Add computed fields
    const updatedConv = data as any
    updatedConv.preview = updatedConv.messages?.[0]?.content?.substring(0, 100) + '...' || ''
    updatedConv.has_prompt = !!updatedConv.generated_prompt
    
    return updatedConv as Conversation
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
    if (filters.status) {
      queryBuilder = queryBuilder.eq('status', filters.status)
    }

    // Add text search
    if (query) {
      queryBuilder = queryBuilder.or(`title.ilike.%${query}%`)
    }

    const { data, error } = await queryBuilder
      .order('last_activity_at', { ascending: false })

    if (error) throw error
    
    // Add computed fields and filter by has_prompt if needed
    let conversations = (data || []).map((conv: any) => ({
      ...conv,
      preview: conv.messages?.[0]?.content?.substring(0, 100) + '...' || '',
      has_prompt: !!conv.generated_prompt
    }))
    
    // Client-side filter for has_prompt (since it's computed)
    if (filters.has_prompt !== undefined) {
      conversations = conversations.filter(conv => conv.has_prompt === filters.has_prompt)
    }
    
    return conversations as Conversation[]
  }
}

// Message operations
export const messageService = {
  // Get all messages for a conversation
  async getByConversation(conversationId: string) {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('message_index', { ascending: true })

    if (error) throw error
    return data as Message[]
  },

  // Add a message to conversation
  async create(conversationId: string, role: Message['role'], content: string, metadata: Record<string, any> = {}) {
    const supabase = getSupabaseClient()
    
    // Get current message count for this conversation
    const { data: msgData } = await supabase
      .from('conversation_messages')
      .select('message_index')
      .eq('conversation_id', conversationId)
      .order('message_index', { ascending: false })
      .limit(1)
      .single()
    
    const messageIndex = (msgData?.message_index ?? -1) + 1
    
    const { data, error } = await supabase
      .from('conversation_messages')
      .insert({
        conversation_id: conversationId,
        role,
        content,
        message_index: messageIndex,
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
      .from('conversation_messages')
      .delete()
      .eq('conversation_id', conversationId)

    if (error) throw error
  }
}

// Prompt operations (using conversations table for generated prompts)
export const promptService = {
  // Get prompts by conversation (from generated_prompt field)
  async getByConversation(conversationId: string) {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('conversations')
        .select('id, generated_prompt, prompt_generated_at, title, user_id')
        .eq('id', conversationId)
        .not('generated_prompt', 'is', null)
        .maybeSingle() // Use maybeSingle() instead of single() to handle no results

      // If there's a database error (not "no rows found"), throw it
      if (error) {
        console.error('Database error in getByConversation:', error)
        throw error
      }
      
      // Convert to Prompt format for compatibility
      if (data && data.generated_prompt) {
        return [{
          id: data.id,
          conversation_id: conversationId,
          user_id: data.user_id,
          content: data.generated_prompt,
          title: data.title,
          is_final: true,
          created_at: data.prompt_generated_at || new Date().toISOString(),
          updated_at: data.prompt_generated_at || new Date().toISOString(),
          usage_count: 0,
          tags: []
        } as Prompt]
      }
      
      // Return empty array if no prompts found (normal case)
      return []
    } catch (error: any) {
      console.error('Error in promptService.getByConversation:', error)
      // Return empty array instead of throwing - this is expected for conversations without prompts
      return []
    }
  },

  // Get all prompts for a user
  async getByUser(userId: string, finalOnly: boolean = false) {
    const supabase = getSupabaseClient()
    let query = supabase
      .from('conversations')
      .select('id, generated_prompt, prompt_generated_at, title, user_id')
      .eq('user_id', userId)
      .not('generated_prompt', 'is', null)

    const { data, error } = await query.order('prompt_generated_at', { ascending: false })

    if (error) throw error
    
    // Convert to Prompt format
    return (data || []).map(item => ({
      id: item.id,
      conversation_id: item.id,
      user_id: item.user_id,
      content: item.generated_prompt!,
      title: item.title,
      is_final: true,
      created_at: item.prompt_generated_at || new Date().toISOString(),
      updated_at: item.prompt_generated_at || new Date().toISOString(),
      usage_count: 0,
      tags: []
    })) as Prompt[]
  },

  // Create a new prompt (save as generated_prompt in conversations)
  async create(conversationId: string, userId: string, content: string, isFinal: boolean = false, title?: string) {
    const supabase = getSupabaseClient()
    
    // Update the conversation with the generated prompt
    const { data, error } = await supabase
      .from('conversations')
      .update({
        generated_prompt: content,
        prompt_generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    
    // Return in Prompt format for compatibility
    return {
      id: data.id,
      conversation_id: conversationId,
      user_id: userId,
      content,
      title: title || data.title,
      is_final: isFinal,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      usage_count: 0,
      tags: []
    } as Prompt
  },

  // Update prompt
  async update(id: string, userId: string, updates: Partial<Prompt>) {
    const supabase = getSupabaseClient()
    
    // Update the conversation's generated_prompt
    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    
    if (updates.content) {
      updateData.generated_prompt = updates.content
    }
    if (updates.title) {
      updateData.title = updates.title
    }
    
    const { data, error } = await supabase
      .from('conversations')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    
    return {
      id: data.id,
      conversation_id: id,
      user_id: userId,
      content: data.generated_prompt!,
      title: data.title,
      is_final: true,
      created_at: data.prompt_generated_at || new Date().toISOString(),
      updated_at: data.updated_at,
      usage_count: 0,
      tags: []
    } as Prompt
  },

  // Delete prompt
  async delete(id: string, userId: string) {
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('conversations')
      .update({
        generated_prompt: null,
        prompt_generated_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
  },

  // Increment usage count (not applicable with current schema)
  async incrementUsage(id: string, userId: string) {
    // No-op since we don't track usage count in conversations table
    return null
  }
}

// User preferences operations
export const userPreferencesService = {
  // Get user preferences
  async get(userId: string) {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // Not found is ok
      throw error
    }
    
    return data?.preferences as UserPreferences | null
  },

  // Create or update user preferences
  async upsert(userId: string, preferences: Partial<UserPreferences>) {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('profiles')
      .update({
        preferences: preferences,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return data.preferences as UserPreferences
  }
}

// Usage tracking
export const usageTrackingService = {
  // Track user action
  async track(userId: string, action: string, resourceType: string, resourceId?: string, metadata: Record<string, any> = {}) {
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('user_analytics')
      .insert({
        user_id: userId,
        event_type: action,
        event_data: {
          resource_type: resourceType,
          resource_id: resourceId,
          ...metadata
        }
      })

    if (error) {
      console.error('Usage tracking failed:', error)
    }
  },

  // Get usage stats
  async getStats(userId: string, days: number = 30) {
    const supabase = getSupabaseClient()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from('user_analytics')
      .select('event_type, event_data, created_at')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }
}

// Enhanced Database Service Class for API routes
export class DatabaseService {
  private supabase

  constructor() {
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  // Conversation operations
  async getConversations(userId: string, filters: any = {}, pagination: any = {}) {
    let query = this.supabase
      .from('conversations')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('status', filters.status || 'active')

    // Apply filters
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%`)
    }
    if (filters.isFavorite) {
      query = query.eq('is_favorite', true)
    }
    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags)
    }

    // Apply pagination and sorting
    const { page = 1, limit = 20, sortBy = 'last_activity_at', sortOrder = 'desc' } = pagination
    const from = (page - 1) * limit
    const to = from + limit - 1

    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to)

    const { data, error, count } = await query
    
    if (error) throw error

    return {
      data: data || [],
      count: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
      hasMore: (count || 0) > page * limit
    }
  }

  async createConversation(userId: string, title: string, initialMessage?: string) {
    const { data, error } = await this.supabase
      .from('conversations')
      .insert({
        user_id: userId,
        title,
        messages: initialMessage ? [{ role: 'user', content: initialMessage, timestamp: new Date() }] : [],
        status: 'active',
        tags: [],
        is_favorite: false,
        message_count: initialMessage ? 1 : 0
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateConversation(id: string, userId: string, updates: any) {
    const { data, error } = await this.supabase
      .from('conversations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Usage and analytics - using profiles table instead of non-existent usage_limits
  async getUsageLimits(userId: string) {
    try {
      const { data } = await this.supabase
        .from('profiles')
        .select('credits_used, credits_limit, subscription_tier')
        .eq('id', userId)
        .single()
      
      // Map to expected format for compatibility
      return data ? {
        user_id: userId,
        monthly_conversations_created: data.credits_used || 0,
        monthly_prompts_used: data.credits_used || 0,
        monthly_api_calls: data.credits_used || 0,
        last_reset_date: new Date().toISOString().split('T')[0]
      } : null
    } catch (error) {
      console.warn('getUsageLimits fallback:', error.message)
      return null
    }
  }

  async getProfile(userId: string) {
    const { data } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    return data
  }

  async updateUsage(userId: string, increments: { conversations?: number, prompts?: number, apiCalls?: number }) {
    try {
      // Update credits_used in profiles table instead of non-existent usage_limits
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('credits_used, credits_limit')
        .eq('id', userId)
        .single()

      if (profile) {
        const totalIncrement = (increments.conversations || 0) + (increments.prompts || 0) + (increments.apiCalls || 0)
        const newCreditsUsed = (profile.credits_used || 0) + totalIncrement
        
        await this.supabase
          .from('profiles')
          .update({
            credits_used: newCreditsUsed,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
      }
    } catch (error) {
      console.warn('updateUsage fallback:', error.message)
      // Silently fail - don't block API operations
    }
  }

  async trackEvent(userId: string, eventType: string, eventData: any, sessionId?: string, ipAddress?: string, userAgent?: string) {
    try {
      // Try to use user_analytics table if it exists, otherwise silently skip
      const { error } = await this.supabase
        .from('user_analytics')
        .insert({
          user_id: userId,
          event_type: eventType,
          event_data: eventData,
          session_id: sessionId,
          ip_address: ipAddress,
          user_agent: userAgent
        })

      if (error && !error.message?.includes('does not exist')) {
        console.warn('Analytics tracking failed:', error.message)
      }
    } catch (error) {
      // Silently fail analytics - don't block API operations
      console.warn('trackEvent fallback:', error.message)
    }
  }
}