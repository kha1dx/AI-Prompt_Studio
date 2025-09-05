'use client';

import { useState, useEffect } from 'react';
import { CheckIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useAuth } from '../../src/contexts/AuthContext';
import { createClient } from '../../src/lib/supabase/client';

const supabase = createClient();

interface PricingTier {
  name: string;
  id: string;
  price: number;
  description: string;
  features: string[];
  priceId?: string;
  popular?: boolean;
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Free',
    id: 'free',
    price: 0,
    description: 'Perfect for trying out Prompt Studio',
    features: [
      '5 prompt generations per month',
      'Basic conversation interface',
      'Community support',
      'No history saving'
    ]
  },
  {
    name: 'Pro',
    id: 'pro',
    price: 19,
    priceId: 'price_1S3nBfJzPNX2JWtFbJnOdjwp',
    description: 'Best for professionals and regular users',
    popular: true,
    features: [
      '100 prompt generations per month',
      'Full conversation history',
      'Prompt templates library',
      'Export functionality',
      'Priority support',
      'Advanced prompt analytics'
    ]
  },
  {
    name: 'Enterprise',
    id: 'enterprise',
    price: 99,
    priceId: 'price_1S3nBgJzPNX2JWtFx0SrbxCX',
    description: 'For teams and organizations',
    features: [
      'Unlimited prompt generations',
      'Team collaboration features',
      'API access (1000 requests/month)',
      'Custom prompt templates',
      'Advanced analytics dashboard',
      'Dedicated support',
      'White-label options'
    ]
  }
];

interface UserData {
  subscription_tier: string;
  monthly_prompts_used: number;
  monthly_limit: number;
}

export default function BillingPage() {
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    console.log('💳 Billing page loaded, user from context:', { user: !!user, userId: user?.id });
    if (user) {
      getUserData(user.id);
    } else {
      setLoading(false);
    }
  }, [user]);

  async function getUserData(userId: string) {
    try {
      console.log('📊 Getting user data for:', userId);
      
      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', userId)
        .single();

      // Get usage data
      const { data: usage } = await supabase
        .from('usage_limits')
        .select('monthly_prompts_used')
        .eq('user_id', userId)
        .single();

      if (profile) {
        const limits = {
          free: 5,
          pro: 100,
          enterprise: 999999
        };

        setUserData({
          subscription_tier: profile.subscription_tier || 'free',
          monthly_prompts_used: usage?.monthly_prompts_used || 0,
          monthly_limit: limits[profile.subscription_tier as keyof typeof limits] || 5
        });
      }
    } catch (error) {
      console.error('Error getting user data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpgrade(priceId: string, planName: string) {
    console.log('🚀 handleUpgrade called:', { priceId, planName });
    
    if (!user) {
      console.log('❌ No user found, showing login error');
      toast.error('Please log in to upgrade your plan');
      return;
    }

    console.log('✅ User found:', { userId: user.id, email: user.email });
    setUpgrading(planName);
    
    try {
      console.log('📡 Getting Supabase session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log('Session debug:', { 
        session: !!session, 
        sessionError, 
        accessToken: !!session?.access_token,
        sessionDetails: session ? {
          userId: session.user?.id,
          email: session.user?.email,
          tokenLength: session.access_token?.length
        } : null
      });
      
      if (sessionError || !session?.access_token) {
        console.error('❌ Authentication error:', sessionError);
        toast.error('Authentication error. Please refresh and try again.');
        setUpgrading(null);
        return;
      }
      
      console.log('✅ Session valid, making API request...');
      
      const payload = {
        priceId,
        successUrl: `${window.location.origin}/dashboard?success=true`,
        cancelUrl: window.location.href,
      };
      
      console.log('📦 Request payload:', payload);
      console.log('🔑 Authorization token length:', session.access_token.length);
      
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      console.log('📡 API Response status:', response.status);
      console.log('📡 API Response headers:', Object.fromEntries(response.headers.entries()));
      
      const data = await response.json();
      
      console.log('📦 Checkout response data:', data);
      
      if (!response.ok) {
        console.error('❌ API request failed:', { status: response.status, data });
        throw new Error(data.error || `HTTP ${response.status}: Failed to create checkout session`);
      }
      
      if (data.sessionUrl) {
        console.log('🎯 Redirecting to Stripe checkout:', data.sessionUrl);
        toast.success('Redirecting to payment...');
        window.location.href = data.sessionUrl;
      } else {
        console.error('❌ No checkout URL in response:', data);
        throw new Error('No checkout URL received from server');
      }
    } catch (error) {
      console.error('❌ Upgrade error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start upgrade process');
    } finally {
      setUpgrading(null);
    }
  }

  async function handleManageBilling() {
    if (!user) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/stripe/portal', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Failed to create portal session');
      }
    } catch (error) {
      console.error('Portal error:', error);
      toast.error('Failed to access billing portal');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const currentTier = userData?.subscription_tier || 'free';
  const usagePercentage = userData ? (userData.monthly_prompts_used / userData.monthly_limit) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Navigation */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Unlock the full potential of AI-powered prompt generation with our flexible pricing plans
          </p>
        </div>

        {/* Current Usage */}
        {userData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8 max-w-2xl mx-auto"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Usage</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Monthly Prompts</span>
                  <span>{userData.monthly_prompts_used} / {userData.monthly_limit === 999999 ? '∞' : userData.monthly_limit}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${usagePercentage > 80 ? 'bg-red-500' : 'bg-indigo-600'}`}
                    style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                  />
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm font-medium text-gray-900">Current Plan: </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 capitalize">
                    {currentTier}
                  </span>
                </div>
                {currentTier !== 'free' && (
                  <button
                    onClick={handleManageBilling}
                    className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
                  >
                    Manage Billing
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {pricingTiers.map((tier, index) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative bg-white rounded-xl shadow-sm border-2 ${
                tier.popular
                  ? 'border-indigo-500 shadow-indigo-100'
                  : currentTier === tier.id
                  ? 'border-green-500 shadow-green-100'
                  : 'border-gray-200'
              } p-8 hover:shadow-lg transition-all duration-200`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="inline-flex items-center px-4 py-1 rounded-full text-sm font-medium bg-indigo-500 text-white">
                    Most Popular
                  </span>
                </div>
              )}
              
              {currentTier === tier.id && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="inline-flex items-center px-4 py-1 rounded-full text-sm font-medium bg-green-500 text-white">
                    Current Plan
                  </span>
                </div>
              )}

              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{tier.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">${tier.price}</span>
                  {tier.price > 0 && <span className="text-gray-600">/month</span>}
                </div>
                <p className="text-gray-600 mb-8">{tier.description}</p>
              </div>

              <ul className="space-y-4 mb-8">
                {tier.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {currentTier === tier.id ? (
                <div className="text-center">
                  <div className="inline-flex items-center px-6 py-3 rounded-lg text-green-700 bg-green-100 font-medium">
                    Current Plan
                  </div>
                </div>
              ) : tier.id === 'free' ? (
                currentTier !== 'free' ? (
                  <div className="text-center">
                    <div className="inline-flex items-center px-6 py-3 rounded-lg text-gray-500 bg-gray-100 font-medium">
                      Downgrade via Billing Portal
                    </div>
                  </div>
                ) : null
              ) : (
                <button
                  onClick={() => handleUpgrade(tier.priceId!, tier.name)}
                  disabled={upgrading === tier.name}
                  className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-200 ${
                    tier.popular
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-xl'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {upgrading === tier.name ? 'Processing...' : `Upgrade to ${tier.name}`}
                </button>
              )}
            </motion.div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mt-16">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                Can I cancel my subscription at any time?
              </h3>
              <p className="text-gray-600">
                Yes, you can cancel your subscription at any time through the billing portal. 
                You'll continue to have access to your plan features until the end of your billing period.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                What happens if I exceed my monthly limit?
              </h3>
              <p className="text-gray-600">
                If you reach your monthly prompt limit, you'll be prompted to upgrade to a higher tier. 
                Your existing prompts and data will remain safe and accessible.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                Is there a free trial for paid plans?
              </h3>
              <p className="text-gray-600">
                You can start with our free plan to try Prompt Studio. All paid subscriptions are billed monthly 
                with no long-term commitment required.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}