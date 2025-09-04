#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createEssentialTables() {
  console.log('🚀 Creating Essential Database Tables...\n');

  // Essential DDL statements
  const statements = [
    // Update conversations table structure
    `
    ALTER TABLE conversations 
    ADD COLUMN IF NOT EXISTS messages JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS generated_prompt TEXT,
    ADD COLUMN IF NOT EXISTS prompt_generated_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    `,
    
    // Create conversation_messages table
    `
    CREATE TABLE IF NOT EXISTS conversation_messages (
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
    `,
    
    // Create usage_limits table
    `
    CREATE TABLE IF NOT EXISTS usage_limits (
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
    `,
    
    // Create user_analytics table
    `
    CREATE TABLE IF NOT EXISTS user_analytics (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
        event_type TEXT NOT NULL,
        event_data JSONB DEFAULT '{}'::jsonb,
        session_id TEXT,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    `,
    
    // Create indexes
    `CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_conversations_last_activity ON conversations(last_activity_at DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON conversation_messages(conversation_id);`,
    `CREATE INDEX IF NOT EXISTS idx_messages_index ON conversation_messages(conversation_id, message_index);`,
    `CREATE INDEX IF NOT EXISTS idx_usage_limits_user_id ON usage_limits(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_analytics_user_event ON user_analytics(user_id, event_type, created_at DESC);`,
    
    // Enable RLS on new tables
    `ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE usage_limits ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE user_analytics ENABLE ROW LEVEL SECURITY;`,
    
    // Create RLS policies
    `
    CREATE POLICY IF NOT EXISTS "Users can view messages from own conversations" ON conversation_messages
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM conversations 
                WHERE conversations.id = conversation_messages.conversation_id 
                AND conversations.user_id = auth.uid()
            )
        );
    `,
    `
    CREATE POLICY IF NOT EXISTS "Users can insert messages to own conversations" ON conversation_messages
        FOR INSERT WITH CHECK (
            EXISTS (
                SELECT 1 FROM conversations 
                WHERE conversations.id = conversation_messages.conversation_id 
                AND conversations.user_id = auth.uid()
            )
        );
    `,
    `
    CREATE POLICY IF NOT EXISTS "Users can view own usage" ON usage_limits
        FOR SELECT USING (auth.uid() = user_id);
    `,
    `
    CREATE POLICY IF NOT EXISTS "Users can update own usage" ON usage_limits
        FOR ALL USING (auth.uid() = user_id);
    `,
    `
    CREATE POLICY IF NOT EXISTS "Users can view own analytics" ON user_analytics
        FOR SELECT USING (auth.uid() = user_id);
    `,
    `
    CREATE POLICY IF NOT EXISTS "System can insert analytics" ON user_analytics
        FOR INSERT WITH CHECK (true);
    `,
    
    // Create trigger for conversation activity updates
    `
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
            ),
            updated_at = NOW()
        WHERE id = NEW.conversation_id;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    `,
    
    `
    DROP TRIGGER IF EXISTS update_conversation_activity_trigger ON conversation_messages;
    CREATE TRIGGER update_conversation_activity_trigger
        AFTER INSERT ON conversation_messages
        FOR EACH ROW EXECUTE FUNCTION update_conversation_activity();
    `
  ];

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i].trim();
    if (!statement) continue;

    console.log(`📝 Executing statement ${i + 1}/${statements.length}`);
    
    try {
      const { error } = await supabase.rpc('exec', { sql: statement });
      
      if (error) {
        // Try alternative approach for unsupported operations
        if (error.message.includes('exec')) {
          console.log(`⚠️  Statement ${i + 1}: Using manual execution (exec not available)`);
          
          // For statements that don't require exec, try direct table operations
          if (statement.includes('CREATE TABLE')) {
            console.log('   Skipping table creation - will handle manually');
          }
          
        } else if (error.message.includes('already exists') || 
                   error.message.includes('does not exist')) {
          console.log(`✅ Statement ${i + 1}: Already exists/handled`);
          successCount++;
        } else {
          console.log(`❌ Statement ${i + 1}: ${error.message.substring(0, 100)}`);
          errorCount++;
        }
      } else {
        console.log(`✅ Statement ${i + 1}: Success`);
        successCount++;
      }
      
    } catch (err) {
      console.log(`🚨 Statement ${i + 1}: ${err.message.substring(0, 100)}`);
      errorCount++;
    }
  }

  console.log(`\n📊 Execution Summary:`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);

  // Manual verification and setup
  console.log(`\n🔧 Manual Setup Required:`);
  console.log('1. Copy the following SQL to Supabase SQL Editor:');
  console.log('2. Execute each block separately');
  console.log('\n--- COPY BELOW ---');
  
  const manualSQL = `
-- Add columns to conversations table
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS messages JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS generated_prompt TEXT,
ADD COLUMN IF NOT EXISTS prompt_generated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create conversation_messages table
CREATE TABLE IF NOT EXISTS conversation_messages (
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

-- Create usage_limits table
CREATE TABLE IF NOT EXISTS usage_limits (
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

-- Enable RLS
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_limits ENABLE ROW LEVEL SECURITY;

-- Create policies
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

CREATE POLICY "Users can view own usage" ON usage_limits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own usage" ON usage_limits
    FOR ALL USING (auth.uid() = user_id);
`;

  console.log(manualSQL);
  console.log('--- END COPY ---\n');
  
  console.log('🎯 After executing the SQL above:');
  console.log('1. Restart your dev server');
  console.log('2. Test conversation creation');
  console.log('3. Check if conversations appear in sidebar');
}

createEssentialTables();