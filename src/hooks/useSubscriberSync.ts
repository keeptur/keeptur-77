import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Defaults when settings are not accessible to regular users
const DEFAULT_TRIAL_DAYS = 7;

function getMondeTokenPayload(): { email?: string; name?: string } | null {
  try {
    const token = localStorage.getItem("monde_token");
    if (!token) return null;
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return { email: decoded?.email, name: decoded?.name };
  } catch {
    return null;
  }
}

export function useSubscriberSync() {
  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      const mondeToken = localStorage.getItem("monde_token");
      const monde = getMondeTokenPayload();

      // 1) If we have a Supabase user, sync via direct table access (respecting RLS)
      if (user) {
        const email = monde?.email || user.email;
        if (!email) return;

        // Try to fetch existing subscriber (allowed by RLS for the current user)
        const { data: existing } = await supabase
          .from("subscribers")
          .select("id, trial_start, trial_end")
          .or(`user_id.eq.${user.id},email.eq.${email}`)
          .maybeSingle();

        const now = new Date();
        const baseStart = existing?.trial_start ? new Date(existing.trial_start) : now;
        const trialStart = existing?.trial_start || baseStart.toISOString();
        const trialEnd = existing?.trial_end || new Date(baseStart.getTime() + DEFAULT_TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();

        const payload: any = {
          email,
          user_id: user.id,
          display_name: monde?.name || user.user_metadata?.name || null,
          last_login_at: now.toISOString(),
          trial_start: trialStart,
          trial_end: trialEnd,
        };

        if (existing?.id) {
          await supabase.from("subscribers").update(payload).eq("id", existing.id);
        } else {
          await supabase.from("subscribers").insert(payload);
        }
        return;
      }

      // 2) If there's no Supabase session but we have a Monde token, sync via Edge Function (service role)
      if (mondeToken || monde?.email) {
        await supabase.functions.invoke("sync-subscriber", {
          body: { mondeToken, email: monde?.email, name: monde?.name, source: "monde" },
        }).catch(() => {/* silent */});
      }
    };

    // run once on mount
    sync().catch(() => {/* silent */});

    return () => {
      cancelled = true;
    };
  }, []);
}
