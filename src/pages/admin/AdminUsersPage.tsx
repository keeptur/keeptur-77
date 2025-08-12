import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import UsersSection from "./sections/UsersSection";

export default function AdminUsersPage() {
  useEffect(() => {
    document.title = "Admin Usuários | Keeptur";
  }, []);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Super Admin</h1>
        <p className="text-muted-foreground">Gestão de usuários e permissões.</p>
      </header>

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          <UsersSection />
        </CardContent>
      </Card>
    </div>
  );
}
