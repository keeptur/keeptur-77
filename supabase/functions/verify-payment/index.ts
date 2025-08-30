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

    if (isPaid) {
      logStep("Payment paid, proceeding with activation");

      // Calculate subscription end date based on billing cycle
      const now = new Date();
      const subscriptionEnd = new Date(now);
      if (billingCycle === 'yearly') {
        subscriptionEnd.setFullYear(now.getFullYear() + 1);
      } else {
        subscriptionEnd.setMonth(now.getMonth() + 1);
      }

      // Build activation list: prefer provided users; fallback to buyer
      const activationList: Array<{ email: string; name?: string }> =
        usersData && usersData.length > 0
          ? usersData
          : (buyerEmail ? [{ email: buyerEmail, name: buyerEmail.split('@')[0] }] : []);

      let activatedCount = 0;

      for (const userData of activationList) {
        const { email, name } = userData;
        logStep("Activating plan for user", { email, name });

        // Determine if this is a Monde email or real email
        const isMondeEmail = /@([a-z0-9-]+\.)*monde\.com\.br$/i.test(email);
        let finalEmail = email;
        let username = isMondeEmail ? email.split('@')[0] : undefined;

        // If Monde email, try to find corresponding real email by username
        if (isMondeEmail && username) {
          const { data: realEmailUser } = await supabaseService
            .from('subscribers')
            .select('*')
            .eq('username', username)
            .not('email', 'like', '%monde.com.br%')
            .maybeSingle();

          if (realEmailUser) {
            finalEmail = realEmailUser.email;
            logStep("Found existing real email for Monde user", { mondeEmail: email, realEmail: finalEmail });
          }
        }

        // Upsert subscriber record
        const { error: upsertError } = await supabaseService
          .from('subscribers')
          .upsert({
            email: finalEmail,
            display_name: name,
            subscribed: true,
            subscription_tier: planName || 'Premium',
            subscription_end: subscriptionEnd.toISOString(),
            stripe_customer_id: session.customer as string,
            source: 'stripe_checkout',
            trial_start: null,
            trial_end: null,
            username: username,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'email' });

        if (upsertError) {
          logStep("Error activating plan for user", { email, error: upsertError.message });
        } else {
          activatedCount += 1;
          logStep("Plan activated successfully for user", { email });
        }
      }

      // If buyer is not in the provided list, ensure buyer is also activated
      if (buyerEmail && !(usersData || []).some((u: any) => u.email === buyerEmail)) {
        logStep("Ensuring buyer subscription", { buyerEmail });

        const { data: existingPreferred } = await supabaseService
          .from('subscribers')
          .select('id,email')
          .eq('stripe_customer_id', session.customer as string)
          .limit(1);

        const existingBuyer = existingPreferred && existingPreferred.length > 0 ? existingPreferred[0] : null;

        if (existingBuyer) {
          const { error: updateBuyerErr } = await supabaseService
            .from('subscribers')
            .update({
              subscribed: true,
              subscription_tier: planName || 'Premium',
              subscription_end: subscriptionEnd.toISOString(),
              source: 'stripe_checkout_buyer',
              trial_start: null,
              trial_end: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingBuyer.id);

          if (updateBuyerErr) {
            logStep('Error updating existing buyer subscriber', { error: updateBuyerErr.message, existingEmail: existingBuyer.email });
          } else {
            logStep('Updated existing buyer subscriber', { existingEmail: existingBuyer.email });
          }
        } else {
          const { error: buyerError } = await supabaseService
            .from('subscribers')
            .upsert({
              email: buyerEmail,
              subscribed: true,
              subscription_tier: planName || 'Premium',
              subscription_end: subscriptionEnd.toISOString(),
              stripe_customer_id: session.customer as string,
              source: 'stripe_checkout_buyer',
              trial_start: null,
              trial_end: null,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'email' });

          if (buyerError) {
            logStep('Error activating plan for buyer', { buyerEmail, error: buyerError.message });
          } else {
            activatedCount += 1;
          }
        }
      }

      // Consolidate duplicate subscribers for this Stripe customer: merge Monde alias into real email
      try {
        const { data: custSubs } = await supabaseService
          .from('subscribers')
          .select('id,email,display_name,subscribed,subscription_end,subscription_tier,username')
          .eq('stripe_customer_id', session.customer as string);

        if (custSubs && custSubs.length > 1) {
          const mondeRegex = /@([a-z0-9-]+\.)*monde\.com\.br$/i;
          const realSubs = custSubs.filter((s: any) => !mondeRegex.test(s.email));
          const mondeSubs = custSubs.filter((s: any) => mondeRegex.test(s.email));

          if (realSubs.length > 0 && mondeSubs.length > 0) {
            const primary = realSubs[0];
            for (const alias of mondeSubs) {
              const update: any = {};
              if (!primary.username) update.username = alias.email.split('@')[0];
              if (!primary.subscribed && alias.subscribed) update.subscribed = true;
              if (!primary.subscription_end || (alias.subscription_end && alias.subscription_end > primary.subscription_end)) {
                update.subscription_end = alias.subscription_end;
              }
              if (!primary.subscription_tier && alias.subscription_tier) {
                update.subscription_tier = alias.subscription_tier;
              }
              if (!primary.display_name && alias.display_name) {
                update.display_name = alias.display_name;
              }
              if (Object.keys(update).length > 0) {
                update.updated_at = new Date().toISOString();
                await supabaseService.from('subscribers').update(update).eq('id', primary.id);
              }
              await supabaseService.from('subscribers').delete().eq('id', alias.id);
            }
          }
        }
      } catch (e) {
        logStep('Consolidation error', { message: (e as any)?.message || String(e) });
      }

      // Return early response data update
      return new Response(JSON.stringify({
        paid: isPaid,
        status: session.status,
        payment_status: session.payment_status,
        users_activated: activatedCount,
        plan_name: planName,
        billing_cycle: billingCycle,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
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