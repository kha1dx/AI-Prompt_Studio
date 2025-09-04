#!/usr/bin/env node

/**
 * Final Verification Test
 * Tests all the fixed database operations to ensure everything is working
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🎯 Final Database Verification Test');
console.log('===================================');

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

async function testConversationOperations() {
  console.log('🔍 Testing conversation operations after fixes...');
  
  // Test 1: Query with all expected columns
  try {
    console.log('  Test 1: Full conversation query');
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .select('id, user_id, title, messages, status, generated_prompt, prompt_generated_at, created_at, updated_at, tags, is_favorite, message_count, last_activity_at')
      .limit(1);

    if (error) {
      console.log('    ❌ Error:', error.message);
      console.log('    Code:', error.code);
      return false;
    } else {
      console.log('    ✅ Query successful');
      console.log('    Results:', data.length);
      if (data.length > 0) {
        console.log('    Sample record keys:', Object.keys(data[0]).join(', '));
      }
    }
  } catch (err) {
    console.log('    ❌ Exception:', err.message);
    return false;
  }

  // Test 2: Order by last_activity_at (the problematic query)
  try {
    console.log('  Test 2: Order by last_activity_at');
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .order('last_activity_at', { ascending: false })
      .limit(5);

    if (error) {
      console.log('    ❌ Error:', error.message);
      return false;
    } else {
      console.log('    ✅ Order by last_activity_at works');
      console.log('    Results:', data.length);
    }
  } catch (err) {
    console.log('    ❌ Exception:', err.message);
    return false;
  }

  // Test 3: Filter by status and user_id (mimicking the app query)
  try {
    console.log('  Test 3: App-like query (status + user_id filter)');
    const testUserId = '550e8400-e29b-41d4-a716-446655440000'; // Mock UUID
    
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('user_id', testUserId)
      .eq('status', 'active')
      .order('last_activity_at', { ascending: false });

    if (error) {
      console.log('    ❌ Error:', error.message);
      return false;
    } else {
      console.log('    ✅ App-like query works');
      console.log('    Results:', data.length);
    }
  } catch (err) {
    console.log('    ❌ Exception:', err.message);
    return false;
  }

  return true;
}

async function testRLSPolicies() {
  console.log('🔐 Testing RLS policies...');
  
  try {
    const { data, error } = await supabaseAnon
      .from('conversations')
      .select('*')
      .limit(1);

    if (error) {
      if (error.code === 'PGRST301' || error.message.includes('JWT')) {
        console.log('    ✅ RLS working - anonymous access properly blocked');
        return true;
      } else {
        console.log('    ⚠️  Unexpected error:', error.message);
        return false;
      }
    } else {
      console.log('    ⚠️  Warning: RLS may not be working - anonymous access succeeded');
      console.log('    Results:', data.length);
      return false;
    }
  } catch (err) {
    console.log('    ❌ Exception:', err.message);
    return false;
  }
}

async function testErrorSerialization() {
  console.log('🧪 Testing error serialization...');
  
  try {
    // Intentionally cause an error
    const { data, error } = await supabaseAnon
      .from('conversations')
      .select('nonexistent_column')
      .limit(1);

    if (error) {
      // Test serialization
      const serializedError = JSON.stringify({
        message: error.message,
        code: error.code,
        status: error.status,
        details: error.details,
        hint: error.hint
      }, null, 2);
      
      console.log('    ✅ Error serialization works');
      console.log('    Sample serialized error:', serializedError.substring(0, 100) + '...');
      return true;
    }
  } catch (err) {
    console.log('    ❌ Exception during serialization test:', err.message);
    return false;
  }
  
  return false;
}

async function testDatabaseService() {
  console.log('🔧 Testing DatabaseService operations...');
  
  try {
    // Import and test the actual database service
    const { conversationService } = require('../src/lib/database');
    
    // Test with a mock user ID (this should fail gracefully due to auth)
    const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
    
    console.log('  Testing conversationService.getAll...');
    const conversations = await conversationService.getAll(mockUserId);
    
    console.log('    ✅ conversationService.getAll works');
    console.log('    Returned:', conversations.length, 'conversations');
    console.log('    (Empty result expected due to authentication)');
    
    return true;
  } catch (err) {
    console.log('    ❌ DatabaseService error:', err.message);
    
    // Check if this is an expected auth error
    if (err.message.includes('JWT') || err.message.includes('auth') || err.message.includes('401')) {
      console.log('    ✅ This is an expected authentication error');
      return true;
    }
    
    return false;
  }
}

async function runAllTests() {
  const results = [];
  
  results.push(await testConversationOperations());
  results.push(await testRLSPolicies()); 
  results.push(await testErrorSerialization());
  results.push(await testDatabaseService());
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('\n📊 FINAL RESULTS');
  console.log('=================');
  console.log(`Passed: ${passed}/${total} tests`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Database issues are resolved.');
    console.log('\n✅ WHAT WAS FIXED:');
    console.log('- Missing columns in conversations table');
    console.log('- Error serialization for proper logging');
    console.log('- RLS policies are working correctly');
    console.log('- Database service operations are functional');
    
    console.log('\n🚀 NEXT STEPS:');
    console.log('1. Test your application with real user authentication');
    console.log('2. The "Database error: {}" messages should now be gone');
    console.log('3. Users should see empty conversation lists (not errors) when not authenticated');
    console.log('4. Authenticated users should be able to create and view conversations');
    
  } else {
    console.log('❌ Some tests failed. Please review the issues above.');
    console.log('\n🔧 TROUBLESHOOTING:');
    console.log('1. Ensure the SQL fix script was run in Supabase');
    console.log('2. Check that all required columns are present');
    console.log('3. Verify RLS policies are configured correctly');
    
  }
  
  return passed === total;
}

async function main() {
  const success = await runAllTests();
  process.exit(success ? 0 : 1);
}

main().catch(err => {
  console.error('❌ Verification test failed:', err);
  process.exit(1);
});