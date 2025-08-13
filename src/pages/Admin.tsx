import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AdminRoute } from "@/components/auth/AdminRoute";
import DashboardSection from "./admin/sections/DashboardSection";
import UsersSection from "./admin/sections/UsersSection";
import PlansSection from "./admin/sections/PlansSection";
import SubscriptionSection from "./admin/sections/SubscriptionSection";
import SettingsSection from "./admin/sections/SettingsSection";
import EmailsSection from "./admin/sections/EmailsSection";
export default function AdminPage() {
  const [tab, setTab] = useState("dashboard");
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  useEffect(() => {
    document.title = "Admin | Keeptur";
  }, []);

  // Sync tab from URL
  useEffect(() => {
    const t = searchParams.get("t");
    if (t && t !== tab) setTab(t);
  }, [searchParams]);

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
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="users">Usuários</TabsTrigger>
                <TabsTrigger value="plans">Planos</TabsTrigger>
                <TabsTrigger value="billing">Billing</TabsTrigger>
                <TabsTrigger value="settings">Config</TabsTrigger>
                <TabsTrigger value="emails">Emails</TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard" className="mt-4">
                <DashboardSection />
              </TabsContent>

              <TabsContent value="users" className="mt-4">
                <UsersSection />
              </TabsContent>

              <TabsContent value="plans" className="mt-4">
                <PlansSection />
              </TabsContent>

              <TabsContent value="billing" className="mt-4">
                <SubscriptionSection />
              </TabsContent>

              <TabsContent value="settings" className="mt-4">
                <SettingsSection />
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