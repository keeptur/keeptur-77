
import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AdminRoute } from "@/components/auth/AdminRoute";
import DashboardSection from "./admin/sections/DashboardSection";
import UsersSection from "./admin/sections/UsersSection";
import PlansSection from "./admin/sections/PlansSection";
import SubscriptionSection from "./admin/sections/SubscriptionSection";
import SettingsSection from "./admin/sections/SettingsSection";
import EmailsSection from "./admin/sections/EmailsSection";
import LogsSection from "./admin/sections/LogsSection";

export default function AdminPage() {
  const [tab, setTab] = useState("dashboard");

  useEffect(() => {
    document.title = "Admin | Keeptur";
  }, []);

  return (
    <AdminRoute>
      <div className="p-6 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">Super Admin</h1>
          <p className="text-muted-foreground">Controle total do sistema, usuários, planos e integrações.</p>
        </header>

        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Administração</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={setTab} className="w-full">
              <TabsList className="flex flex-wrap gap-1">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="users">Usuários</TabsTrigger>
                <TabsTrigger value="plans">Planos</TabsTrigger>
                <TabsTrigger value="billing">Assinatura</TabsTrigger>
                <TabsTrigger value="settings">Configurações</TabsTrigger>
                <TabsTrigger value="emails">E-mails</TabsTrigger>
                <TabsTrigger value="logs">Logs</TabsTrigger>
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

              <TabsContent value="logs" className="mt-4">
                <LogsSection />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AdminRoute>
  );
}
