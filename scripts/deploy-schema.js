#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function deploySchema() {
  console.log('🚀 Deploying Enhanced Database Schema...\n');

  try {
    // Read the enhanced schema file
    const schemaPath = path.join(__dirname, '../database/enhanced-schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('📋 Schema file loaded successfully');
    console.log('📊 Schema size:', (schemaSql.length / 1024).toFixed(2) + 'KB\n');

    // Execute the schema
    console.log('⚡ Executing schema deployment...');
    const { data, error } = await supabase.rpc('exec_sql', { sql: schemaSql });

    if (error) {
      // If exec_sql doesn't exist, try splitting and executing individual statements
      console.log('📝 Trying alternative deployment method...');
      
      // Split SQL into individual statements
      const statements = schemaSql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i] + ';';
        
        try {
          const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement });
          
          if (stmtError) {
            // Skip non-critical errors
            if (stmtError.message.includes('already exists') || 
                stmtError.message.includes('does not exist') ||
                stmtError.message.includes('extension') ||
                stmtError.message.includes('pg_cron')) {
              console.log(`⚠️  Skipping: ${stmtError.message.substring(0, 100)}...`);
            } else {
              console.error(`❌ Statement ${i + 1} failed:`, stmtError.message.substring(0, 200));
              errorCount++;
            }
          } else {
            successCount++;
          }
        } catch (err) {
          console.error(`🚨 Execution error on statement ${i + 1}:`, err.message);
          errorCount++;
        }
      }

      console.log(`\n📈 Deployment Summary:`);
      console.log(`✅ Successful statements: ${successCount}`);
      console.log(`❌ Failed statements: ${errorCount}`);
      console.log(`📊 Total statements: ${statements.length}`);

    } else {
      console.log('✅ Schema deployed successfully!');
    }

    // Verify deployment by checking key tables
    console.log('\n🔍 Verifying deployment...');
    
    const verificationTests = [
      { table: 'conversations', desc: 'Enhanced conversations table' },
      { table: 'conversation_messages', desc: 'Message tracking table' },
      { table: 'profiles', desc: 'User profiles table' },
      { table: 'usage_limits', desc: 'Usage limits table' },
      { table: 'user_analytics', desc: 'Analytics table' }
    ];

    let verificationPassed = 0;
    
    for (const test of verificationTests) {
      try {
        const { data, error } = await supabase
          .from(test.table)
          .select('*')
          .limit(1);
          
        if (error) {
          console.log(`❌ ${test.desc}: ${error.message}`);
        } else {
          console.log(`✅ ${test.desc}: Available`);
          verificationPassed++;
        }
      } catch (err) {
        console.log(`❌ ${test.desc}: ${err.message}`);
      }
    }

    console.log(`\n🎯 Verification Results: ${verificationPassed}/${verificationTests.length} tables verified`);

    if (verificationPassed >= 3) {
      console.log('\n🎉 Database schema deployment completed successfully!');
      console.log('👉 You can now run the application with proper conversation persistence.');
      console.log('\n🔧 Next steps:');
      console.log('1. Restart your development server: npm run dev');
      console.log('2. Test conversation creation and saving');
      console.log('3. Check sidebar for conversation history');
    } else {
      console.log('\n⚠️  Partial deployment. Some tables may need manual creation.');
      console.log('👉 Check Supabase dashboard for detailed error logs.');
    }

  } catch (error) {
    console.error('🚨 Deployment failed:', error);
    console.log('\n🔧 Manual steps:');
    console.log('1. Copy contents of database/enhanced-schema.sql');
    console.log('2. Execute in Supabase SQL editor');
    console.log('3. Enable RLS on all tables');
    console.log('4. Verify table creation in Database view');
  }
}

// Run deployment
deploySchema();