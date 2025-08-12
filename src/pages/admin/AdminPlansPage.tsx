import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PlansSection from "./sections/PlansSection";

export default function AdminPlansPage() {
  useEffect(() => {
    document.title = "Admin Planos | Keeptur";
  }, []);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Super Admin</h1>
        <p className="text-muted-foreground">Gerenciar kits de plano e preços.</p>
      </header>

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Planos</CardTitle>
        </CardHeader>
        <CardContent>
          <PlansSection />
        </CardContent>
      </Card>
    </div>
  );
}
