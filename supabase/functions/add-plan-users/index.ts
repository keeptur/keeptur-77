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

    // Parse body early and try to resolve buyer's email from provided data
    let body: any = {};
    try { body = await req.json(); } catch (_) {}
    const { user_emails, buyer_email, mondeToken } = body || {};

    if (!Array.isArray(user_emails)) {
      throw new Error("user_emails must be an array");
    }

    // Try multiple strategies to identify the buyer email
    let buyerEmail: string | undefined = buyer_email;

    // 1) Try Supabase Auth token if available (may be absent in our flow)
    const authHeader = req.headers.get("Authorization");
    if (!buyerEmail && authHeader?.startsWith("Bearer ")) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const { data: userData } = await supabase.auth.getUser(token);
        buyerEmail = userData.user?.email ?? buyerEmail;
      } catch { /* ignore */ }
    }

    // 2) Try Monde token payload (if it contains email)
    if (!buyerEmail && typeof mondeToken === 'string') {
      try {
        const payload = JSON.parse(atob(mondeToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        buyerEmail = payload?.email || payload?.user_email || payload?.sub;
      } catch { /* ignore */ }
    }

    if (!buyerEmail) {
      throw new Error("Could not determine buyer email. Pass buyer_email in body.");
    }

    logStep("Adding plan users", { user_emails, buyer: buyerEmail });

    // Get buyer's subscription info
    const { data: buyerSubscriber } = await supabase
      .from("subscribers")
      .select("stripe_customer_id, subscription_tier, subscription_end")
      .or(`email.eq.${buyerEmail},user_email.eq.${buyerEmail}`)
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

      // Determine if this is a Monde email and attempt to resolve an existing subscriber
      const isMondeEmail = /@([a-z0-9-]+\.)*monde\.com\.br$/i.test(email);
      let username = isMondeEmail ? email.split('@')[0].toLowerCase() : undefined;

      // Resolve target subscriber email (prefer existing non-Monde row)
      let targetEmail = email;
      let existing: { id: string; email: string } | null = null;

      if (isMondeEmail && username) {
        // 1) Existing row that already references this Monde login
        const { data: byUserEmail } = await supabase
          .from('subscribers')
          .select('id,email')
          .eq('user_email', email)
          .maybeSingle();
        if (byUserEmail) existing = byUserEmail as any;

        // 2) Existing row by username with real email (non-Monde)
        if (!existing) {
          const { data: byUsername } = await supabase
            .from('subscribers')
            .select('id,email')
            .eq('username', username)
            .not('email', 'ilike', '%monde.com.br%')
            .maybeSingle();
          if (byUsername) existing = byUsername as any;
        }

        // 3) Heuristic: email starts with username and is not Monde domain
        if (!existing) {
          const { data: byLocalPart } = await supabase
            .from('subscribers')
            .select('id,email')
            .ilike('email', `${username}@%`)
            .not('email', 'ilike', '%monde.com.br%')
            .maybeSingle();
          if (byLocalPart) existing = byLocalPart as any;
        }

        if (existing) {
          targetEmail = existing.email;
          logStep('Resolved existing subscriber for Monde login', { mondeEmail: email, targetEmail });
        }
      }

      // Upsert subscriber with inherited plan details (merge into existing if found)
      const upsertPayload: any = {
        email: targetEmail,
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
      };
      if (isMondeEmail) upsertPayload.user_email = email;

      const { error: upsertError } = await supabase
        .from('subscribers')
        .upsert(upsertPayload, { onConflict: 'email' });

      if (upsertError) {
        logStep("Error adding user", { email, error: upsertError.message });
      } else {
        // Clean up potential duplicate record under the Monde login email if we merged into a real email
        if (isMondeEmail && targetEmail.toLowerCase() !== email.toLowerCase()) {
          await supabase.from('subscribers').delete().eq('email', email);
          logStep('Removed duplicate Monde subscriber row if existed', { mondeEmail: email });
        }
        addedUsers.push(email);
        logStep("User added successfully", { merged_into: targetEmail });
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