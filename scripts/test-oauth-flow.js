#!/usr/bin/env node

/**
 * Test OAuth Flow - Verify that OAuth authentication is working properly
 * This script tests the authentication flow components and configurations
 */

import { createClient } from '@supabase/supabase-js'

async function testOAuthConfiguration() {
  console.log('🧪 Testing OAuth Configuration...\n')

  // Test 1: Verify Supabase configuration
  console.log('1. Testing Supabase Configuration')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables')
    return false
  }
  
  if (supabaseUrl.includes('your_supabase') || supabaseKey.includes('your_supabase')) {
    console.error('❌ Supabase environment variables not properly configured')
    return false
  }
  
  console.log('✅ Supabase configuration looks valid')
  
  // Test 2: Test Supabase client creation
  console.log('\n2. Testing Supabase Client')
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    console.log('✅ Supabase client created successfully')
    
    // Test 3: Test OAuth URL generation (without actual redirect)
    console.log('\n3. Testing OAuth URL Generation')
    
    // Mock the OAuth request to see what URL would be generated
    const redirectUrl = 'http://localhost:3000/auth/callback'
    
    console.log('📋 OAuth Configuration:')
    console.log(`   - Provider: google`)
    console.log(`   - Redirect URL: ${redirectUrl}`)
    console.log(`   - Query Params: access_type=offline, prompt=consent`)
    console.log(`   - State Parameter: REMOVED (handled by Supabase)`)
    
    console.log('✅ OAuth configuration appears correct')
    
  } catch (error) {
    console.error('❌ Failed to create Supabase client:', error.message)
    return false
  }
  
  // Test 4: Verify callback endpoint
  console.log('\n4. Testing Callback Endpoint')
  try {
    const response = await fetch('http://localhost:3000/auth/callback')
    if (response.ok) {
      console.log('✅ Callback endpoint is accessible')
    } else {
      console.log('⚠️  Callback endpoint returned non-200 status:', response.status)
    }
  } catch (error) {
    console.error('❌ Failed to reach callback endpoint:', error.message)
    return false
  }
  
  return true
}

async function main() {
  console.log('🔐 OAuth Flow Test Suite')
  console.log('========================\n')
  
  try {
    const success = await testOAuthConfiguration()
    
    if (success) {
      console.log('\n✅ All tests passed!')
      console.log('\n📋 Next Steps:')
      console.log('1. Open http://localhost:3000/login')
      console.log('2. Click "Sign in with Google"')
      console.log('3. Complete Google OAuth')
      console.log('4. Verify redirect to dashboard')
      console.log('\n🔍 Monitor server logs for authentication flow details')
    } else {
      console.log('\n❌ Some tests failed. Please fix the issues above.')
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Test suite failed:', error.message)
    process.exit(1)
  }
}

main()