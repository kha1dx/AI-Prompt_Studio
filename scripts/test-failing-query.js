#!/usr/bin/env node

/**
 * Test the exact query that's failing in the application
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Read environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFailingQuery() {
    console.log('🔍 Testing the exact failing query...\n');
    
    try {
        // This is the exact query from database.ts that's failing
        console.log('Running: conversations query with all expected columns...');
        const { data, error } = await supabase
            .from('conversations')
            .select('*')
            .eq('status', 'active')
            .order('last_activity_at', { ascending: false });

        if (error) {
            console.error('❌ Query failed with detailed error:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint,
                rawError: JSON.stringify(error, null, 2)
            });
            
            if (error.code === '42703') {
                console.log('\n🎯 FOUND THE ISSUE: Missing column in conversations table');
                console.log('This is exactly what\'s causing your "Database error in getAll: {}" error');
                
                // Try to identify which column is missing
                const columnTests = [
                    'last_activity_at',
                    'message_count', 
                    'is_favorite',
                    'tags',
                    'generated_prompt',
                    'has_prompt',
                    'preview',
                    'status'
                ];
                
                console.log('\n🔍 Testing individual columns...');
                for (const column of columnTests) {
                    try {
                        await supabase.from('conversations').select(column).limit(1);
                        console.log(`✅ ${column} - exists`);
                    } catch (colError) {
                        console.log(`❌ ${column} - MISSING (${colError.message})`);
                    }
                }
            }
            
            return { success: false, error };
        }
        
        console.log('✅ Query succeeded!');
        console.log(`📊 Found ${data.length} conversations`);
        
        if (data.length > 0) {
            console.log('📋 Available columns in first record:', Object.keys(data[0]));
        }
        
        return { success: true, data };
        
    } catch (err) {
        console.error('💥 Unexpected error:', {
            message: err.message,
            stack: err.stack
        });
        return { success: false, unexpectedError: err };
    }
}

// Also test a simple query to see what columns actually exist
async function testSimpleQuery() {
    console.log('\n🔍 Testing simple query to see current schema...');
    
    try {
        const { data, error } = await supabase
            .from('conversations')
            .select('*')
            .limit(1);
            
        if (error) {
            console.error('❌ Simple query failed:', error.message);
            return;
        }
        
        if (data.length > 0) {
            console.log('✅ Current table columns:', Object.keys(data[0]));
        } else {
            console.log('📄 Table exists but no data (normal for new projects)');
            
            // Try inserting a test record to see what columns are required
            console.log('\n🧪 Testing table structure with schema query...');
            try {
                // Use raw SQL to check table structure
                const { data: schemaData, error: schemaError } = await supabase.rpc('exec_sql', {
                    sql: `
                        SELECT column_name, data_type, is_nullable 
                        FROM information_schema.columns 
                        WHERE table_name = 'conversations' 
                        ORDER BY ordinal_position
                    `
                });
                
                if (!schemaError && schemaData) {
                    console.log('📋 Table schema:');
                    schemaData.forEach(col => {
                        console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULL)'}`);
                    });
                }
            } catch (schemaErr) {
                console.log('⚠️ Could not fetch schema directly');
            }
        }
        
    } catch (err) {
        console.error('💥 Simple query error:', err.message);
    }
}

// Run tests
async function runAllTests() {
    await testFailingQuery();
    await testSimpleQuery();
    
    console.log('\n🎯 Summary:');
    console.log('If you see missing column errors above, run scripts/fix-conversations-table.sql');
    console.log('This will add all the required columns and fix your "{}" error messages.');
}

runAllTests().catch(err => {
    console.error('💥 Test suite failed:', err);
    process.exit(1);
});