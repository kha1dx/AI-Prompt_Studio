#!/usr/bin/env node

// Test upgrade flow end-to-end
require('dotenv').config({ path: '.env.local' });

async function testUpgradeFlow() {
  console.log('🧪 Testing Upgrade Flow...\n');

  // Step 1: Test Supabase connection
  console.log('1️⃣ Testing Supabase connection...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('❌ Supabase credentials missing');
    return;
  }
  
  try {
    const supabaseResponse = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });
    
    if (supabaseResponse.ok) {
      console.log('✅ Supabase connection working');
    } else {
      console.log('❌ Supabase connection failed:', supabaseResponse.status);
    }
  } catch (error) {
    console.log('❌ Supabase connection error:', error.message);
  }

  // Step 2: Test checkout API endpoint
  console.log('\n2️⃣ Testing checkout API endpoint...');
  
  const testPayload = {
    priceId: 'price_1S3nBfJzPNX2JWtFbJnOdjwp', // Pro plan price ID
    successUrl: 'http://localhost:3001/dashboard?success=true',
    cancelUrl: 'http://localhost:3001/billing'
  };

  try {
    const checkoutResponse = await fetch('http://localhost:3001/api/stripe/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // This will fail auth, but we can see the error
      },
      body: JSON.stringify(testPayload)
    });

    const checkoutData = await checkoutResponse.json();
    
    console.log('API Response Status:', checkoutResponse.status);
    console.log('API Response Data:', JSON.stringify(checkoutData, null, 2));
    
    if (checkoutResponse.status === 401) {
      console.log('✅ API endpoint working (401 expected without valid auth)');
    } else if (checkoutResponse.status === 500) {
      console.log('❌ Server error - check your environment variables');
    }
    
  } catch (error) {
    console.log('❌ API request failed:', error.message);
  }

  // Step 3: Check environment variables one more time
  console.log('\n3️⃣ Final environment check...');
  
  const envVars = {
    'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...',
    'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...',
    'STRIPE_SECRET_KEY': process.env.STRIPE_SECRET_KEY?.substring(0, 20) + '...',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY': process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.substring(0, 20) + '...',
    'NEXT_PUBLIC_APP_URL': process.env.NEXT_PUBLIC_APP_URL
  };
  
  for (const [key, value] of Object.entries(envVars)) {
    const status = value && !value.includes('YOUR_') ? '✅' : '❌';
    console.log(`${key}: ${status} ${value || 'MISSING'}`);
  }

  console.log('\n4️⃣ Next Steps:');
  console.log('   1. Open your browser to: http://localhost:3001/dashboard');
  console.log('   2. Open browser Developer Tools (F12)');
  console.log('   3. Go to Console tab');
  console.log('   4. Click "Billing" then "Upgrade to Pro"');
  console.log('   5. Check for any errors in the console');
  console.log('   6. Check Network tab for failed requests');
}

testUpgradeFlow();