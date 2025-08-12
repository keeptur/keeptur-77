
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
}

interface RoleRow {
  user_id: string;
  role: string;
}

export default function UsersSection() {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: p }, { data: r }] = await Promise.all([
          supabase.from("profiles").select("id, email, full_name"),
          supabase.from("user_roles").select("user_id, role"),
        ]);
        setProfiles((p || []) as any);
        setRoles((r || []) as any);
      } finally {
        setLoading(false);
      }
    };
    load().catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!q) return profiles;
    const s = q.toLowerCase();
    return profiles.filter(p => (p.email?.toLowerCase()?.includes(s) || p.full_name?.toLowerCase()?.includes(s)));
  }, [q, profiles]);

  const isAdmin = (id: string) => roles.some(r => r.user_id === id && r.role === "admin");

  const promote = async (userId: string) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" as any });
    if (error) {
      toast({ title: "Erro ao promover", description: error.message, variant: "destructive" });
    } else {
      setRoles(prev => [...prev, { user_id: userId, role: "admin" }]);
      toast({ title: "Usuário promovido a admin" });
    }
  };

  const demote = async (userId: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
    if (error) {
      toast({ title: "Erro ao remover admin", description: error.message, variant: "destructive" });
    } else {
      setRoles(prev => prev.filter(r => !(r.user_id === userId && r.role === "admin")));
      toast({ title: "Admin removido" });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <Label htmlFor="q">Buscar</Label>
            <Input id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar por nome ou e-mail" />
          </div>
          {/* A criação de usuário via convite pode ser implementada por Edge Function se desejar */}
        </CardContent>
      </Card>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead className="w-40">Papel</TableHead>
              <TableHead className="w-48">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4}>Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={4}>Nenhum usuário encontrado.</TableCell></TableRow>
            ) : (
              filtered.map(p => (
                <TableRow key={p.id}>
                  <TableCell>{p.full_name || "-"}</TableCell>
                  <TableCell>{p.email}</TableCell>
                  <TableCell>
                    {isAdmin(p.id) ? <Badge variant="default">admin</Badge> : <Badge variant="secondary">user</Badge>}
                  </TableCell>
                  <TableCell className="space-x-2">
                    {isAdmin(p.id) ? (
                      <Button variant="outline" size="sm" onClick={() => demote(p.id)}>Remover admin</Button>
                    ) : (
                      <Button size="sm" onClick={() => promote(p.id)}>Promover a admin</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
