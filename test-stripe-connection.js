#!/usr/bin/env node

// Test Stripe connection script
require('dotenv').config({ path: '.env.local' });

console.log('🧪 Testing Stripe Connection...\n');

// Check environment variables
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (!stripeSecretKey || stripeSecretKey.includes('YOUR_')) {
  console.log('❌ STRIPE_SECRET_KEY is not set or still contains placeholder');
  console.log('   Please update .env.local with your actual secret key from:');
  console.log('   https://dashboard.stripe.com/test/apikeys\n');
  process.exit(1);
}

if (!stripePublishableKey || stripePublishableKey.includes('YOUR_')) {
  console.log('❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set or still contains placeholder');
  console.log('   Please update .env.local with your actual publishable key from:');
  console.log('   https://dashboard.stripe.com/test/apikeys\n');
  process.exit(1);
}

// Test Stripe API connection
async function testStripeConnection() {
  try {
    const response = await fetch('https://api.stripe.com/v1/products?limit=3', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Stripe API connection successful!');
      console.log(`📦 Found ${data.data.length} products in your account`);
      
      // Check for our Pro and Enterprise products
      const proProduct = data.data.find(p => p.name === 'Pro Plan');
      const enterpriseProduct = data.data.find(p => p.name === 'Enterprise Plan');
      
      console.log(`   🎯 Pro Plan: ${proProduct ? '✅ Found' : '❌ Missing'}`);
      console.log(`   🎯 Enterprise Plan: ${enterpriseProduct ? '✅ Found' : '❌ Missing'}`);
      
      if (proProduct && enterpriseProduct) {
        console.log('\n🚀 Ready to test payments!');
        console.log('   1. Start your dev server: npm run dev');
        console.log('   2. Go to: http://localhost:3001/dashboard');
        console.log('   3. Click "Billing" button');
        console.log('   4. Click "Upgrade to Pro"');
        console.log('   5. Use test card: 4242424242424242');
      } else {
        console.log('\n⚠️  Some products are missing. You may need to recreate them.');
      }
    } else {
      console.log('❌ Stripe API connection failed:');
      console.log('   Status:', response.status);
      console.log('   Error:', data.error?.message || data.error || 'Unknown error');
      
      if (response.status === 401) {
        console.log('\n💡 This usually means your API key is incorrect.');
        console.log('   Please double-check your secret key in .env.local');
      }
    }
  } catch (error) {
    console.log('❌ Failed to connect to Stripe API:');
    console.log('   Error:', error.message);
  }
}

testStripeConnection();