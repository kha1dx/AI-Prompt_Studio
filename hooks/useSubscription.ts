'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface SubscriptionData {
  subscription_tier: string;
  monthly_prompts_used: number;
  monthly_limit: number;
  stripe_customer_id?: string;
}

export function useSubscription() {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setSubscriptionData(null);
        return;
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_tier, stripe_customer_id')
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      // Get usage data
      const { data: usage, error: usageError } = await supabase
        .from('usage_limits')
        .select('monthly_prompts_used')
        .eq('user_id', user.id)
        .single();

      if (usageError && usageError.code !== 'PGRST116') {
        throw usageError;
      }

      const limits = {
        free: 5,
        pro: 100,
        enterprise: 999999
      };

      const tier = profile?.subscription_tier || 'free';
      
      setSubscriptionData({
        subscription_tier: tier,
        monthly_prompts_used: usage?.monthly_prompts_used || 0,
        monthly_limit: limits[tier as keyof typeof limits] || 5,
        stripe_customer_id: profile?.stripe_customer_id
      });

    } catch (error) {
      console.error('Error fetching subscription data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch subscription data');
    } finally {
      setLoading(false);
    }
  };

  const canUseFeature = (requiredTier: 'pro' | 'enterprise' = 'pro') => {
    if (!subscriptionData) return false;

    const tierHierarchy = {
      free: 0,
      pro: 1,
      enterprise: 2
    };

    const userTierLevel = tierHierarchy[subscriptionData.subscription_tier as keyof typeof tierHierarchy] || 0;
    const requiredTierLevel = tierHierarchy[requiredTier];

    return userTierLevel >= requiredTierLevel;
  };

  const hasUsageRemaining = () => {
    if (!subscriptionData) return false;
    return subscriptionData.monthly_prompts_used < subscriptionData.monthly_limit;
  };

  const incrementUsage = async () => {
    if (!subscriptionData) return false;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Check if usage limit would be exceeded
      if (subscriptionData.monthly_prompts_used >= subscriptionData.monthly_limit) {
        return false;
      }

      const newUsage = subscriptionData.monthly_prompts_used + 1;

      const { error } = await supabase
        .from('usage_limits')
        .upsert({
          user_id: user.id,
          monthly_prompts_used: newUsage,
          last_reset_date: new Date().toISOString().split('T')[0]
        });

      if (error) {
        console.error('Error updating usage:', error);
        return false;
      }

      // Update local state
      setSubscriptionData(prev => prev ? {
        ...prev,
        monthly_prompts_used: newUsage
      } : null);

      return true;
    } catch (error) {
      console.error('Error incrementing usage:', error);
      return false;
    }
  };

  const getUsagePercentage = () => {
    if (!subscriptionData) return 0;
    return (subscriptionData.monthly_prompts_used / subscriptionData.monthly_limit) * 100;
  };

  const getRemainingPrompts = () => {
    if (!subscriptionData) return 0;
    return Math.max(0, subscriptionData.monthly_limit - subscriptionData.monthly_prompts_used);
  };

  return {
    subscriptionData,
    loading,
    error,
    canUseFeature,
    hasUsageRemaining,
    incrementUsage,
    getUsagePercentage,
    getRemainingPrompts,
    refresh: fetchSubscriptionData
  };
}