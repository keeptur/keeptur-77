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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const fallbackStripeSecret = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

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

    const { data: appSettings } = await supabaseService
      .from("settings")
      .select("stripe_secret_key")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const stripeSecret = appSettings?.stripe_secret_key || fallbackStripeSecret;

    if (!stripeSecret) throw new Error("Missing STRIPE_SECRET_KEY");

    const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });

    let customerId: string | undefined;
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length > 0) customerId = customers.data[0].id;
    if (!customerId) {
      const created = await stripe.customers.create({ email: user.email, name: user.user_metadata?.name });
      customerId = created.id;
    }

    const origin = req.headers.get("origin") || Deno.env.get("SITE_URL") || "https://keeptur.lovable.app";

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId!,
      return_url: `${origin}/`,
    });

    return new Response(JSON.stringify({ url: portal.url }), {
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
