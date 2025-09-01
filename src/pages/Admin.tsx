import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AdminRoute } from "@/components/auth/AdminRoute";
import DashboardSection from "./admin/sections/DashboardSection";
import UsersSection from "./admin/sections/UsersSection";
import PlansSection from "./admin/sections/PlansSection";
import BillingSettingsSection from "./admin/sections/BillingSettingsSection";
import { EmailsSection } from "./admin/sections/EmailsSection";
export default function AdminPage() {
  const [tab, setTab] = useState("dashboard");
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  useEffect(() => {
    document.title = "Admin | Keeptur";
  }, []);

  // Sync tab from URL and redirect billing to plans
  useEffect(() => {
    const t = searchParams.get("t");
    // Redirect billing to plans
    if (t === "billing") {
      navigate("/admin?t=plans", { replace: true });
      return;
    }
    if (t && t !== tab) setTab(t);
  }, [searchParams, navigate]);

  // Update URL when tab changes
  useEffect(() => {
    const current = searchParams.get("t");
    if (tab !== (current || "")) {
      setSearchParams({
        t: tab
      });
    }
  }, [tab]);
  return <AdminRoute>
      <div className="p-2 space-y-3">
        

        <Card className="overflow-hidden">
          
          <CardContent>
            <Tabs value={tab} onValueChange={setTab} className="w-full">
              

              <TabsContent value="dashboard" className="mt-4">
                <DashboardSection />
              </TabsContent>

              <TabsContent value="users" className="mt-4">
                <UsersSection />
              </TabsContent>

              <TabsContent value="plans" className="mt-4">
                <PlansSection />
              </TabsContent>

              <TabsContent value="emails" className="mt-4">
                <EmailsSection />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AdminRoute>;
}