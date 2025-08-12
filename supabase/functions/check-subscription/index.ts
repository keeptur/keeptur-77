import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: any) => {
  console.log(`[check-subscription] ${step}`, details ?? "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const fallbackStripeSecret = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

    const supabaseService = createClient(supabaseUrl, serviceKey || anonKey, { auth: { persistSession: false } });
    const supabaseAnon = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No Authorization header provided");
    const token = authHeader.replace("Bearer ", "");

    const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User email not available");

    // Load dynamic Stripe key
    const { data: appSettings } = await supabaseService
      .from('settings')
      .select('stripe_secret_key')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    const stripeSecret = appSettings?.stripe_secret_key || fallbackStripeSecret;
    if (!stripeSecret) throw new Error("Missing STRIPE_SECRET_KEY");

    const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      log("No customer found; marking unsubscribed");
      await supabaseService.from('accounts').upsert({
        email: user.email,
        owner_user_id: user.id,
        subscribed: false,
        subscription_tier: null,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' });
      return new Response(JSON.stringify({ subscribed: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    const customer = customers.data[0];

    const subscriptions = await stripe.subscriptions.list({ customer: customer.id, status: 'active', limit: 1 });
    const hasActive = subscriptions.data.length > 0;
    let tier: string | null = null;
    let subId: string | null = null;
    let endIso: string | null = null;

    if (hasActive) {
      const sub = subscriptions.data[0];
      subId = sub.id;
      endIso = new Date(sub.current_period_end * 1000).toISOString();
      const price = sub.items.data[0].price;
      const amount = price.unit_amount || 0;
      if (amount <= 999) tier = 'Basic';
      else if (amount <= 1999) tier = 'Premium';
      else tier = 'Enterprise';
    }

    await supabaseService.from('accounts').upsert({
      email: user.email,
      owner_user_id: user.id,
      stripe_customer_id: customer.id,
      stripe_subscription_id: subId,
      subscribed: hasActive,
      subscription_tier: tier,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email' });

    return new Response(JSON.stringify({
      subscribed: hasActive,
      subscription_tier: tier,
      subscription_end: endIso,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (error: any) {
    log("ERROR", error?.message || String(error));
    return new Response(JSON.stringify({ error: error.message || String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
