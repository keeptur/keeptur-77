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

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const fallbackStripeSecret = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

  try {
    if (!serviceKey && !fallbackStripeSecret) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or STRIPE_SECRET_KEY");

    const supabase = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const supabaseService = createClient(supabaseUrl, serviceKey || anonKey, { auth: { persistSession: false } });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No Authorization header provided");
    const token = authHeader.replace("Bearer ", "");

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User email not available");

    const { quantity = 1 } = (await req.json().catch(() => ({}))) as { quantity?: number };

    // Load dynamic settings (price, currency, trial days)
    const { data: appSettings } = await supabaseService
      .from("settings")
      .select("price_per_seat_cents, currency, trial_days")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const stripeSecret = fallbackStripeSecret;
    if (!stripeSecret) throw new Error("Stripe secret key not configured in environment variables");

    const priceCents = Math.max(0, Number(appSettings?.price_per_seat_cents ?? 3990));
    const currency = (appSettings?.currency || "BRL").toLowerCase();
    const trialDays = Math.max(0, Number(appSettings?.trial_days ?? 7));

    const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });

    // Reuse customer if exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined = customers.data[0]?.id;

    if (!customerId) {
      const created = await stripe.customers.create({ email: user.email, name: user.user_metadata?.name });
      customerId = created.id;
    }

    const origin = req.headers.get("origin") || Deno.env.get("SITE_URL") || "https://keeptur.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency,
            product_data: { name: "Keeptur Assinatura por usuário" },
            unit_amount: priceCents,
            recurring: { interval: "month" },
          },
          quantity: Math.max(1, Number(quantity || 1)),
        },
      ],
      allow_promotion_codes: true,
      success_url: `${origin}/`,
      cancel_url: `${origin}/`,
      subscription_data: {
        trial_period_days: trialDays,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
