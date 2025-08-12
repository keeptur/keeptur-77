import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SettingsSection from "./sections/SettingsSection";

export default function AdminSettingsPage() {
  useEffect(() => {
    document.title = "Admin Configurações | Keeptur";
  }, []);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Super Admin</h1>
        <p className="text-muted-foreground">Configurações gerais do sistema.</p>
      </header>

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Configurações</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsSection />
        </CardContent>
      </Card>
    </div>
  );
}
