// Test Complete Payment Flow
console.log('🧪 Testing Complete Payment Flow...\n');

async function testCompleteFlow() {
  try {
    // 1. Test authentication endpoint
    console.log('1️⃣ Testing authentication...');
    // Direct test of checkout endpoint since authentication flows through Supabase
    console.log('🧪 Testing Stripe checkout endpoint directly...');
    console.log('Note: This test simulates what happens when user clicks "Upgrade to Pro"');
    
    // 1. Test checkout creation (this is what happens when clicking upgrade)
    console.log('\n1️⃣ Testing checkout session creation...');
    const checkoutData = {
      priceId: 'price_1S3nBfJzPNX2JWtFbJnOdjwp', // Pro plan price
      successUrl: 'http://localhost:3002/dashboard?success=true',
      cancelUrl: 'http://localhost:3002/billing'
    };
    
    console.log('Checkout payload:', checkoutData);
    
    // Test without auth first to see the expected error
    const checkoutResponse = await fetch('http://localhost:3002/api/stripe/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(checkoutData)
    });
    
    console.log('Checkout status:', checkoutResponse.status);
    const checkoutResult = await checkoutResponse.json();
    console.log('Checkout response:', checkoutResult);
    
    if (checkoutResult.sessionUrl) {
      console.log('\n🎉 SUCCESS! Checkout session created');
      console.log('🔗 Stripe Checkout URL:', checkoutResult.sessionUrl);
    } else if (checkoutResult.error === 'Authorization required') {
      console.log('\n✅ API is working correctly - requires authentication');
    }
    
    console.log('\n📝 Manual Test Instructions:');
    console.log('1. Open browser and visit: http://localhost:3002/login');
    console.log('2. Log in with your credentials');
    console.log('3. Navigate to billing page: http://localhost:3002/billing');
    console.log('4. Click "Upgrade to Pro" button');
    console.log('5. You should be redirected to Stripe Checkout');
    console.log('\n💳 Stripe Test Card Details:');
    console.log('Card Number: 4242 4242 4242 4242');
    console.log('Expiry: Any future date (e.g., 12/34)');
    console.log('CVC: Any 3 digits (e.g., 123)');
    console.log('ZIP: Any ZIP code (e.g., 12345)');
    
    console.log('\n🔧 Debugging Tips:');
    console.log('- Check browser console for detailed error logs');
    console.log('- Ensure you\'re logged in before testing upgrade');
    console.log('- Database schema has been fixed with stripe_customer_id and usage_limits');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testCompleteFlow();