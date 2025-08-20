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
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

    console.log("Environment check:", {
      hasSupabaseUrl: !!supabaseUrl,
      hasAnonKey: !!anonKey,
      hasServiceKey: !!serviceKey,
      hasStripeSecret: !!stripeSecret
    });

    if (!serviceKey || !stripeSecret) {
      throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or STRIPE_SECRET_KEY");
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No Authorization header provided");
    const token = authHeader.replace("Bearer ", "");

    console.log("Authenticating user...");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) {
      console.error("Auth error:", userError);
      throw new Error(`Auth error: ${userError.message}`);
    }
    const user = userData.user;
    if (!user?.email) throw new Error("User email not available");

    console.log("User authenticated:", user.email);

    if (!stripeSecret) throw new Error("Stripe secret key not configured");

    const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });

    console.log("Looking for Stripe customer...");
    let customerId: string | undefined;
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("Found existing customer:", customerId);
    }
    
    if (!customerId) {
      console.log("Creating new customer...");
      const created = await stripe.customers.create({ 
        email: user.email, 
        name: user.user_metadata?.name || user.email
      });
      customerId = created.id;
      console.log("Created new customer:", customerId);
    }

    const origin = req.headers.get("origin") || Deno.env.get("SITE_URL") || "https://keeptur.lovable.app";
    console.log("Creating portal session with origin:", origin);

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId!,
      return_url: `${origin}/subscription`,
    });

    console.log("Portal session created successfully:", portal.id);

    return new Response(JSON.stringify({ url: portal.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Customer portal error:", error);
    const message = (error && (error as any).message) ? (error as any).message : String(error);
    const status = message.includes("No Authorization header") || message.toLowerCase().includes("auth error") ? 401 : 500;
    return new Response(JSON.stringify({ 
      error: message,
      details: (error as any)?.stack
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status
    });
  }
});
