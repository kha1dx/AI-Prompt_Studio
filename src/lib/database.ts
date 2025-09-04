// Database utility functions and types for Prompt Studio
import { createClient } from '../utils/supabase/server'
import { createBrowserClient } from '../utils/supabase/client'
import type { Database } from '../types/database'

// Type definitions for our enhanced database
export type Conversation = Database['public']['Tables']['conversations']['Row']
export type ConversationInsert = Database['public']['Tables']['conversations']['Insert']
export type ConversationUpdate = Database['public']['Tables']['conversations']['Update']

export type ConversationMessage = Database['public']['Tables']['conversation_messages']['Row']
export type ConversationMessageInsert = Database['public']['Tables']['conversation_messages']['Insert']

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type UsageLimits = Database['public']['Tables']['usage_limits']['Row']
export type PromptTemplate = Database['public']['Tables']['prompt_templates']['Row']

// Enhanced message interface for real-time features
export interface Message {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: string
    metadata?: {
        tokens?: number
        processingTime?: number
        model?: string
    }
}

// Conversation filters and pagination
export interface ConversationFilters {
    status?: 'active' | 'archived' | 'deleted'
    search?: string
    tags?: string[]
    isFavorite?: boolean
    dateRange?: {
        start: string
        end: string
    }
}

export interface PaginationOptions {
    page?: number
    limit?: number
    sortBy?: 'created_at' | 'updated_at' | 'last_activity_at' | 'title'
    sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResult<T> {
    data: T[]
    count: number
    page: number
    totalPages: number
    hasMore: boolean
}

// Database service class for centralized database operations
export class DatabaseService {
    private supabase: ReturnType<typeof createClient>

    constructor(serverMode = true) {
        this.supabase = serverMode ? createClient() : createBrowserClient()
    }

    // =====================================================================================
    // CONVERSATION MANAGEMENT
    // =====================================================================================

    async getConversations(
        userId: string,
        filters: ConversationFilters = {},
        pagination: PaginationOptions = {}
    ): Promise<PaginatedResult<Conversation>> {
        const {
            page = 1,
            limit = 20,
            sortBy = 'last_activity_at',
            sortOrder = 'desc'
        } = pagination

        const offset = (page - 1) * limit

        let query = this.supabase
            .from('conversations')
            .select('*, conversation_messages(count)', { count: 'exact' })
            .eq('user_id', userId)
            .range(offset, offset + limit - 1)
            .order(sortBy, { ascending: sortOrder === 'asc' })

        // Apply filters
        if (filters.status) {
            query = query.eq('status', filters.status)
        }

        if (filters.search) {
            query = query.or(`title.ilike.%${filters.search}%,messages::text.ilike.%${filters.search}%`)
        }

        if (filters.isFavorite !== undefined) {
            query = query.eq('is_favorite', filters.isFavorite)
        }

        if (filters.tags && filters.tags.length > 0) {
            query = query.overlaps('tags', filters.tags)
        }

        if (filters.dateRange) {
            query = query
                .gte('created_at', filters.dateRange.start)
                .lte('created_at', filters.dateRange.end)
        }

        const { data, error, count } = await query

        if (error) throw error

        const totalPages = Math.ceil((count || 0) / limit)

        return {
            data: data || [],
            count: count || 0,
            page,
            totalPages,
            hasMore: page < totalPages
        }
    }

    async getConversation(id: string, userId: string): Promise<Conversation | null> {
        const { data, error } = await this.supabase
            .from('conversations')
            .select(`
                *,
                conversation_messages (
                    id,
                    role,
                    content,
                    message_index,
                    token_count,
                    processing_time_ms,
                    metadata,
                    created_at
                )
            `)
            .eq('id', id)
            .eq('user_id', userId)
            .single()

        if (error && error.code !== 'PGRST116') throw error
        return data
    }

    async createConversation(
        userId: string,
        title: string,
        initialMessage?: string
    ): Promise<Conversation> {
        const conversationData: ConversationInsert = {
            user_id: userId,
            title,
            status: 'active',
            messages: initialMessage ? [
                {
                    id: crypto.randomUUID(),
                    role: 'user',
                    content: initialMessage,
                    timestamp: new Date().toISOString()
                }
            ] : [],
            last_activity_at: new Date().toISOString()
        }

        const { data, error } = await this.supabase
            .from('conversations')
            .insert(conversationData)
            .select()
            .single()

        if (error) throw error
        return data
    }

    async updateConversation(
        id: string,
        userId: string,
        updates: ConversationUpdate
    ): Promise<Conversation> {
        const { data, error } = await this.supabase
            .from('conversations')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
                last_activity_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single()

        if (error) throw error
        return data
    }

    async deleteConversation(id: string, userId: string): Promise<void> {
        const { error } = await this.supabase
            .from('conversations')
            .update({ status: 'deleted' })
            .eq('id', id)
            .eq('user_id', userId)

        if (error) throw error
    }

    async duplicateConversation(id: string, userId: string): Promise<Conversation> {
        // Get original conversation
        const original = await this.getConversation(id, userId)
        if (!original) throw new Error('Conversation not found')

        // Create duplicate
        const duplicateData: ConversationInsert = {
            user_id: userId,
            title: `${original.title} (Copy)`,
            messages: original.messages,
            tags: original.tags,
            status: 'active'
        }

        const { data, error } = await this.supabase
            .from('conversations')
            .insert(duplicateData)
            .select()
            .single()

        if (error) throw error
        return data
    }

    // =====================================================================================
    // MESSAGE MANAGEMENT
    // =====================================================================================

    async addMessage(
        conversationId: string,
        message: Omit<ConversationMessageInsert, 'conversation_id' | 'message_index'>
    ): Promise<ConversationMessage> {
        // Get current message count for indexing
        const { count } = await this.supabase
            .from('conversation_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conversationId)

        const messageData: ConversationMessageInsert = {
            ...message,
            conversation_id: conversationId,
            message_index: (count || 0) + 1
        }

        const { data, error } = await this.supabase
            .from('conversation_messages')
            .insert(messageData)
            .select()
            .single()

        if (error) throw error
        return data
    }

    async getMessages(conversationId: string, userId: string): Promise<ConversationMessage[]> {
        // Verify user owns the conversation
        const conversation = await this.getConversation(conversationId, userId)
        if (!conversation) throw new Error('Conversation not found')

        const { data, error } = await this.supabase
            .from('conversation_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('message_index', { ascending: true })

        if (error) throw error
        return data || []
    }

    // =====================================================================================
    // USER PROFILE & USAGE MANAGEMENT
    // =====================================================================================

    async getProfile(userId: string): Promise<Profile | null> {
        const { data, error } = await this.supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()

        if (error && error.code !== 'PGRST116') throw error
        return data
    }

    async updateProfile(userId: string, updates: ProfileUpdate): Promise<Profile> {
        const { data, error } = await this.supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single()

        if (error) throw error
        return data
    }

    async getUsageLimits(userId: string): Promise<UsageLimits | null> {
        const { data, error } = await this.supabase
            .from('usage_limits')
            .select('*')
            .eq('user_id', userId)
            .single()

        if (error && error.code !== 'PGRST116') throw error
        return data
    }

    async updateUsage(
        userId: string,
        updates: {
            prompts?: number
            conversations?: number
            apiCalls?: number
        }
    ): Promise<UsageLimits> {
        const current = await this.getUsageLimits(userId)
        if (!current) throw new Error('Usage limits not found')

        const updateData = {
            monthly_prompts_used: current.monthly_prompts_used + (updates.prompts || 0),
            monthly_conversations_created: current.monthly_conversations_created + (updates.conversations || 0),
            monthly_api_calls: current.monthly_api_calls + (updates.apiCalls || 0)
        }

        const { data, error } = await this.supabase
            .from('usage_limits')
            .update(updateData)
            .eq('user_id', userId)
            .select()
            .single()

        if (error) throw error
        return data
    }

    async getUserStats(userId: string): Promise<any> {
        const { data, error } = await this.supabase
            .rpc('get_user_stats', { user_id: userId })

        if (error) throw error
        return data
    }

    // =====================================================================================
    // ANALYTICS & TRACKING
    // =====================================================================================

    async trackEvent(
        userId: string,
        eventType: string,
        eventData: Record<string, any> = {},
        sessionId?: string,
        ipAddress?: string,
        userAgent?: string
    ): Promise<void> {
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

        if (error) {
            console.error('Failed to track event:', error)
            // Don't throw error for analytics failures
        }
    }

    // =====================================================================================
    // TEMPLATE MANAGEMENT
    // =====================================================================================

    async getTemplates(
        userId?: string,
        category?: string,
        isPublic = true
    ): Promise<PromptTemplate[]> {
        let query = this.supabase
            .from('prompt_templates')
            .select('*')
            .order('rating_average', { ascending: false })

        if (isPublic) {
            query = query.eq('is_public', true)
        } else if (userId) {
            query = query.eq('user_id', userId)
        }

        if (category) {
            query = query.eq('category', category)
        }

        const { data, error } = await query

        if (error) throw error
        return data || []
    }

    async createTemplate(
        userId: string,
        template: Omit<PromptTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'usage_count' | 'rating_average' | 'rating_count'>
    ): Promise<PromptTemplate> {
        const { data, error } = await this.supabase
            .from('prompt_templates')
            .insert({
                ...template,
                user_id: userId
            })
            .select()
            .single()

        if (error) throw error
        return data
    }

    // =====================================================================================
    // SEARCH FUNCTIONALITY
    // =====================================================================================

    async searchConversations(
        userId: string,
        searchTerm: string,
        limit = 10
    ): Promise<Conversation[]> {
        const { data, error } = await this.supabase
            .from('conversations')
            .select('*')
            .eq('user_id', userId)
            .or(`title.ilike.%${searchTerm}%,messages::text.ilike.%${searchTerm}%`)
            .order('last_activity_at', { ascending: false })
            .limit(limit)

        if (error) throw error
        return data || []
    }

    async searchMessages(
        userId: string,
        searchTerm: string,
        conversationId?: string
    ): Promise<ConversationMessage[]> {
        let query = this.supabase
            .from('conversation_messages')
            .select(`
                *,
                conversations!inner (
                    id,
                    title,
                    user_id
                )
            `)
            .eq('conversations.user_id', userId)
            .ilike('content', `%${searchTerm}%`)
            .order('created_at', { ascending: false })

        if (conversationId) {
            query = query.eq('conversation_id', conversationId)
        }

        const { data, error } = await query

        if (error) throw error
        return data || []
    }
}

// Utility functions for common operations
export const getSubscriptionLimits = (tier: string) => {
    const limits = {
        free: { prompts: 5, conversations: 10, apiCalls: 50 },
        pro: { prompts: 100, conversations: 500, apiCalls: 2000 },
        enterprise: { prompts: -1, conversations: -1, apiCalls: -1 } // Unlimited
    }
    return limits[tier as keyof typeof limits] || limits.free
}

export const canUserPerformAction = (
    usage: UsageLimits,
    tier: string,
    action: 'prompt' | 'conversation' | 'api_call'
): boolean => {
    const limits = getSubscriptionLimits(tier)
    
    switch (action) {
        case 'prompt':
            return limits.prompts === -1 || usage.monthly_prompts_used < limits.prompts
        case 'conversation':
            return limits.conversations === -1 || usage.monthly_conversations_created < limits.conversations
        case 'api_call':
            return limits.apiCalls === -1 || usage.monthly_api_calls < limits.apiCalls
        default:
            return false
    }
}