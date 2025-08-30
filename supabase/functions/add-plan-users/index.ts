import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADD-PLAN-USERS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    if (!serviceKey) {
      throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No Authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user?.email) {
      throw new Error("Authentication failed");
    }

    const { user_emails } = await req.json();
    if (!Array.isArray(user_emails)) {
      throw new Error("user_emails must be an array");
    }

    logStep("Adding plan users", { user_emails, buyer: userData.user.email });

    // Get buyer's subscription info
    const { data: buyerSubscriber } = await supabase
      .from("subscribers")
      .select("stripe_customer_id, subscription_tier, subscription_end")
      .or(`email.eq.${userData.user.email},user_email.eq.${userData.user.email}`)
      .eq("subscribed", true)
      .maybeSingle();

    if (!buyerSubscriber?.stripe_customer_id) {
      throw new Error("Buyer must have an active subscription to add users");
    }

    logStep("Found buyer subscription", { 
      stripe_customer_id: buyerSubscriber.stripe_customer_id,
      subscription_tier: buyerSubscriber.subscription_tier 
    });

    // Calculate subscription end date (inherit from buyer)
    const subscriptionEnd = buyerSubscriber.subscription_end || 
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // Default to 30 days

    const addedUsers: string[] = [];

    for (const email of user_emails) {
      if (typeof email !== 'string' || !email.includes('@')) {
        logStep("Skipping invalid email", { email });
        continue;
      }

      logStep("Processing user", { email });

      // Determine if this is a Monde email
      const isMondeEmail = /@([a-z0-9-]+\.)*monde\.com\.br$/i.test(email);
      let finalEmail = email;
      let username = isMondeEmail ? email.split('@')[0] : undefined;

      // If Monde email, try to find corresponding real email by username
      if (isMondeEmail && username) {
        const { data: realEmailUser } = await supabase
          .from('subscribers')
          .select('email')
          .eq('username', username)
          .not('email', 'like', '%monde.com.br%')
          .maybeSingle();

        if (realEmailUser) {
          finalEmail = realEmailUser.email;
          logStep("Found existing real email for Monde user", { 
            mondeEmail: email, 
            realEmail: finalEmail 
          });
        }
      }

      // Upsert subscriber with inherited plan details
      const { error: upsertError } = await supabase
        .from('subscribers')
        .upsert({
          email: finalEmail,
          user_email: isMondeEmail ? email : undefined,
          username: username,
          display_name: email.split('@')[0],
          subscribed: true,
          subscription_tier: buyerSubscriber.subscription_tier,
          subscription_end: subscriptionEnd,
          stripe_customer_id: buyerSubscriber.stripe_customer_id,
          source: 'plan_user_added',
          trial_start: null,
          trial_end: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'email' });

      if (upsertError) {
        logStep("Error adding user", { email, error: upsertError.message });
      } else {
        addedUsers.push(email);
        logStep("User added successfully", { email: finalEmail });
      }
    }

    logStep("Completed adding users", { added_count: addedUsers.length });

    return new Response(JSON.stringify({
      success: true,
      added_users: addedUsers,
      total_added: addedUsers.length
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    logStep("ERROR in add-plan-users", { message: error.message });
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});