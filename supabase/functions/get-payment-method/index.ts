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

    // Get customer ID from subscriber
    const { data: subscriber } = await supabase
      .from("subscribers")
      .select("stripe_customer_id")
      .eq("email", user.email)
      .maybeSingle();

    if (!subscriber?.stripe_customer_id) {
      return new Response(JSON.stringify({ payment_method: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get payment methods from Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: subscriber.stripe_customer_id,
      type: 'card',
    });

    if (paymentMethods.data.length === 0) {
      return new Response(JSON.stringify({ payment_method: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const primaryMethod = paymentMethods.data[0];
    const card = primaryMethod.card;

    const paymentMethod = {
      id: primaryMethod.id,
      brand: card?.brand || 'unknown',
      last4: card?.last4 || '0000',
      exp_month: card?.exp_month || 12,
      exp_year: card?.exp_year || 2024,
      created: primaryMethod.created
    };

    return new Response(JSON.stringify({ payment_method: paymentMethod }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in get-payment-method:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});