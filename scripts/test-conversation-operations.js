#!/usr/bin/env node

/**
 * Test Conversation Operations
 * Tests the actual conversation service operations that are failing
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Testing Conversation Operations');
console.log('=================================');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConversationQuery() {
  console.log('🔍 Testing conversation query (mimicking useConversations)...');
  
  // This mimics what the useConversations hook does
  const mockUserId = 'test-user-123';
  
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', mockUserId)
      .eq('status', 'active')
      .order('last_activity_at', { ascending: false });

    if (error) {
      console.log('  📝 Error details:');
      console.log('    Message:', error.message || 'No message');
      console.log('    Code:', error.code || 'No code');
      console.log('    Status:', error.status || 'No status');
      console.log('    Details:', error.details || 'No details');
      console.log('    Hint:', error.hint || 'No hint');
      
      // Test error serialization
      console.log('  🧪 Error serialization test:');
      try {
        const serialized = JSON.stringify(error, null, 2);
        console.log('    Serialized successfully:', serialized);
      } catch (serializeError) {
        console.log('    ❌ Serialization failed:', serializeError.message);
        
        // Try safe serialization
        const safeError = {
          message: error?.message,
          code: error?.code,
          status: error?.status,
          details: error?.details,
          hint: error?.hint
        };
        const safeSerialized = JSON.stringify(safeError, null, 2);
        console.log('    Safe serialization:', safeSerialized);
      }
      
      // Check if this is an expected authentication error
      const isAuthError = (
        error?.message?.includes('JWT') || 
        error?.code === 'PGRST301' || 
        error?.status === 401 ||
        error?.message?.includes('Auth session missing')
      );
      
      if (isAuthError) {
        console.log('  ✅ This is an expected authentication error (RLS working)');
        return 'auth_error_expected';
      } else {
        console.log('  ⚠️  Unexpected error type');
        return 'unexpected_error';
      }
    } else {
      console.log('  ✅ Query successful');
      console.log('    Results:', data?.length || 0, 'conversations');
      return 'success';
    }
  } catch (err) {
    console.log('  ❌ Caught exception:');
    console.log('    Type:', err.constructor.name);
    console.log('    Message:', err.message);
    
    // Test exception serialization
    try {
      const serialized = JSON.stringify(err, null, 2);
      console.log('    Serialized successfully:', serialized);
    } catch (serializeError) {
      console.log('    ❌ Exception serialization failed');
      
      const safeException = {
        name: err.name,
        message: err.message,
        stack: err.stack?.substring(0, 200) + '...'
      };
      console.log('    Safe serialization:', JSON.stringify(safeException, null, 2));
    }
    
    return 'exception';
  }
}

async function testErrorTypes() {
  console.log('\n🔍 Testing various error scenarios...');
  
  // Test 1: Non-existent table
  console.log('  Test 1: Non-existent table');
  try {
    const { data, error } = await supabase
      .from('nonexistent_table')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('    Error type:', error.constructor.name);
      console.log('    Message contains "does not exist":', error.message.includes('does not exist'));
      console.log('    Full error:', JSON.stringify({
        message: error.message,
        code: error.code,
        status: error.status
      }, null, 2));
    }
  } catch (err) {
    console.log('    Exception:', err.message);
  }
  
  // Test 2: Invalid column
  console.log('  Test 2: Invalid column');
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('nonexistent_column')
      .limit(1);
    
    if (error) {
      console.log('    Error serialization:', JSON.stringify({
        message: error.message,
        code: error.code,
        status: error.status
      }, null, 2));
    }
  } catch (err) {
    console.log('    Exception:', err.message);
  }
  
  // Test 3: Test timeout (if supported)
  console.log('  Test 3: Network timeout simulation');
  try {
    // Create a new client with a very short timeout
    const timeoutClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: (...args) => {
          return Promise.race([
            fetch(...args),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 100)
            )
          ]);
        }
      }
    });
    
    const { data, error } = await timeoutClient
      .from('conversations')
      .select('*')
      .limit(1);
    
    console.log('    No timeout occurred');
  } catch (err) {
    console.log('    Timeout error:', err.message);
    console.log('    Error serialization test:', JSON.stringify({
      name: err.name,
      message: err.message
    }, null, 2));
  }
}

async function testDifferentUsers() {
  console.log('\n🔍 Testing with different user scenarios...');
  
  const testUsers = [
    'valid-uuid-00000000-0000-0000-0000-000000000000',
    'invalid-uuid',
    null,
    undefined
  ];
  
  for (const userId of testUsers) {
    console.log(`  Testing with user: ${userId || 'null/undefined'}`);
    try {
      let query = supabase.from('conversations').select('*');
      
      if (userId !== null && userId !== undefined) {
        query = query.eq('user_id', userId);
      }
      
      const { data, error } = await query.limit(1);
      
      if (error) {
        console.log(`    Error for user ${userId}:`, error.code, '-', error.message);
      } else {
        console.log(`    Success for user ${userId}:`, data?.length || 0, 'results');
      }
    } catch (err) {
      console.log(`    Exception for user ${userId}:`, err.message);
    }
  }
}

async function main() {
  const result1 = await testConversationQuery();
  await testErrorTypes();
  await testDifferentUsers();
  
  console.log('\n📊 SUMMARY');
  console.log('==========');
  console.log('Conversation query result:', result1);
  
  console.log('\n💡 FINDINGS:');
  if (result1 === 'auth_error_expected') {
    console.log('✅ The "empty error" issue is likely due to authentication');
    console.log('   The errors are being caught and handled correctly');
    console.log('   The application should show empty conversations, not error messages');
  } else if (result1 === 'unexpected_error') {
    console.log('⚠️  There may be a real database configuration issue');
  } else if (result1 === 'success') {
    console.log('⚠️  RLS policies may not be working correctly');
    console.log('   Anonymous users should not be able to access conversations');
  }
  
  console.log('\n🔧 RECOMMENDED FIXES:');
  console.log('1. Update error logging to better handle Supabase error objects');
  console.log('2. Ensure useConversations hook handles auth errors gracefully');
  console.log('3. Consider adding user authentication status checks');
  console.log('4. Improve error serialization in the logging functions');
}

main().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});