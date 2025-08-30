import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started, checking environment variables");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    logStep("Attempting to authenticate user");
    
    const authHeader = req.headers.get("Authorization");
    let user = null;
    
    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
        if (!userError && userData.user) {
          user = userData.user;
        }
      } catch (authErr) {
        logStep("Auth warning (continuing without Supabase auth)", { error: authErr.message });
      }
    }

    const { plan_id, is_annual = false, user_emails = [], monde_token } = await req.json();
    
    if (!plan_id) {
      throw new Error("plan_id is required");
    }

    logStep("Request data", { plan_id, is_annual, user_emails_count: user_emails.length });

    // Validate Monde emails
    const mondeEmailRegex = /^[^@]+@([a-z0-9-]+\.)*monde\.com\.br$/i;
    for (const email of user_emails) {
      if (!mondeEmailRegex.test(email)) {
        throw new Error(`E-mail inválido: ${email}. Use apenas emails @*.monde.com.br`);
      }
    }

    // Get plan details
    const { data: planData, error: planError } = await supabaseClient
      .from("plan_kits")
      .select("*")
      .eq("id", plan_id)
      .eq("active", true)
      .single();

    if (planError || !planData) {
      throw new Error("Plan not found or inactive");
    }

    logStep("Plan found", { 
      name: planData.name, 
      seats: planData.seats,
      price_monthly: planData.price_cents,
      price_yearly: planData.yearly_price_cents || planData.price_cents * 12
    });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Determine customer email (priority: user.email > monde token > user_emails[0])
    let customerEmail = user?.email;
    if (!customerEmail && monde_token) {
      try {
        const payload = JSON.parse(atob(monde_token.split('.')[1]));
        customerEmail = payload.email;
      } catch (e) {
        logStep("Failed to decode monde_token", { error: e.message });
      }
    }
    if (!customerEmail && user_emails.length > 0) {
      customerEmail = user_emails[0];
    }
    if (!customerEmail) {
      throw new Error("No customer email available");
    }

    logStep("Customer email determined", { email: customerEmail });

    // Check for existing customer
    const existingCustomers = await stripe.customers.list({
      email: customerEmail,
      limit: 1
    });

    let customerId = null;
    let hasActiveSubscription = false;
    let currentSubscription = null;

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
      
      // Check for active subscriptions
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1
      });

      if (subscriptions.data.length > 0) {
        hasActiveSubscription = true;
        currentSubscription = subscriptions.data[0];
      }
    }

    logStep("Customer status", { 
      customerId, 
      hasActiveSubscription,
      currentSubscriptionId: currentSubscription?.id 
    });

    // Determine pricing
    const unitAmount = is_annual 
      ? (planData.yearly_price_cents || planData.price_cents * 12)
      : planData.price_cents;

    // Check if it's an upgrade (has current subscription with different plan)
    let isUpgrade = false;
    let proratedAmount = unitAmount;

    if (hasActiveSubscription && currentSubscription) {
      // This is an upgrade - calculate prorated amount
      isUpgrade = true;
      
      // Get current subscription's price info
      const currentPrice = currentSubscription.items.data[0]?.price;
      if (currentPrice) {
        const currentAmount = currentPrice.unit_amount || 0;
        const periodEnd = currentSubscription.current_period_end;
        const periodStart = currentSubscription.current_period_start;
        const now = Math.floor(Date.now() / 1000);
        
        // Calculate unused portion of current subscription
        const totalPeriod = periodEnd - periodStart;
        const remainingPeriod = periodEnd - now;
        const unusedCredit = Math.max(0, (currentAmount * remainingPeriod) / totalPeriod);
        
        // New amount minus unused credit
        proratedAmount = Math.max(100, unitAmount - Math.floor(unusedCredit)); // Minimum 1.00
        
        logStep("Upgrade calculation", {
          currentAmount,
          newAmount: unitAmount,
          unusedCredit: Math.floor(unusedCredit),
          proratedAmount
        });
      }
    }

    // Create checkout session
    const sessionConfig: any = {
      customer: customerId || undefined,
      customer_email: customerId ? undefined : customerEmail,
      line_items: [
        {
          price_data: {
            currency: planData.currency.toLowerCase(),
            product_data: {
              name: `${planData.name} - ${planData.seats} usuários`,
              description: `Plano ${is_annual ? 'anual' : 'mensal'} para ${planData.seats} usuários`,
            },
            unit_amount: isUpgrade ? proratedAmount : unitAmount,
            recurring: is_annual 
              ? { interval: "year" } 
              : { interval: "month" }
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/plans?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/plans`,
      metadata: {
        plan_id: plan_id,
        plan_name: planData.name,
        seats: planData.seats.toString(),
        is_annual: is_annual.toString(),
        is_upgrade: isUpgrade.toString(),
        user_emails: user_emails.join(','),
        monde_token: monde_token || '',
        customer_email: customerEmail,
      },
      subscription_data: {
        metadata: {
          plan_id: plan_id,
          plan_name: planData.name,
          seats: planData.seats.toString(),
          user_emails: user_emails.join(','),
          customer_email: customerEmail,
        }
      }
    };

    // Handle upgrades differently
    if (isUpgrade && currentSubscription) {
      // For upgrades, we'll handle this in the webhook/verification
      // For now, create a regular checkout with proration info
      sessionConfig.subscription_data.proration_behavior = 'always_invoice';
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    logStep("Checkout session created", { 
      sessionId: session.id, 
      amount: isUpgrade ? proratedAmount : unitAmount,
      isUpgrade 
    });

    return new Response(JSON.stringify({ 
      url: session.url,
      session_id: session.id,
      is_upgrade: isUpgrade,
      original_amount: unitAmount,
      prorated_amount: isUpgrade ? proratedAmount : unitAmount
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { error: errorMessage });
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: error instanceof Error ? error.stack : undefined
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});