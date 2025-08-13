
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export const UserRoute = ({ children }: { children: React.ReactNode }) => {
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
        const admin = (roles || []).some((r) => r.role === "admin");
        if (mounted) setIsAdmin(admin);
      }
      mounted && setReady(true);
    })();
    return () => { mounted = false; };
  }, []);

  if (!ready) return null;
  if (isAdmin) return <Navigate to="/admin" replace />;
  return <>{children}</>;
};
