import { ReactNode, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AdminRouteProps {
  children: ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;
        if (!session?.user) {
          setMessage("Para acessar o Admin, faça login com sua conta Keeptur (Supabase).");
          return;
        }
        // Check role 'admin'
        const { data: roles, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id);
        if (error) throw error;
        const isAdmin = (roles || []).some((r) => r.role === "admin");
        setAllowed(isAdmin);
        if (!isAdmin) setMessage("Acesso restrito. Sua conta não possui permissão de administrador.");
      } catch (err: any) {
        setMessage(err.message || "Erro ao verificar permissões.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    check();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <div className="p-6">Carregando...</div>;
  if (!allowed)
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            <p>{message}</p>
            <div className="flex gap-2">
              <Button onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/login";
              }}>Trocar usuário</Button>
              <Button variant="secondary" onClick={() => (window.location.href = "/")}>Voltar</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  return <>{children}</>;
}
