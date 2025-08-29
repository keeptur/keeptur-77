import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

    if (!serviceKey || !stripeSecret) {
      throw new Error("Missing required environment variables");
    }

    const supabaseService = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { session_id } = await req.json();
    if (!session_id) {
      throw new Error("session_id is required");
    }

    logStep("Verifying payment session", { session_id });

    const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });
    const session = await stripe.checkout.sessions.retrieve(session_id);

    logStep("Session retrieved", { 
      payment_status: session.payment_status,
      status: session.status,
      customer: session.customer 
    });

    const isPaid = session.payment_status === 'paid' || session.status === 'complete';
    const buyerEmail = session.metadata?.buyer_email;
    const usersData = session.metadata?.users ? JSON.parse(session.metadata.users) : [];
    const planName = session.metadata?.plan_name;
    const billingCycle = session.metadata?.billing_cycle;

    logStep("Payment verification result", { 
      isPaid, 
      buyerEmail, 
      usersCount: usersData.length,
      planName,
      billingCycle 
    });

    if (isPaid && usersData.length > 0) {
      // Ativar plano para todos os usuários especificados
      logStep("Activating plans for users", { userEmails: usersData.map((u: any) => u.email) });

      // Calcular data de expiração baseada no ciclo de cobrança
      const now = new Date();
      const subscriptionEnd = new Date(now);
      if (billingCycle === 'yearly') {
        subscriptionEnd.setFullYear(now.getFullYear() + 1);
      } else {
        subscriptionEnd.setMonth(now.getMonth() + 1);
      }

      // Ativar para cada usuário
      for (const userData of usersData) {
        const { email, name } = userData;
        
        logStep("Activating plan for user", { email, name });

        // Upsert subscriber record
        const { error: upsertError } = await supabaseService
          .from('subscribers')
          .upsert({
            email: email,
            display_name: name,
            subscribed: true,
            subscription_tier: planName || 'Premium',
            subscription_end: subscriptionEnd.toISOString(),
            stripe_customer_id: session.customer as string,
            source: 'stripe_checkout',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'email' });

        if (upsertError) {
          logStep("Error activating plan for user", { email, error: upsertError.message });
        } else {
          logStep("Plan activated successfully for user", { email });
        }
      }

      // Atualizar também o comprador se não estiver na lista
      if (buyerEmail && !usersData.some((u: any) => u.email === buyerEmail)) {
        logStep("Activating plan for buyer", { buyerEmail });
        
        const { error: buyerError } = await supabaseService
          .from('subscribers')
          .upsert({
            email: buyerEmail,
            subscribed: true,
            subscription_tier: planName || 'Premium',
            subscription_end: subscriptionEnd.toISOString(),
            stripe_customer_id: session.customer as string,
            source: 'stripe_checkout_buyer',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'email' });

        if (buyerError) {
          logStep("Error activating plan for buyer", { buyerEmail, error: buyerError.message });
        }
      }
    }

    return new Response(JSON.stringify({
      paid: isPaid,
      status: session.status,
      payment_status: session.payment_status,
      users_activated: isPaid ? usersData.length : 0,
      plan_name: planName,
      billing_cycle: billingCycle,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    logStep("ERROR in verify-payment", { message: error.message });
    return new Response(JSON.stringify({ 
      error: error.message,
      paid: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});