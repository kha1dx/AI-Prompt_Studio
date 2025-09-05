'use client'

interface UsageMeterProps {
  used: number
  limit: number
  tier: 'free' | 'pro' | 'enterprise'
  className?: string
}

export default function UsageMeter({ used, limit, tier, className = '' }: UsageMeterProps) {
  const percentage = limit === -1 ? 0 : Math.min((used / limit) * 100, 100)
  const isNearLimit = percentage >= 80
  const isAtLimit = percentage >= 100

  const getTierInfo = () => {
    switch (tier) {
      case 'free':
        return {
          name: 'Free',
          color: 'bg-gray-500'
        }
      case 'pro':
        return {
          name: 'Pro',
          color: 'bg-blue-500'
        }
      case 'enterprise':
        return {
          name: 'Enterprise',
          color: 'bg-purple-500'
        }
      default:
        return {
          name: 'Free',
          color: 'bg-gray-500'
        }
    }
  }

  const tierInfo = getTierInfo()

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${tierInfo.color}`} />
          <span className="text-sm font-medium text-gray-700">{tierInfo.name} Plan</span>
        </div>
        <div className=\"text-sm text-gray-600\">
          {limit === -1 ? (
            <span className=\"text-green-600 font-medium\">Unlimited</span>
          ) : (
            <span className={isAtLimit ? 'text-red-600 font-medium' : 'text-gray-600'}>
              {used} / {limit}
            </span>
          )}
        </div>
      </div>

      {limit !== -1 && (
        <div>
          <div className=\"w-full bg-gray-200 rounded-full h-2 mb-2\">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                isAtLimit 
                  ? 'bg-red-500' 
                  : isNearLimit 
                  ? 'bg-yellow-500' 
                  : 'bg-green-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          
          <div className=\"flex justify-between text-xs text-gray-500\">
            <span>Monthly usage</span>
            <span>{percentage.toFixed(1)}% used</span>
          </div>

          {isAtLimit && (
            <div className=\"mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800\">
              <strong>Limit reached!</strong> Upgrade to continue generating prompts.
            </div>
          )}

          {isNearLimit && !isAtLimit && (
            <div className=\"mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800\">
              <strong>Nearly at limit.</strong> Consider upgrading for unlimited access.
            </div>
          )}
        </div>
      )}

      {limit === -1 && (
        <div className=\"text-xs text-green-600 bg-green-50 border border-green-200 rounded p-2\">
          ✨ Enjoying unlimited prompt generation
        </div>
      )}
    </div>
  )
}