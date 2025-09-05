'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface SubscriptionGuardProps {
  children: React.ReactNode;
  requiredTier?: 'pro' | 'enterprise';
  featureName?: string;
}

interface UsageData {
  subscription_tier: string;
  monthly_prompts_used: number;
  monthly_limit: number;
}

export default function SubscriptionGuard({
  children,
  requiredTier = 'pro',
  featureName = 'this feature'
}: SubscriptionGuardProps) {
  const [user, setUser] = useState<any>(null);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAccess();
  }, []);

  async function checkAccess() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        await getUserUsageData(user.id);
      }
    } catch (error) {
      console.error('Error checking access:', error);
    } finally {
      setLoading(false);
    }
  }

  async function getUserUsageData(userId: string) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', userId)
        .single();

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

        setUsageData({
          subscription_tier: profile.subscription_tier || 'free',
          monthly_prompts_used: usage?.monthly_prompts_used || 0,
          monthly_limit: limits[profile.subscription_tier as keyof typeof limits] || 5
        });
      }
    } catch (error) {
      console.error('Error getting usage data:', error);
    }
  }

  const hasAccess = () => {
    if (!usageData) return false;
    
    const tierHierarchy = {
      free: 0,
      pro: 1,
      enterprise: 2
    };

    const userTierLevel = tierHierarchy[usageData.subscription_tier as keyof typeof tierHierarchy] || 0;
    const requiredTierLevel = tierHierarchy[requiredTier];

    return userTierLevel >= requiredTierLevel;
  };

  const hasUsageRemaining = () => {
    if (!usageData) return false;
    return usageData.monthly_prompts_used < usageData.monthly_limit;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center p-8 bg-yellow-50 rounded-lg border border-yellow-200">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">
          Authentication Required
        </h3>
        <p className="text-yellow-700 mb-4">
          Please log in to access {featureName}.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 transition-colors"
        >
          Log In
        </button>
      </div>
    );
  }

  if (!hasAccess()) {
    return (
      <div className="text-center p-8 bg-indigo-50 rounded-lg border border-indigo-200">
        <h3 className="text-lg font-semibold text-indigo-800 mb-2">
          Upgrade Required
        </h3>
        <p className="text-indigo-700 mb-4">
          {featureName} requires a {requiredTier} subscription or higher.
        </p>
        <button
          onClick={() => router.push('/billing')}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
        >
          Upgrade to {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)}
        </button>
      </div>
    );
  }

  if (!hasUsageRemaining()) {
    return (
      <div className="text-center p-8 bg-red-50 rounded-lg border border-red-200">
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          Usage Limit Reached
        </h3>
        <p className="text-red-700 mb-4">
          You've used all {usageData!.monthly_limit} prompts this month. 
          Upgrade to continue using {featureName}.
        </p>
        <button
          onClick={() => router.push('/billing')}
          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
        >
          Upgrade Plan
        </button>
      </div>
    );
  }

  return <>{children}</>;
}