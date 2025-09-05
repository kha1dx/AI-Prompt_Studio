'use client';

import { useEffect, useState } from 'react';
import { useSubscription } from '../hooks/useSubscription';
import { useRouter } from 'next/navigation';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function UsageIndicator() {
  const { subscriptionData, loading, getUsagePercentage, getRemainingPrompts } = useSubscription();
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);

  const usagePercentage = getUsagePercentage();
  const remainingPrompts = getRemainingPrompts();

  useEffect(() => {
    // Show warning when usage is above 80%
    setShowWarning(usagePercentage >= 80);
  }, [usagePercentage]);

  if (loading || !subscriptionData) {
    return null;
  }

  const isLimitReached = remainingPrompts === 0;
  const isNearLimit = usagePercentage >= 80;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Monthly Usage</span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 capitalize">
            {subscriptionData.subscription_tier}
          </span>
        </div>
        {(isNearLimit || isLimitReached) && (
          <ExclamationTriangleIcon className={`h-5 w-5 ${isLimitReached ? 'text-red-500' : 'text-yellow-500'}`} />
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>
            {subscriptionData.monthly_prompts_used} / {subscriptionData.monthly_limit === 999999 ? '∞' : subscriptionData.monthly_limit} prompts
          </span>
          <span>{remainingPrompts} remaining</span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              isLimitReached 
                ? 'bg-red-500' 
                : isNearLimit 
                ? 'bg-yellow-500' 
                : 'bg-indigo-600'
            }`}
            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
          />
        </div>

        {isLimitReached && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700 mb-2">
              You've reached your monthly limit. Upgrade to continue generating prompts.
            </p>
            <button
              onClick={() => router.push('/billing')}
              className="text-sm bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition-colors"
            >
              Upgrade Plan
            </button>
          </div>
        )}

        {isNearLimit && !isLimitReached && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-700 mb-2">
              You're running low on prompts. Consider upgrading to avoid interruptions.
            </p>
            <button
              onClick={() => router.push('/billing')}
              className="text-sm bg-yellow-600 text-white px-3 py-1 rounded-md hover:bg-yellow-700 transition-colors"
            >
              View Plans
            </button>
          </div>
        )}

        {subscriptionData.subscription_tier === 'free' && remainingPrompts > 0 && (
          <div className="mt-2 text-center">
            <button
              onClick={() => router.push('/billing')}
              className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
            >
              Upgrade for more prompts →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}