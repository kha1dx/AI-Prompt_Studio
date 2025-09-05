// Quick environment variables check
require('dotenv').config({ path: '.env.local' });
console.log('=== Environment Variables Check ===');

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'
];

console.log('Current NODE_ENV:', process.env.NODE_ENV);
console.log('\nChecking required environment variables:');

requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  const status = value ? '✅ SET' : '❌ MISSING';
  const preview = value ? `${value.substring(0, 10)}...` : 'undefined';
  console.log(`${envVar}: ${status} (${preview})`);
});

console.log('\n=== Quick Test Results ===');
const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingVars.length > 0) {
  console.log('❌ Missing environment variables:', missingVars);
  console.log('\nPlease check your .env.local file and add:');
  missingVars.forEach(envVar => {
    console.log(`${envVar}=your-value-here`);
  });
} else {
  console.log('✅ All required environment variables are set');
}

console.log('\n=== Stripe Configuration Test ===');
if (process.env.STRIPE_SECRET_KEY) {
  const isTestKey = process.env.STRIPE_SECRET_KEY.startsWith('sk_test_');
  console.log(`Stripe key type: ${isTestKey ? '✅ TEST' : '⚠️ LIVE'}`);
  console.log(`Key format: ${process.env.STRIPE_SECRET_KEY.substring(0, 15)}...`);
} else {
  console.log('❌ No Stripe secret key found');
}