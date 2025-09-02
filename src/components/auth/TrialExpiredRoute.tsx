import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { api } from "@/lib/api";
import { useAdminStatus } from "@/hooks/useAdminStatus";

interface TrialExpiredRouteProps {
  children: React.ReactNode;
}

export const TrialExpiredRoute = ({ children }: TrialExpiredRouteProps) => {
  const [loading, setLoading] = useState(true);
  const [isTrialExpired, setIsTrialExpired] = useState(false);
  const { isAdmin } = useAdminStatus();

  useEffect(() => {
    const checkTrialStatus = async () => {
      if (isAdmin) {
        setLoading(false);
        return;
      }

      try {
        const mondeToken = localStorage.getItem("monde_token");
        let email: string | undefined;

        // Get email from Supabase session or Monde token
        const { data: { session } } = await supabase.auth.getSession();
        email = session?.user?.email;

        if (!email && mondeToken) {
          try {
            const uid = api.getCurrentUserIdFromToken();
            if (uid) {
              const person = await api.getPerson(uid);
              email = person?.data?.attributes?.email;
            }
          } catch (e) {
            console.warn("Error getting email from Monde API:", e);
          }
        }

        if (!email) {
          setLoading(false);
          return;
        }

        // Check subscription status
        const { data, error } = await supabase.functions.invoke('get-subscription-data', {
          body: { email, mondeToken }
        });

        if (error) {
          console.error("Error checking trial status:", error);
          setLoading(false);
          return;
        }

        const { subscribed, trial_active, days_remaining } = data;
        
        // Trial is expired if not subscribed, trial not active, or days remaining <= 0
        const trialExpired = !subscribed && (!trial_active || days_remaining <= 0);
        setIsTrialExpired(trialExpired);
      } catch (error) {
        console.error("Error in trial status check:", error);
      } finally {
        setLoading(false);
      }
    };

    checkTrialStatus();
  }, [isAdmin]);

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="text-muted-foreground">Verificando status...</div>
    </div>;
  }

  // Admins always have access
  if (isAdmin) {
    return <>{children}</>;
  }

  // Redirect to subscription page if trial expired
  if (isTrialExpired) {
    return <Navigate to="/subscription" replace />;
  }

  return <>{children}</>;
};