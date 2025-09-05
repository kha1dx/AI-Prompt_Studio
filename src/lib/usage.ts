// Shared usage checking logic
export interface UsageData {
  subscription_tier: string
  monthly_prompts_used: number
  monthly_limit: number
  prompts_remaining: number
  usage_percentage: number
  can_generate: boolean
}

export async function checkUsage(supabase: any, userId: string): Promise<UsageData> {
  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .single()

  if (profileError) {
    throw new Error('Profile not found')
  }

  // Get usage data
  const { data: usage, error: usageError } = await supabase
    .from('usage_limits')
    .select('monthly_prompts_used, last_reset_date')
    .eq('user_id', userId)
    .single()

  const limits = {
    free: 5,
    pro: 100,
    enterprise: 999999
  }

  const tier = profile.subscription_tier || 'free'
  const monthlyLimit = limits[tier as keyof typeof limits] || 5
  const promptsUsed = usage?.monthly_prompts_used || 0

  // Check if we need to reset usage (new month)
  const lastResetDate = usage?.last_reset_date
  const currentDate = new Date().toISOString().split('T')[0]
  const needsReset = !lastResetDate || new Date(lastResetDate).getMonth() !== new Date(currentDate).getMonth()

  let finalPromptsUsed = promptsUsed

  if (needsReset) {
    // Reset usage for new month
    const { error: resetError } = await supabase
      .from('usage_limits')
      .upsert({
        user_id: userId,
        monthly_prompts_used: 0,
        last_reset_date: currentDate
      })

    if (!resetError) {
      finalPromptsUsed = 0
    }
  }

  return {
    subscription_tier: tier,
    monthly_prompts_used: finalPromptsUsed,
    monthly_limit: monthlyLimit,
    prompts_remaining: Math.max(0, monthlyLimit - finalPromptsUsed),
    usage_percentage: (finalPromptsUsed / monthlyLimit) * 100,
    can_generate: finalPromptsUsed < monthlyLimit
  }
}

export async function incrementUsage(supabase: any, userId: string): Promise<UsageData> {
  // Get current usage first
  const currentUsage = await checkUsage(supabase, userId)
  
  // Check if user can generate more prompts
  if (!currentUsage.can_generate) {
    throw new Error('Usage limit reached')
  }

  // Increment usage
  const newUsage = currentUsage.monthly_prompts_used + 1
  
  const { error: updateError } = await supabase
    .from('usage_limits')
    .upsert({
      user_id: userId,
      monthly_prompts_used: newUsage,
      last_reset_date: new Date().toISOString().split('T')[0]
    })

  if (updateError) {
    throw new Error('Failed to update usage')
  }

  return {
    ...currentUsage,
    monthly_prompts_used: newUsage,
    prompts_remaining: Math.max(0, currentUsage.monthly_limit - newUsage),
    usage_percentage: (newUsage / currentUsage.monthly_limit) * 100
  }
}