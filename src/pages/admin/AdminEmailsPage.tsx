import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EmailsSection from "./sections/EmailsSection";

export default function AdminEmailsPage() {
  useEffect(() => {
    document.title = "Admin E-mails | Keeptur";
  }, []);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Super Admin</h1>
        <p className="text-muted-foreground">Modelos e SMTP.</p>
      </header>

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">E-mails</CardTitle>
        </CardHeader>
        <CardContent>
          <EmailsSection />
        </CardContent>
      </Card>
    </div>
  );
}
