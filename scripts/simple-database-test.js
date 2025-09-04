#!/usr/bin/env node

/**
 * Simple Database Connection Test
 * This script tests the database connection and checks for missing columns
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseConnection() {
    console.log('🔍 Testing Database Connection...\n');
    
    try {
        // Test basic connection
        console.log('1️⃣ Testing basic connection...');
        const { data, error } = await supabase.from('conversations').select('count', { count: 'exact', head: true });
        
        if (error) {
            console.error('❌ Connection failed:', error.message);
            
            // If table doesn't exist, that's a different issue
            if (error.code === '42P01') {
                console.log('📋 Conversations table does not exist - this is expected for new projects');
                return { needsSchema: true, connectionOk: true };
            }
            
            return { connectionOk: false, error };
        }
        
        console.log('✅ Database connection successful');
        console.log(`📊 Total conversations: ${data || 0}`);
        
        // Check table schema
        console.log('\n2️⃣ Checking table schema...');
        const { data: columns, error: schemaError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable')
            .eq('table_name', 'conversations')
            .order('ordinal_position');
            
        if (schemaError) {
            console.error('❌ Schema check failed:', schemaError.message);
            return { connectionOk: true, schemaError };
        }
        
        console.log('📋 Current table columns:');
        const existingColumns = columns.map(col => col.column_name);
        columns.forEach(col => {
            console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULLABLE'}`);
        });
        
        // Check for missing required columns
        const requiredColumns = [
            'id', 'user_id', 'title', 'status', 'created_at', 'updated_at',
            'last_activity_at', 'message_count', 'is_favorite', 'tags',
            'generated_prompt', 'has_prompt', 'preview'
        ];
        
        const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
        
        console.log('\n3️⃣ Schema validation:');
        if (missingColumns.length > 0) {
            console.log('❌ Missing required columns:');
            missingColumns.forEach(col => console.log(`   - ${col}`));
            console.log('\n🔧 Run the fix-conversations-table.sql script in Supabase Dashboard');
            return { connectionOk: true, missingColumns, needsFix: true };
        } else {
            console.log('✅ All required columns exist!');
        }
        
        // Test a sample query that was failing
        console.log('\n4️⃣ Testing problematic query...');
        const { data: testData, error: queryError } = await supabase
            .from('conversations')
            .select('*')
            .limit(1);
            
        if (queryError) {
            console.error('❌ Sample query failed:', {
                message: queryError.message,
                code: queryError.code,
                details: queryError.details,
                hint: queryError.hint
            });
            return { connectionOk: true, queryError };
        }
        
        console.log('✅ Sample query successful');
        if (testData.length > 0) {
            console.log('📄 Sample record structure:', Object.keys(testData[0]));
        } else {
            console.log('📄 No records in table (this is normal for new projects)');
        }
        
        return { 
            connectionOk: true, 
            schemaOk: true, 
            totalConversations: data || 0,
            sampleRecord: testData[0] || null
        };
        
    } catch (err) {
        console.error('💥 Unexpected error:', {
            message: err.message,
            stack: err.stack
        });
        return { connectionOk: false, unexpectedError: err };
    }
}

// Run the test
testDatabaseConnection().then(result => {
    console.log('\n🎯 Test Results Summary:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.needsFix || result.missingColumns) {
        console.log('\n📋 Next Steps:');
        console.log('1. Open your Supabase Dashboard');
        console.log('2. Go to SQL Editor');
        console.log('3. Copy and paste the contents of scripts/fix-conversations-table.sql');
        console.log('4. Run the script');
        console.log('5. Test your application again');
    } else if (result.connectionOk && result.schemaOk) {
        console.log('\n🎉 Database is properly configured!');
        console.log('If you\'re still seeing errors, they may be authentication-related.');
    }
}).catch(err => {
    console.error('💥 Test failed:', err);
    process.exit(1);
});