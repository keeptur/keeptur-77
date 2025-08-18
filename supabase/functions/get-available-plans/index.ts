import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    
    if (!serviceKey) {
      throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No Authorization header provided");
    const token = authHeader.replace("Bearer ", "");

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User email not available");

    // Get current subscriber info
    const { data: subscriber } = await supabase
      .from("subscribers")
      .select("subscription_tier")
      .eq("email", user.email)
      .maybeSingle();

    // Get all active plans
    const { data: plans, error: plansError } = await supabase
      .from("plan_kits")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true });

    if (plansError) throw plansError;

    // Get plan settings for discount calculation
    const { data: planSettings } = await supabase
      .from("plan_settings")
      .select("annual_discount")
      .limit(1)
      .maybeSingle();

    const annualDiscount = planSettings?.annual_discount || 20;

    const availablePlans = plans?.map(plan => {
      const yearlyPriceCents = Math.round(plan.price_cents * 12 * (1 - annualDiscount / 100));
      const isCurrent = subscriber?.subscription_tier === plan.name;
      
      return {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        price_cents: plan.price_cents,
        yearly_price_cents: yearlyPriceCents,
        currency: plan.currency,
        seats: plan.seats,
        features: plan.features || [],
        stripe_price_id_monthly: plan.stripe_price_id_monthly,
        stripe_price_id_yearly: plan.stripe_price_id_yearly,
        is_current: isCurrent,
        is_upgrade: !isCurrent && plan.price_cents > (subscriber?.subscription_tier ? 
          plans?.find(p => p.name === subscriber.subscription_tier)?.price_cents || 0 : 0),
        sort_order: plan.sort_order
      };
    }) || [];

    return new Response(JSON.stringify({ 
      available_plans: availablePlans,
      annual_discount: annualDiscount 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in get-available-plans:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});