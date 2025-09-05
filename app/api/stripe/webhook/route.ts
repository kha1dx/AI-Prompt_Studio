import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Initialize Stripe SDK
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

// Helper function to construct Stripe event with signature verification
function constructStripeEvent(payload: string, signature: string): Stripe.Event | null {
  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    
    if (!signature) {
      return NextResponse.json({ error: 'No signature provided' }, { status: 400 });
    }

    // Verify webhook signature and construct event
    const event = constructStripeEvent(body, signature);
    if (!event) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('Processing Stripe webhook event:', event.type);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        
        if (!userId) {
          console.error('No user_id in checkout session metadata');
          break;
        }

        // Get subscription details
        const subscriptionId = session.subscription as string;
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);

          const priceId = subscription.items.data[0]?.price.id;
          let tier = 'free';
          
          // Map price ID to tier
          if (priceId === 'price_1S3nBfJzPNX2JWtFbJnOdjwp') {
            tier = 'pro';
          } else if (priceId === 'price_1S3nBgJzPNX2JWtFx0SrbxCX') {
            tier = 'enterprise';
          }

          // Update user profile
          await supabase
            .from('profiles')
            .update({
              subscription_tier: tier,
              stripe_customer_id: session.customer,
            })
            .eq('id', userId);

          // Reset usage limits for new billing period
          await supabase
            .from('usage_limits')
            .upsert({
              user_id: userId,
              monthly_prompts_used: 0,
              last_reset_date: new Date().toISOString().split('T')[0],
            });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        // Get user by customer ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile) {
          const priceId = subscription.items.data[0]?.price.id;
          let tier = 'free';
          
          // Map price ID to tier
          if (priceId === 'price_1S3nBfJzPNX2JWtFbJnOdjwp') {
            tier = 'pro';
          } else if (priceId === 'price_1S3nBgJzPNX2JWtFx0SrbxCX') {
            tier = 'enterprise';
          }

          await supabase
            .from('profiles')
            .update({ subscription_tier: tier })
            .eq('id', profile.id);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        // Get user by customer ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile) {
          // Downgrade to free tier
          await supabase
            .from('profiles')
            .update({ subscription_tier: 'free' })
            .eq('id', profile.id);

          // Update usage limits to free tier
          await supabase
            .from('usage_limits')
            .upsert({
              user_id: profile.id,
              monthly_prompts_used: 0,
              last_reset_date: new Date().toISOString().split('T')[0],
            });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        
        // Get user by customer ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile) {
          // Could implement grace period logic here
          console.log(`Payment failed for user ${profile.id}`);
          // Optionally send notification email
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}