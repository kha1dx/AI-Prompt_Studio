import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Initialize Stripe SDK
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(request: NextRequest) {
  try {
    console.log('=== Stripe Checkout API Called ===');
    
    // Check environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('Missing STRIPE_SECRET_KEY environment variable');
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }
    
    const { priceId, successUrl, cancelUrl } = await request.json();
    console.log('Request data:', { priceId, successUrl, cancelUrl });
    
    // Validate required fields
    if (!priceId) {
      return NextResponse.json({ error: 'Price ID is required' }, { status: 400 });
    }

    // Get user from session
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const authHeader = request.headers.get('authorization');
    
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    console.log('User authentication:', { user: !!user, authError });
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return NextResponse.json({ error: 'Invalid authentication', details: authError?.message }, { status: 401 });
    }

    // Get user profile to check for existing Stripe customer
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email, full_name')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    let customerId = profile.stripe_customer_id;
    
    // Create Stripe customer if doesn't exist
    if (!customerId) {
      console.log('Creating new Stripe customer for user:', user.id);
      
      try {
        const customer = await stripe.customers.create({
          email: profile.email,
          name: profile.full_name || undefined,
          metadata: {
            user_id: user.id,
          },
        });
        
        console.log('Stripe customer created:', customer.id);
        customerId = customer.id;

        // Update profile with Stripe customer ID
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', user.id);

        if (updateError) {
          console.error('Failed to update profile with customer ID:', updateError);
          return NextResponse.json({ error: 'Failed to save customer information' }, { status: 500 });
        }
      } catch (error) {
        console.error('Failed to create Stripe customer:', error);
        return NextResponse.json({ 
          error: 'Failed to create customer', 
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
      }
    }

    // Create checkout session
    console.log('Creating Stripe checkout session for customer:', customerId);
    
    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
        metadata: {
          user_id: user.id,
        },
      });

      console.log('Stripe checkout session created:', session.id);
      return NextResponse.json({ sessionUrl: session.url });
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      return NextResponse.json({ 
        error: 'Failed to create checkout session', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}