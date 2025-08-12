import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SubscriptionSection from "./sections/SubscriptionSection";

export default function AdminBillingPage() {
  useEffect(() => {
    document.title = "Admin Assinatura | Keeptur";
  }, []);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Super Admin</h1>
        <p className="text-muted-foreground">Assinaturas e cobrança.</p>
      </header>

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Assinatura</CardTitle>
        </CardHeader>
        <CardContent>
          <SubscriptionSection />
        </CardContent>
      </Card>
    </div>
  );
}
