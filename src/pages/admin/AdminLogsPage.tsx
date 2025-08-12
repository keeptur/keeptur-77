import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LogsSection from "./sections/LogsSection";

export default function AdminLogsPage() {
  useEffect(() => {
    document.title = "Admin Logs | Keeptur";
  }, []);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Super Admin</h1>
        <p className="text-muted-foreground">Registros de acesso e eventos.</p>
      </header>

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <LogsSection />
        </CardContent>
      </Card>
    </div>
  );
}
