import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get usage data
    const { data: usage, error: usageError } = await supabase
      .from('usage_limits')
      .select('monthly_prompts_used, last_reset_date')
      .eq('user_id', user.id)
      .single();

    const limits = {
      free: 5,
      pro: 100,
      enterprise: 999999
    };

    const tier = profile.subscription_tier || 'free';
    const monthlyLimit = limits[tier as keyof typeof limits] || 5;
    const promptsUsed = usage?.monthly_prompts_used || 0;

    // Check if we need to reset usage (new month)
    const lastResetDate = usage?.last_reset_date;
    const currentDate = new Date().toISOString().split('T')[0];
    const needsReset = !lastResetDate || new Date(lastResetDate).getMonth() !== new Date(currentDate).getMonth();

    let finalPromptsUsed = promptsUsed;

    if (needsReset) {
      // Reset usage for new month
      const { error: resetError } = await supabase
        .from('usage_limits')
        .upsert({
          user_id: user.id,
          monthly_prompts_used: 0,
          last_reset_date: currentDate
        });

      if (!resetError) {
        finalPromptsUsed = 0;
      }
    }

    return NextResponse.json({
      subscription_tier: tier,
      monthly_prompts_used: finalPromptsUsed,
      monthly_limit: monthlyLimit,
      prompts_remaining: Math.max(0, monthlyLimit - finalPromptsUsed),
      usage_percentage: (finalPromptsUsed / monthlyLimit) * 100,
      can_generate: finalPromptsUsed < monthlyLimit
    });

  } catch (error) {
    console.error('Usage check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    // Get current usage
    const usageResponse = await fetch(`${request.nextUrl.origin}/api/usage`, {
      headers: { 'Authorization': authHeader }
    });
    
    if (!usageResponse.ok) {
      return NextResponse.json({ error: 'Failed to check usage' }, { status: 500 });
    }

    const usageData = await usageResponse.json();

    // Check if user can generate more prompts
    if (!usageData.can_generate) {
      return NextResponse.json({ 
        error: 'Usage limit reached',
        needs_upgrade: true,
        current_tier: usageData.subscription_tier
      }, { status: 429 });
    }

    // Increment usage
    const newUsage = usageData.monthly_prompts_used + 1;
    
    const { error: updateError } = await supabase
      .from('usage_limits')
      .upsert({
        user_id: user.id,
        monthly_prompts_used: newUsage,
        last_reset_date: new Date().toISOString().split('T')[0]
      });

    if (updateError) {
      console.error('Failed to update usage:', updateError);
      return NextResponse.json({ error: 'Failed to update usage' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      monthly_prompts_used: newUsage,
      prompts_remaining: Math.max(0, usageData.monthly_limit - newUsage),
      usage_percentage: (newUsage / usageData.monthly_limit) * 100
    });

  } catch (error) {
    console.error('Usage increment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}