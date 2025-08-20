
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

    if (!supabaseUrl || !anonKey) throw new Error("Missing Supabase envs");

    // Clients
    const supabaseService = createClient(supabaseUrl, serviceKey || anonKey, { auth: { persistSession: false } });
    const supabaseAnon = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

    // Require a valid user token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No Authorization header provided" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);
    if (userError || !userData.user?.email) {
      return new Response(JSON.stringify({ error: "Auth error: invalid claim: missing sub claim" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    const user = userData.user;

    // Load dynamic Stripe key from settings (fallback to secret)
    const { data: appSettings } = await supabaseService
      .from("settings")
      .select("stripe_secret_key")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const stripeSecret = appSettings?.stripe_secret_key || fallbackStripeSecret;
    if (!stripeSecret) throw new Error("Missing STRIPE_SECRET_KEY");

    const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });

    // Find Stripe customer by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      log("No customer found; marking unsubscribed");
      // Upsert subscriber as unsubscribed (do not override trial fields)
      const { data: existing } = await supabaseService
        .from("subscribers")
        .select("id")
        .eq("email", user.email)
        .maybeSingle();

      if (existing?.id) {
        await supabaseService
          .from("subscribers")
          .update({
            subscribed: false,
            subscription_tier: null,
            stripe_customer_id: null,
            stripe_subscription_id: null,
            subscription_end: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabaseService.from("subscribers").insert({
          email: user.email,
          user_id: user.id,
          subscribed: false,
          subscription_tier: null,
          stripe_customer_id: null,
          stripe_subscription_id: null,
          subscription_end: null,
          updated_at: new Date().toISOString(),
        });
      }

      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customer = customers.data[0];

    // Determine active subscription / tier
    const subscriptions = await stripe.subscriptions.list({ customer: customer.id, status: "active", limit: 1 });
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
      if (amount <= 999) tier = "Basic";
      else if (amount <= 1999) tier = "Premium";
      else tier = "Enterprise";
    }

    // Upsert into subscribers (do not overwrite trial_start/trial_end)
    const { data: existing } = await supabaseService
      .from("subscribers")
      .select("id")
      .eq("email", user.email)
      .maybeSingle();

    const payload = {
      email: user.email,
      user_id: user.id,
      stripe_customer_id: customer.id,
      stripe_subscription_id: subId,
      subscribed: hasActive,
      subscription_tier: tier,
      subscription_end: endIso,
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      await supabaseService.from("subscribers").update(payload).eq("id", existing.id);
    } else {
      await supabaseService.from("subscribers").insert(payload);
    }

    return new Response(
      JSON.stringify({
        subscribed: hasActive,
        subscription_tier: tier,
        subscription_end: endIso,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    log("ERROR", error?.message || String(error));
    return new Response(JSON.stringify({ error: error.message || String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
