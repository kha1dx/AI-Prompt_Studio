-- Enhanced Database Schema for Prompt Studio Backend
-- Comprehensive conversation management, prompt generation, and user data

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- =====================================================================================
-- ENHANCED CONVERSATIONS STORAGE (as per PRD requirements)
-- =====================================================================================

-- Enhanced conversations table with full feature support
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    messages JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    generated_prompt TEXT,
    prompt_generated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tags TEXT[] DEFAULT '{}',
    is_favorite BOOLEAN DEFAULT false,
    message_count INTEGER DEFAULT 0,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message tracking for analytics (enhanced)
CREATE TABLE IF NOT EXISTS public.conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    message_index INTEGER NOT NULL,
    token_count INTEGER DEFAULT 0,
    processing_time_ms INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(conversation_id, message_index)
);

-- =====================================================================================
-- USER PROFILES (Enhanced from existing)
-- =====================================================================================

-- Drop existing profiles if different structure
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    stripe_customer_id TEXT,
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
    subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'past_due', 'incomplete')),
    subscription_period_start TIMESTAMP WITH TIME ZONE,
    subscription_period_end TIMESTAMP WITH TIME ZONE,
    preferences JSONB DEFAULT '{
        "theme": "light",
        "email_notifications": true,
        "prompt_suggestions": true,
        "auto_save": true
    }'::jsonb,
    onboarding_completed BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================================
-- USAGE TRACKING & ANALYTICS
-- =====================================================================================

-- Enhanced usage limits
CREATE TABLE IF NOT EXISTS public.usage_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    monthly_prompts_used INTEGER DEFAULT 0,
    monthly_conversations_created INTEGER DEFAULT 0,
    monthly_api_calls INTEGER DEFAULT 0,
    last_reset_date DATE DEFAULT CURRENT_DATE,
    tier_limits JSONB DEFAULT '{
        "prompts": 5,
        "conversations": 10,
        "api_calls": 50
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics tracking
CREATE TABLE IF NOT EXISTS public.user_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}'::jsonb,
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================================
-- PROMPT TEMPLATES & SHARING
-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.prompt_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    template_content TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    tags TEXT[] DEFAULT '{}',
    is_public BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    rating_average DECIMAL(3,2) DEFAULT 0.0,
    rating_count INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Template ratings
CREATE TABLE IF NOT EXISTS public.template_ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID REFERENCES prompt_templates(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(template_id, user_id)
);

-- =====================================================================================
-- REAL-TIME FEATURES
-- =====================================================================================

-- WebSocket sessions for real-time features
CREATE TABLE IF NOT EXISTS public.websocket_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    session_token TEXT NOT NULL UNIQUE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    connection_status TEXT DEFAULT 'active' CHECK (connection_status IN ('active', 'inactive', 'disconnected')),
    last_ping_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- =====================================================================================
-- COMPREHENSIVE INDEXES FOR PERFORMANCE
-- =====================================================================================

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_last_activity ON conversations(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_tags ON conversations USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_conversations_favorite ON conversations(user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_conversations_title_search ON conversations USING gin(to_tsvector('english', title));

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON conversation_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_role ON conversation_messages(role);
CREATE INDEX IF NOT EXISTS idx_messages_content_search ON conversation_messages USING gin(to_tsvector('english', content));

-- User profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_last_login ON profiles(last_login_at DESC);

-- Usage tracking indexes
CREATE INDEX IF NOT EXISTS idx_usage_limits_user_id ON usage_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_limits_reset_date ON usage_limits(last_reset_date);
CREATE INDEX IF NOT EXISTS idx_analytics_user_event ON user_analytics(user_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_session ON user_analytics(session_id);

-- Templates indexes
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON prompt_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_public ON prompt_templates(is_public, rating_average DESC) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_templates_category ON prompt_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_tags ON prompt_templates USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_templates_usage ON prompt_templates(usage_count DESC);

-- =====================================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================================

-- Enable RLS on all tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE websocket_sessions ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can view own conversations" ON conversations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations" ON conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON conversations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" ON conversations
    FOR DELETE USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can view messages from own conversations" ON conversation_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = conversation_messages.conversation_id 
            AND conversations.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages to own conversations" ON conversation_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = conversation_messages.conversation_id 
            AND conversations.user_id = auth.uid()
        )
    );

-- Profile policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Usage limits policies
CREATE POLICY "Users can view own usage" ON usage_limits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own usage" ON usage_limits
    FOR UPDATE USING (auth.uid() = user_id);

-- Analytics policies
CREATE POLICY "Users can view own analytics" ON user_analytics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert analytics" ON user_analytics
    FOR INSERT WITH CHECK (true);

-- Template policies
CREATE POLICY "Users can view public templates" ON prompt_templates
    FOR SELECT USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can manage own templates" ON prompt_templates
    FOR ALL USING (auth.uid() = user_id);

-- =====================================================================================
-- TRIGGERS AND FUNCTIONS
-- =====================================================================================

-- Updated timestamp trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER set_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_usage_limits_updated_at
    BEFORE UPDATE ON usage_limits
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_templates_updated_at
    BEFORE UPDATE ON prompt_templates
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Function to update conversation activity
CREATE OR REPLACE FUNCTION update_conversation_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET 
        last_activity_at = NOW(),
        message_count = (
            SELECT COUNT(*) 
            FROM conversation_messages 
            WHERE conversation_id = NEW.conversation_id
        )
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_activity_trigger
    AFTER INSERT ON conversation_messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_activity();

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    
    INSERT INTO public.usage_limits (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to reset monthly usage
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
    UPDATE usage_limits 
    SET 
        monthly_prompts_used = 0,
        monthly_conversations_created = 0,
        monthly_api_calls = 0,
        last_reset_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE 
        last_reset_date < DATE_TRUNC('month', CURRENT_DATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================================
-- REALTIME SUBSCRIPTIONS
-- =====================================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE websocket_sessions;

-- =====================================================================================
-- PERFORMANCE OPTIMIZATION VIEWS
-- =====================================================================================

-- View for conversation summaries with analytics
CREATE OR REPLACE VIEW conversation_summaries AS
SELECT 
    c.id,
    c.user_id,
    c.title,
    c.status,
    c.is_favorite,
    c.tags,
    c.created_at,
    c.updated_at,
    c.last_activity_at,
    c.message_count,
    CASE WHEN c.generated_prompt IS NOT NULL THEN true ELSE false END as has_generated_prompt,
    array_agg(DISTINCT cm.role) as message_roles
FROM conversations c
LEFT JOIN conversation_messages cm ON c.id = cm.conversation_id
GROUP BY c.id, c.user_id, c.title, c.status, c.is_favorite, c.tags, 
         c.created_at, c.updated_at, c.last_activity_at, c.message_count, c.generated_prompt;

-- User statistics view
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    p.id as user_id,
    p.subscription_tier,
    ul.monthly_prompts_used,
    ul.monthly_conversations_created,
    COUNT(DISTINCT c.id) as total_conversations,
    COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as active_conversations,
    COUNT(DISTINCT CASE WHEN c.is_favorite THEN c.id END) as favorite_conversations,
    MAX(c.last_activity_at) as last_conversation_activity
FROM profiles p
LEFT JOIN usage_limits ul ON p.id = ul.user_id
LEFT JOIN conversations c ON p.id = c.user_id
GROUP BY p.id, p.subscription_tier, ul.monthly_prompts_used, ul.monthly_conversations_created;

-- =====================================================================================
-- GRANTS FOR SECURITY
-- =====================================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Service role policies (for admin operations)
CREATE POLICY "Service role full access conversations" ON conversations
    TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access messages" ON conversation_messages
    TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access profiles" ON profiles
    TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access usage" ON usage_limits
    TO service_role USING (true) WITH CHECK (true);

-- =====================================================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================================================

COMMENT ON TABLE conversations IS 'Enhanced conversation management with full feature support';
COMMENT ON TABLE conversation_messages IS 'Individual message tracking for analytics and search';
COMMENT ON TABLE profiles IS 'Extended user profiles with subscription and preference management';
COMMENT ON TABLE usage_limits IS 'Comprehensive usage tracking and limits enforcement';
COMMENT ON TABLE user_analytics IS 'Event tracking for user behavior analysis';
COMMENT ON TABLE prompt_templates IS 'Shareable prompt templates with rating system';
COMMENT ON TABLE template_ratings IS 'User ratings and reviews for templates';
COMMENT ON TABLE websocket_sessions IS 'Real-time connection management';

-- =====================================================================================
-- SCHEMA VERSION AND HEALTH CHECK
-- =====================================================================================

CREATE OR REPLACE FUNCTION get_schema_version()
RETURNS TEXT AS $$
BEGIN
    RETURN 'Enhanced Schema v2.0.0 - ' || NOW()::TEXT;
END;
$$ LANGUAGE plpgsql;