-- 🔧 Supabase Database Schema Fix for Conversations Table
-- This script fixes the missing columns that are causing "Database error in getAll: {}" errors
-- Run this in your Supabase Dashboard → SQL Editor

-- First, let's check if the conversations table exists and what columns it has
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'conversations') THEN
        RAISE NOTICE 'Creating conversations table...';
        
        -- Create the conversations table with all required columns
        CREATE TABLE conversations (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            title TEXT NOT NULL DEFAULT 'New Conversation',
            status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            message_count INTEGER NOT NULL DEFAULT 0,
            is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
            tags TEXT[] DEFAULT '{}',
            generated_prompt TEXT,
            has_prompt BOOLEAN GENERATED ALWAYS AS (generated_prompt IS NOT NULL) STORED,
            preview TEXT
        );
    ELSE
        RAISE NOTICE 'Conversations table exists, checking for missing columns...';
    END IF;
END $$;

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add last_activity_at column (this is the main issue causing the errors)
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'last_activity_at') THEN
        ALTER TABLE conversations ADD COLUMN last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
        RAISE NOTICE 'Added last_activity_at column';
    END IF;

    -- Add message_count column
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'message_count') THEN
        ALTER TABLE conversations ADD COLUMN message_count INTEGER NOT NULL DEFAULT 0;
        RAISE NOTICE 'Added message_count column';
    END IF;

    -- Add is_favorite column
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'is_favorite') THEN
        ALTER TABLE conversations ADD COLUMN is_favorite BOOLEAN NOT NULL DEFAULT FALSE;
        RAISE NOTICE 'Added is_favorite column';
    END IF;

    -- Add tags column
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'tags') THEN
        ALTER TABLE conversations ADD COLUMN tags TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Added tags column';
    END IF;

    -- Add generated_prompt column
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'generated_prompt') THEN
        ALTER TABLE conversations ADD COLUMN generated_prompt TEXT;
        RAISE NOTICE 'Added generated_prompt column';
    END IF;

    -- Add has_prompt computed column
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'has_prompt') THEN
        ALTER TABLE conversations ADD COLUMN has_prompt BOOLEAN GENERATED ALWAYS AS (generated_prompt IS NOT NULL) STORED;
        RAISE NOTICE 'Added has_prompt computed column';
    END IF;

    -- Add preview column
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'preview') THEN
        ALTER TABLE conversations ADD COLUMN preview TEXT;
        RAISE NOTICE 'Added preview column';
    END IF;

    -- Add status column with constraint
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'status') THEN
        ALTER TABLE conversations ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
        ALTER TABLE conversations ADD CONSTRAINT conversations_status_check CHECK (status IN ('active', 'archived'));
        RAISE NOTICE 'Added status column with constraint';
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_activity_at ON conversations(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_is_favorite ON conversations(is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_conversations_has_prompt ON conversations(has_prompt) WHERE has_prompt = TRUE;

-- Update existing rows to have proper last_activity_at values
UPDATE conversations 
SET last_activity_at = COALESCE(updated_at, created_at, NOW())
WHERE last_activity_at IS NULL OR last_activity_at < created_at;

-- Create or update the updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.last_activity_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
CREATE POLICY "Users can view own conversations" ON conversations
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own conversations" ON conversations;
CREATE POLICY "Users can insert own conversations" ON conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
CREATE POLICY "Users can update own conversations" ON conversations
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own conversations" ON conversations;
CREATE POLICY "Users can delete own conversations" ON conversations
    FOR DELETE USING (auth.uid() = user_id);

-- Create messages table if it doesn't exist (referenced in the application)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Create RLS policies for messages
DROP POLICY IF EXISTS "Users can view messages from own conversations" ON messages;
CREATE POLICY "Users can view messages from own conversations" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND conversations.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert messages to own conversations" ON messages;
CREATE POLICY "Users can insert messages to own conversations" ON messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND conversations.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update messages in own conversations" ON messages;
CREATE POLICY "Users can update messages in own conversations" ON messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND conversations.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete messages from own conversations" ON messages;
CREATE POLICY "Users can delete messages from own conversations" ON messages
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND conversations.user_id = auth.uid()
        )
    );

-- Create function to update conversation message_count
CREATE OR REPLACE FUNCTION update_conversation_message_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE conversations 
        SET message_count = message_count + 1,
            last_activity_at = NOW(),
            updated_at = NOW()
        WHERE id = NEW.conversation_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE conversations 
        SET message_count = GREATEST(message_count - 1, 0),
            last_activity_at = NOW(),
            updated_at = NOW()
        WHERE id = OLD.conversation_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for message count
DROP TRIGGER IF EXISTS update_message_count_on_insert ON messages;
CREATE TRIGGER update_message_count_on_insert
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_message_count();

DROP TRIGGER IF EXISTS update_message_count_on_delete ON messages;
CREATE TRIGGER update_message_count_on_delete
    AFTER DELETE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_message_count();

-- Recalculate message counts for existing conversations
UPDATE conversations
SET message_count = (
    SELECT COUNT(*)
    FROM messages
    WHERE messages.conversation_id = conversations.id
);

-- Final verification
DO $$
DECLARE
    missing_columns TEXT[] := '{}';
    col_name TEXT;
    required_columns TEXT[] := ARRAY[
        'id', 'user_id', 'title', 'status', 'created_at', 'updated_at', 
        'last_activity_at', 'message_count', 'is_favorite', 'tags', 
        'generated_prompt', 'has_prompt', 'preview'
    ];
BEGIN
    FOREACH col_name IN ARRAY required_columns LOOP
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'conversations' AND column_name = col_name
        ) THEN
            missing_columns := array_append(missing_columns, col_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE WARNING 'Missing columns: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE '✅ All required columns exist in conversations table!';
    END IF;
    
    RAISE NOTICE '🎉 Database schema fix completed successfully!';
    RAISE NOTICE 'Your "Database error in getAll: {}" errors should now be resolved.';
END $$;