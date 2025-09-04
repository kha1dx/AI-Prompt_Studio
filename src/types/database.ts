// Database type definitions for Prompt Studio
export interface Database {
  public: {
    Tables: {
      conversations: {
        Row: {
          id: string
          user_id: string
          title: string
          messages: any[] // JSONB array of messages
          status: 'active' | 'archived' | 'deleted'
          generated_prompt: string | null
          prompt_generated_at: string | null
          created_at: string
          updated_at: string
          tags: string[]
          is_favorite: boolean
          message_count: number
          last_activity_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          messages?: any[]
          status?: 'active' | 'archived' | 'deleted'
          generated_prompt?: string | null
          prompt_generated_at?: string | null
          created_at?: string
          updated_at?: string
          tags?: string[]
          is_favorite?: boolean
          message_count?: number
          last_activity_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          messages?: any[]
          status?: 'active' | 'archived' | 'deleted'
          generated_prompt?: string | null
          prompt_generated_at?: string | null
          created_at?: string
          updated_at?: string
          tags?: string[]
          is_favorite?: boolean
          message_count?: number
          last_activity_at?: string
        }
      }
      conversation_messages: {
        Row: {
          id: string
          conversation_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          message_index: number
          token_count: number | null
          processing_time_ms: number | null
          metadata: any | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          message_index: number
          token_count?: number | null
          processing_time_ms?: number | null
          metadata?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          role?: 'user' | 'assistant' | 'system'
          content?: string
          message_index?: number
          token_count?: number | null
          processing_time_ms?: number | null
          metadata?: any | null
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          stripe_customer_id: string | null
          subscription_tier: 'free' | 'pro' | 'enterprise'
          subscription_status: 'active' | 'cancelled' | 'past_due' | 'incomplete'
          subscription_period_start: string | null
          subscription_period_end: string | null
          preferences: any
          onboarding_completed: boolean
          last_login_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          stripe_customer_id?: string | null
          subscription_tier?: 'free' | 'pro' | 'enterprise'
          subscription_status?: 'active' | 'cancelled' | 'past_due' | 'incomplete'
          subscription_period_start?: string | null
          subscription_period_end?: string | null
          preferences?: any
          onboarding_completed?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          stripe_customer_id?: string | null
          subscription_tier?: 'free' | 'pro' | 'enterprise'
          subscription_status?: 'active' | 'cancelled' | 'past_due' | 'incomplete'
          subscription_period_start?: string | null
          subscription_period_end?: string | null
          preferences?: any
          onboarding_completed?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      usage_limits: {
        Row: {
          id: string
          user_id: string
          monthly_prompts_used: number
          monthly_conversations_created: number
          monthly_api_calls: number
          last_reset_date: string
          tier_limits: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          monthly_prompts_used?: number
          monthly_conversations_created?: number
          monthly_api_calls?: number
          last_reset_date?: string
          tier_limits?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          monthly_prompts_used?: number
          monthly_conversations_created?: number
          monthly_api_calls?: number
          last_reset_date?: string
          tier_limits?: any
          created_at?: string
          updated_at?: string
        }
      }
      user_analytics: {
        Row: {
          id: string
          user_id: string
          event_type: string
          event_data: any
          session_id: string | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_type: string
          event_data?: any
          session_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_type?: string
          event_data?: any
          session_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      prompt_templates: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          template_content: string
          category: string
          tags: string[]
          is_public: boolean
          is_featured: boolean
          usage_count: number
          rating_average: number
          rating_count: number
          version: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          template_content: string
          category?: string
          tags?: string[]
          is_public?: boolean
          is_featured?: boolean
          usage_count?: number
          rating_average?: number
          rating_count?: number
          version?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          template_content?: string
          category?: string
          tags?: string[]
          is_public?: boolean
          is_featured?: boolean
          usage_count?: number
          rating_average?: number
          rating_count?: number
          version?: number
          created_at?: string
          updated_at?: string
        }
      }
      template_ratings: {
        Row: {
          id: string
          template_id: string
          user_id: string
          rating: number
          review: string | null
          created_at: string
        }
        Insert: {
          id?: string
          template_id: string
          user_id: string
          rating: number
          review?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          template_id?: string
          user_id?: string
          rating?: number
          review?: string | null
          created_at?: string
        }
      }
      websocket_sessions: {
        Row: {
          id: string
          user_id: string
          session_token: string
          conversation_id: string | null
          connection_status: 'active' | 'inactive' | 'disconnected'
          last_ping_at: string
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_token: string
          conversation_id?: string | null
          connection_status?: 'active' | 'inactive' | 'disconnected'
          last_ping_at?: string
          created_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_token?: string
          conversation_id?: string | null
          connection_status?: 'active' | 'inactive' | 'disconnected'
          last_ping_at?: string
          created_at?: string
          expires_at?: string
        }
      }
    }
    Views: {
      conversation_summaries: {
        Row: {
          id: string
          user_id: string
          title: string
          status: 'active' | 'archived' | 'deleted'
          is_favorite: boolean
          tags: string[]
          created_at: string
          updated_at: string
          last_activity_at: string
          message_count: number
          has_generated_prompt: boolean
          message_roles: string[]
        }
      }
      user_stats: {
        Row: {
          user_id: string
          subscription_tier: 'free' | 'pro' | 'enterprise'
          monthly_prompts_used: number
          monthly_conversations_created: number
          total_conversations: number
          active_conversations: number
          favorite_conversations: number
          last_conversation_activity: string | null
        }
      }
    }
    Functions: {
      get_user_stats: {
        Args: {
          user_id: string
        }
        Returns: {
          total_conversations: number
          active_conversations: number
          favorite_conversations: number
          total_messages: number
          avg_messages_per_conversation: number
          most_used_tags: string[]
          recent_activity: string[]
        }
      }
      reset_monthly_usage: {
        Args: {}
        Returns: void
      }
      get_schema_version: {
        Args: {}
        Returns: string
      }
    }
    Enums: {
      conversation_status: 'active' | 'archived' | 'deleted'
      subscription_tier: 'free' | 'pro' | 'enterprise'
      subscription_status: 'active' | 'cancelled' | 'past_due' | 'incomplete'
      message_role: 'user' | 'assistant' | 'system'
      connection_status: 'active' | 'inactive' | 'disconnected'
    }
  }
}