import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardSection from "./sections/DashboardSection";
import { SecurityFixHelper } from "@/components/security/SecurityFixHelper";

export default function AdminDashboardPage() {
  useEffect(() => {
    document.title = "Admin Dashboard | Keeptur";
  }, []);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Super Admin</h1>
        <p className="text-muted-foreground">Visão geral e métricas administrativas.</p>
      </header>

      <SecurityFixHelper />

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <DashboardSection />
        </CardContent>
      </Card>
    </div>
  );
}
