
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { addDays } from "date-fns";
interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
}

interface RoleRow {
  user_id: string;
  role: string;
}

interface SubscriberRow {
  id: string;
  user_id: string | null;
  email: string;
  subscribed: boolean;
  subscription_tier: string | null;
  trial_start: string | null;
  trial_end: string | null;
  subscription_end: string | null;
  created_at: string;
  updated_at: string;
}

type CombinedUser = {
  id: string | null; // profile id (supabase auth user id)
  user_id: string | null; // from subscribers when profile missing
  email: string;
  full_name: string | null;
  subscriber?: SubscriberRow;
};
export default function UsersSection() {
  const { toast } = useToast();
const [profiles, setProfiles] = useState<ProfileRow[]>([]);
const [roles, setRoles] = useState<RoleRow[]>([]);
const [subscribers, setSubscribers] = useState<SubscriberRow[]>([]);
const [loading, setLoading] = useState(true);
const [q, setQ] = useState("");

useEffect(() => {
  const load = async () => {
    try {
      const [{ data: p }, { data: r }, { data: s }] = await Promise.all([
        supabase.from("profiles").select("id, email, full_name"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("subscribers").select("id, user_id, email, subscribed, subscription_tier, trial_start, trial_end, subscription_end, created_at, updated_at"),
      ]);
      setProfiles((p || []) as any);
      setRoles((r || []) as any);
      setSubscribers((s || []) as any);
    } finally {
      setLoading(false);
    }
  };
  load().catch(() => setLoading(false));
}, []);

const combinedUsers = useMemo<CombinedUser[]>(() => {
  const byEmail = new Map<string, CombinedUser>();
  (subscribers || []).forEach((su) => {
    byEmail.set(su.email, {
      id: su.user_id || null,
      user_id: su.user_id,
      email: su.email,
      full_name: null,
      subscriber: su,
    });
  });
  (profiles || []).forEach((pr) => {
    const existing = byEmail.get(pr.email);
    if (existing) {
      existing.id = pr.id;
      existing.full_name = pr.full_name;
    } else {
      byEmail.set(pr.email, {
        id: pr.id,
        user_id: pr.id,
        email: pr.email,
        full_name: pr.full_name,
      });
    }
  });
  return Array.from(byEmail.values());
}, [profiles, subscribers]);

const filtered = useMemo(() => {
  if (!q) return combinedUsers;
  const s = q.toLowerCase();
  return combinedUsers.filter((u) => u.email?.toLowerCase()?.includes(s) || (u.full_name || "").toLowerCase().includes(s));
}, [q, combinedUsers]);

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

const getDaysRemaining = (dateStr: string | null | undefined) => {
  if (!dateStr) return null;
  const now = new Date().getTime();
  const target = new Date(dateStr).getTime();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
};

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString();
};

async function addDaysTo(user: CombinedUser, field: 'trial_end' | 'subscription_end', days: number) {
  try {
    const sub = subscribers.find(s => s.email === user.email) || null;
    const baseDateStr = sub?.[field] || null;
    const base = baseDateStr ? new Date(baseDateStr) : new Date();
    const newDate = addDays(base, days).toISOString();

    if (sub) {
      const { error } = await supabase
        .from('subscribers')
        .update({ [field]: newDate, subscribed: field === 'subscription_end' ? true : sub.subscribed })
        .eq('id', sub.id);
      if (error) throw error;
      setSubscribers(prev => prev.map(x => x.id === sub.id ? { ...x, [field]: newDate, subscribed: field === 'subscription_end' ? true : x.subscribed, updated_at: new Date().toISOString() } as SubscriberRow : x));
    } else {
      const payload: any = {
        email: user.email,
        user_id: user.id || user.user_id || null,
        subscribed: field === 'subscription_end',
        [field]: newDate,
      };
      const { data, error } = await supabase.from('subscribers').insert(payload).select().single();
      if (error) throw error;
      if (data) setSubscribers(prev => [...prev, data as SubscriberRow]);
    }

    toast({ title: 'Prazo atualizado', description: `+${days} dias em ${field === 'trial_end' ? 'trial' : 'assinatura'}.` });
  } catch (e: any) {
    toast({ title: 'Erro ao atualizar prazos', description: e.message, variant: 'destructive' });
  }
}

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
              <TableHead>Trial</TableHead>
              <TableHead>Assinatura</TableHead>
              <TableHead className="w-32">Papel</TableHead>
              <TableHead className="w-72">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
{loading ? (
              <TableRow><TableCell colSpan={6}>Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6}>Nenhum usuário encontrado.</TableCell></TableRow>
            ) : (
              filtered.map(u => {
                const uid = (u.id || u.user_id || "");
                const trialDays = getDaysRemaining(u.subscriber?.trial_end || null);
                const subDays = getDaysRemaining(u.subscriber?.subscription_end || null);
                return (
                  <TableRow key={u.email}>
                    <TableCell>{u.full_name || "-"}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      {u.subscriber?.trial_end ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">até {formatDate(u.subscriber.trial_end)}</Badge>
                          {trialDays !== null && <span className="text-muted-foreground text-sm">({trialDays}d)</span>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.subscriber?.subscription_end ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">até {formatDate(u.subscriber.subscription_end)}</Badge>
                          {subDays !== null && <span className="text-muted-foreground text-sm">({subDays}d)</span>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isAdmin(uid) ? <Badge variant="default">admin</Badge> : <Badge variant="secondary">user</Badge>}
                    </TableCell>
                    <TableCell className="space-x-2">
                      {isAdmin(uid) ? (
                        <Button variant="outline" size="sm" onClick={() => demote(uid)}>Remover admin</Button>
                      ) : (
                        <Button size="sm" onClick={() => promote(uid)}>Promover a admin</Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => addDaysTo(u, 'trial_end', 30)}>Trial +30d</Button>
                      <Button variant="outline" size="sm" onClick={() => addDaysTo(u, 'subscription_end', 30)}>Assin. +30d</Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
