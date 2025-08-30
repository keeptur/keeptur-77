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

      const emailPrefixes = new Set<string>();
      const mondeRegex = /@([a-z0-9-]+\.)*monde\.com\.br$/i;

      for (const sub of subscribers) {
        const prefix = sub.email.split('@')[0].toLowerCase();
        const group = subscribers.filter(s => s.email.toLowerCase().startsWith(prefix + '@'));
        const hasMonde = group.some(s => mondeRegex.test(s.email));
        const hasReal = group.some(s => !mondeRegex.test(s.email));
        if (hasMonde && hasReal && !emailPrefixes.has(prefix)) {
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
    .ilike("email", `${emailPrefix}@%`)
    .order("created_at");

  if (!allSubs || allSubs.length <= 1) {
    return { emailPrefix, action: "no_duplicates", count: allSubs?.length || 0 };
  }

  // Preferir email REAL como principal e usar Monde como username
  const mondeEmailRegex = /^[^@]+@([a-z0-9-]+\.)*monde\.com\.br$/i;
  const mondeUsers = allSubs.filter(s => mondeEmailRegex.test(s.email));
  const realUsers = allSubs.filter(s => !mondeEmailRegex.test(s.email));

  if (realUsers.length === 0) {
    // Não há email real para mesclar; apenas garanta username no registro Monde
    const primary = mondeUsers[0];
    const update: any = {};
    if (!primary.username) update.username = emailPrefix;
    if (Object.keys(update).length > 0) {
      update.updated_at = new Date().toISOString();
      await admin.from("subscribers").update(update).eq("id", primary.id);
    }
    return { emailPrefix, action: "only_monde", kept: primary.email };
  }

  // Escolhe o real mais antigo como principal
  const primary = realUsers.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
  const duplicates = allSubs.filter(s => s.id !== primary.id);

  const update: any = {};
  if (!primary.username) update.username = emailPrefix;

  for (const dup of duplicates) {
    if (!primary.stripe_customer_id && dup.stripe_customer_id) update.stripe_customer_id = dup.stripe_customer_id;
    if (!primary.subscribed && dup.subscribed) update.subscribed = true;
    if (!primary.subscription_tier && dup.subscription_tier) update.subscription_tier = dup.subscription_tier;

    // Mantém trial mais antigo
    if (!primary.trial_start || (dup.trial_start && new Date(dup.trial_start).getTime() < new Date(primary.trial_start).getTime())) {
      if (dup.trial_start) update.trial_start = dup.trial_start;
      if (dup.trial_end) update.trial_end = dup.trial_end;
    }

    // Mantém data de assinatura mais distante no futuro
    const primaryEnd = primary.subscription_end ? new Date(primary.subscription_end).getTime() : 0;
    const dupEnd = dup.subscription_end ? new Date(dup.subscription_end).getTime() : 0;
    if (dupEnd > primaryEnd) update.subscription_end = dup.subscription_end;

    if (!primary.display_name && dup.display_name) update.display_name = dup.display_name;
  }

  if (Object.keys(update).length > 0) {
    update.updated_at = new Date().toISOString();
    await admin.from("subscribers").update(update).eq("id", primary.id);
  }

  // Apaga todos os duplicados (incluindo Monde)
  for (const dup of duplicates) {
    await admin.from("subscribers").delete().eq("id", dup.id);
  }

  return {
    emailPrefix,
    action: "merged_to_real",
    keptEmail: primary.email,
    deletedIds: duplicates.map((d: any) => d.id),
    count: duplicates.length,
  };
}
