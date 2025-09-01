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

// Try to resolve user email from Authorization header, or fallback to body/Monde token
let email: string | null = null;
const authHeader = req.headers.get("Authorization");
if (authHeader) {
  const token = authHeader.replace("Bearer ", "");
  const { data: userData } = await supabase.auth.getUser(token);
  email = userData.user?.email ?? null;
}

if (!email) {
  const body = await req.json().catch(() => ({}));
  const mondeToken: string | undefined = body?.mondeToken;
  const emailBody: string | undefined = body?.email;
  if (emailBody) email = emailBody;
  if (!email && mondeToken) {
    const decode = (t: string) => {
      try { return JSON.parse(atob(t.split(".")[1])); } catch { return null; }
    };
    const payload: any = decode(mondeToken);
    const uid: string | undefined = payload?.uid;
    if (payload?.email) email = String(payload.email);
    if (!email && uid) {
      try {
        const res = await fetch(`https://web.monde.com.br/api/v2/people/${uid}`, {
          headers: {
            Accept: "application/vnd.api+json",
            "Content-Type": "application/vnd.api+json",
            Authorization: `Bearer ${mondeToken}`,
          },
        });
        if (res.ok) {
          const j = await res.json();
          const attrEmail = j?.data?.attributes?.email;
          if (attrEmail) email = String(attrEmail);
        }
      } catch (_) {}
    }
  }
}

if (!email) {
  // No email available; return default unsubscribed/trial state gracefully
  return new Response(JSON.stringify({
    subscribed: false,
    subscription_tier: null,
    subscription_end: null,
    trial_active: false,
    trial_end: null,
    days_remaining: 0,
    current_plan: null,
    next_billing_date: null,
    auto_renewal: false,
    stripe_customer_id: null
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
}

// Get subscriber data by email or user_email
    const { data: subscriber } = await supabase
      .from("subscribers")
      .select("*")
      .or(`email.eq.${email},user_email.eq.${email}`)
      .maybeSingle();

    if (!subscriber) {
      // No subscriber row yet: expose default trial window based on settings
      const { data: appSettings } = await supabase
        .from("plan_settings")
        .select("trial_days")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const trialDays = Math.max(0, Number(appSettings?.trial_days ?? 14));
      const trialEndCalc = new Date();
      trialEndCalc.setDate(trialEndCalc.getDate() + trialDays);

      return new Response(JSON.stringify({
        subscribed: false,
        trial_active: trialDays > 0,
        trial_end: trialEndCalc.toISOString(),
        days_remaining: trialDays,
        current_plan: null,
        next_billing_date: null,
        auto_renewal: false,
        subscription_tier: null,
        subscription_end: null,
        stripe_customer_id: null,
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

    // Get plan users (subscribers with same stripe_customer_id)
    let planUsers: string[] = [];
    if (subscriber.stripe_customer_id) {
      const { data: planSubscribers } = await supabase
        .from("subscribers")
        .select("user_email, email")
        .eq("stripe_customer_id", subscriber.stripe_customer_id)
        .eq("subscribed", true);
      
      if (planSubscribers) {
        planUsers = planSubscribers.map(s => s.user_email || s.email).filter(Boolean);
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
      stripe_customer_id: subscriber.stripe_customer_id || null,
      plan_users: planUsers
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