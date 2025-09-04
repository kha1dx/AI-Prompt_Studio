#!/usr/bin/env node

/**
 * Database Connection Test - Emergency Testing
 * Simple test to verify database connectivity without server components
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dhiznegwoezqmdoutjss.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoaXpuZWd3b2V6cW1kb3V0anNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MzU4ODYsImV4cCI6MjA3MjQxMTg4Nn0.eH552GOOWAJJ1-Q2Hep5wS1rhdynUOxYtt26R9HAKMI';

async function testDatabaseConnection() {
  console.log('🔍 Testing Database Connection...');
  console.log(`URL: ${supabaseUrl}`);
  console.log(`Key: ${supabaseAnonKey.substring(0, 20)}...`);
  
  try {
    // Create supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    console.log('\n1. Testing basic connection...');
    const { data, error } = await supabase
      .from('profiles')
      .select('count', { count: 'exact' })
      .limit(1);
    
    if (error) {
      console.log('❌ Database connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Database connection successful');
    
    console.log('\n2. Testing conversations table...');
    const { data: convData, error: convError } = await supabase
      .from('conversations')
      .select('count', { count: 'exact' })
      .limit(1);
    
    if (convError) {
      console.log('❌ Conversations table access failed:', convError.message);
      return false;
    }
    
    console.log('✅ Conversations table accessible');
    
    console.log('\n3. Testing usage_limits table...');
    const { data: usageData, error: usageError } = await supabase
      .from('usage_limits')
      .select('count', { count: 'exact' })
      .limit(1);
    
    if (usageError) {
      console.log('⚠️ usage_limits table issue:', usageError.message);
      console.log('   This table may not exist - API will need to handle gracefully');
    } else {
      console.log('✅ usage_limits table accessible');
    }
    
    console.log('\n4. Testing prompt_sessions table...');
    const { data: sessData, error: sessError } = await supabase
      .from('prompt_sessions')
      .select('count', { count: 'exact' })
      .limit(1);
    
    if (sessError) {
      console.log('⚠️ prompt_sessions table issue:', sessError.message);
      console.log('   This table may not exist - API will need to handle gracefully');
    } else {
      console.log('✅ prompt_sessions table accessible');
    }
    
    return true;
    
  } catch (error) {
    console.log('💥 Fatal error:', error.message);
    return false;
  }
}

// Test DatabaseService instantiation 
function testDatabaseServiceInstantiation() {
  console.log('\n🔍 Testing DatabaseService instantiation...');
  
  try {
    const { DatabaseService } = require('./src/lib/database');
    const db = new DatabaseService();
    console.log('✅ DatabaseService instantiated successfully');
    return true;
  } catch (error) {
    console.log('❌ DatabaseService instantiation failed:', error.message);
    console.log('Stack:', error.stack);
    return false;
  }
}

async function main() {
  console.log('🚀 Database Integration Test\n');
  
  const dbConnection = await testDatabaseConnection();
  const dbService = testDatabaseServiceInstantiation();
  
  console.log('\n📊 Results:');
  console.log(`Database Connection: ${dbConnection ? '✅' : '❌'}`);
  console.log(`DatabaseService: ${dbService ? '✅' : '❌'}`);
  
  if (dbConnection && dbService) {
    console.log('\n✅ Database integration ready');
    process.exit(0);
  } else {
    console.log('\n❌ Database integration issues detected');
    process.exit(1);
  }
}

main().catch(console.error);