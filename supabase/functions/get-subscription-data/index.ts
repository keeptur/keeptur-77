import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
    
    if (!serviceKey || !stripeSecret) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No Authorization header provided");
    const token = authHeader.replace("Bearer ", "");

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User email not available");

    // Get subscriber data
    const { data: subscriber } = await supabase
      .from("subscribers")
      .select("*")
      .eq("email", user.email)
      .maybeSingle();

    if (!subscriber) {
      return new Response(JSON.stringify({
        subscribed: false,
        trial_active: false,
        current_plan: null,
        days_remaining: 0,
        next_billing_date: null,
        auto_renewal: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const now = new Date();
    const trialEnd = subscriber.trial_end ? new Date(subscriber.trial_end) : null;
    const subscriptionEnd = subscriber.subscription_end ? new Date(subscriber.subscription_end) : null;
    
    const trialActive = trialEnd && trialEnd > now && !subscriber.subscribed;
    const daysRemaining = trialActive ? Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    let currentPlan = null;
    let autoRenewal = false;

    if (subscriber.subscribed && subscriber.subscription_tier) {
      // Get plan details
      const { data: planKit } = await supabase
        .from("plan_kits")
        .select("*")
        .eq("name", subscriber.subscription_tier)
        .eq("active", true)
        .maybeSingle();

      if (planKit) {
        currentPlan = {
          name: planKit.name,
          price_cents: planKit.price_cents,
          currency: planKit.currency,
          seats: planKit.seats,
          features: planKit.features,
          billing_cycle: 'monthly' // Default, could be enhanced to detect from Stripe
        };
      }

      // Check auto-renewal status from Stripe
      if (subscriber.stripe_customer_id) {
        try {
          const subscriptions = await stripe.subscriptions.list({
            customer: subscriber.stripe_customer_id,
            status: "active",
            limit: 1,
          });
          
          if (subscriptions.data.length > 0) {
            autoRenewal = !subscriptions.data[0].cancel_at_period_end;
          }
        } catch (error) {
          console.error("Error fetching Stripe subscription:", error);
        }
      }
    }

    return new Response(JSON.stringify({
      subscribed: subscriber.subscribed,
      subscription_tier: subscriber.subscription_tier,
      subscription_end: subscriber.subscription_end,
      trial_active: trialActive,
      trial_end: subscriber.trial_end,
      days_remaining: daysRemaining,
      current_plan: currentPlan,
      next_billing_date: subscriptionEnd?.toISOString(),
      auto_renewal: autoRenewal,
      stripe_customer_id: subscriber.stripe_customer_id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in get-subscription-data:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});