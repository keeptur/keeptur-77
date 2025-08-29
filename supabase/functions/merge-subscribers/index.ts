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

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  try {
    if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase configuration");

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const body = await req.json().catch(() => ({}));
    const { emailPrefix } = body as { emailPrefix?: string };

    let mergeResults = [];

    if (emailPrefix) {
      // Merge specific email prefix
      const result = await mergeEmailPrefix(admin, emailPrefix);
      mergeResults.push(result);
    } else {
      // Auto-discover and merge common duplicates
      const { data: subscribers } = await admin
        .from("subscribers")
        .select("email")
        .order("created_at");

      if (!subscribers) {
        throw new Error("Could not fetch subscribers");
      }

      const emailPrefixes = new Set();
      for (const sub of subscribers) {
        const prefix = sub.email.split('@')[0];
        const mondeEmail = `${prefix}@monde.com.br`;
        const otherEmail = subscribers.find(s => s.email !== mondeEmail && s.email.startsWith(prefix + '@'));
        
        if (otherEmail && !emailPrefixes.has(prefix)) {
          emailPrefixes.add(prefix);
          const result = await mergeEmailPrefix(admin, prefix);
          mergeResults.push(result);
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      merged: mergeResults.length,
      results: mergeResults
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error in merge-subscribers:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function mergeEmailPrefix(admin: any, emailPrefix: string) {
  console.log(`Merging subscribers for prefix: ${emailPrefix}`);
  
  // Find all subscribers with this email prefix
  const { data: allSubs } = await admin
    .from("subscribers")
    .select("*")
    .like("email", `${emailPrefix}@%`)
    .order("created_at");

  if (!allSubs || allSubs.length <= 1) {
    return { emailPrefix, action: "no_duplicates", count: allSubs?.length || 0 };
  }

  // Prioritize Monde email
  const mondeEmailRegex = /^[^@]+@([a-z0-9-]+\.)*monde\.com\.br$/i;
  const mondeUser = allSubs.find(s => mondeEmailRegex.test(s.email));
  const nonMondeUsers = allSubs.filter(s => !mondeEmailRegex.test(s.email));

  if (!mondeUser) {
    return { emailPrefix, action: "no_monde_email", count: allSubs.length };
  }

  // Merge data from non-Monde users into Monde user
  let updatedData = { ...mondeUser };
  let hasUpdates = false;

  for (const nonMondeUser of nonMondeUsers) {
    // Keep better subscription status
    if (!updatedData.subscribed && nonMondeUser.subscribed) {
      updatedData.subscribed = nonMondeUser.subscribed;
      hasUpdates = true;
    }
    
    // Keep earlier trial dates
    if (!updatedData.trial_start && nonMondeUser.trial_start) {
      updatedData.trial_start = nonMondeUser.trial_start;
      updatedData.trial_end = nonMondeUser.trial_end;
      hasUpdates = true;
    }
    
    // Keep Stripe customer ID
    if (!updatedData.stripe_customer_id && nonMondeUser.stripe_customer_id) {
      updatedData.stripe_customer_id = nonMondeUser.stripe_customer_id;
      hasUpdates = true;
    }
    
    // Keep display name if better
    if (!updatedData.display_name && nonMondeUser.display_name) {
      updatedData.display_name = nonMondeUser.display_name;
      hasUpdates = true;
    }
  }

  // Update Monde user if needed
  if (hasUpdates) {
    await admin
      .from("subscribers")
      .update({
        subscribed: updatedData.subscribed,
        trial_start: updatedData.trial_start,
        trial_end: updatedData.trial_end,
        stripe_customer_id: updatedData.stripe_customer_id,
        display_name: updatedData.display_name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", mondeUser.id);
  }

  // Delete non-Monde users
  for (const nonMondeUser of nonMondeUsers) {
    await admin.from("subscribers").delete().eq("id", nonMondeUser.id);
    console.log(`Deleted duplicate subscriber: ${nonMondeUser.email}`);
  }

  return { 
    emailPrefix, 
    action: "merged", 
    mondeEmail: mondeUser.email,
    deletedEmails: nonMondeUsers.map(u => u.email),
    count: nonMondeUsers.length
  };
}
