import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { addDays } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  created_at?: string | null;
}

interface RoleRow {
  user_id: string;
  role: string;
}

interface SubscriberRow {
  id: string;
  user_id: string | null;
  email: string;
  display_name: string | null;
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
const [periodFilter, setPeriodFilter] = useState<'all'|'7'|'30'|'90'>('all');

const [open, setOpen] = useState(false);
const [newEmail, setNewEmail] = useState("");
const [newName, setNewName] = useState("");
const [newIsAdmin, setNewIsAdmin] = useState(true);
const [creating, setCreating] = useState(false);

const reload = async () => {
  const [{ data: p }, { data: r }, { data: s }] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, created_at"),
    supabase.from("user_roles").select("user_id, role"),
    supabase.from("subscribers").select(
      "id, user_id, email, display_name, subscribed, subscription_tier, trial_start, trial_end, subscription_end, created_at, updated_at"
    ),
  ]);
  setProfiles((p || []) as any);
  setRoles((r || []) as any);
  setSubscribers((s || []) as any);
};

const handleCreateUser = async () => {
  if (!newEmail) return;
  setCreating(true);
  try {
    const { error } = await supabase.functions.invoke('create-admin-user', {
      body: { email: newEmail, name: newName, makeAdmin: newIsAdmin }
    });
    if (error) throw error;
    toast({ title: "Usuário criado", description: "Convite enviado por e-mail." });
    setOpen(false);
    setNewEmail(""); setNewName(""); setNewIsAdmin(true);
    await reload();
  } catch (e:any) {
    toast({ title: "Erro ao criar usuário", description: e.message || String(e), variant: "destructive" });
  } finally {
    setCreating(false);
  }
};

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: p }, { data: r }, { data: s }] = await Promise.all([
          supabase.from("profiles").select("id, email, full_name, created_at"),
          supabase.from("user_roles").select("user_id, role"),
          supabase.from("subscribers").select(
            "id, user_id, email, subscribed, subscription_tier, trial_start, trial_end, subscription_end, created_at, updated_at"
          ),
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

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'trial' | 'inactive'>('all');
  const [planFilter, setPlanFilter] = useState<'all' | 'basic' | 'pro' | 'enterprise'>('all');

  const getStatus = (u: CombinedUser): 'active' | 'trial' | 'inactive' => {
    const uid = (u.id || u.user_id || '');
    if (uid && isAdmin(uid)) return 'active'; // Super admin sempre ativo/vitalício
    const now = new Date();
    const sub = u.subscriber;
    const active = !!(sub?.subscribed || (sub?.subscription_end && new Date(sub.subscription_end) > now));
    if (active) return 'active';
    const inTrial = !!(sub?.trial_end && new Date(sub.trial_end) > now);
    return inTrial ? 'trial' : 'inactive';
  };

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
    let list = combinedUsers;
    if (q) {
      const s = q.toLowerCase();
      list = list.filter((u) => u.email?.toLowerCase()?.includes(s) || (u.full_name || "").toLowerCase().includes(s));
    }
    if (statusFilter !== 'all') {
      list = list.filter(u => getStatus(u) === statusFilter);
    }
    if (planFilter !== 'all') {
      list = list.filter(u => (u.subscriber?.subscription_tier || '').toLowerCase() === planFilter);
    }
    return list;
  }, [q, combinedUsers, statusFilter, planFilter]);

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Últimos Usuários Cadastrados</h3>
        <Button onClick={() => setOpen(true)}>Criar Usuário</Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Buscar por nome ou email..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1 text-xs rounded-button bg-card border text-muted-foreground"
          >
            <option value="all">Todos</option>
            <option value="active">Ativo</option>
            <option value="trial">Trial</option>
            <option value="inactive">Inativo</option>
          </select>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value as any)}
            className="px-3 py-1 text-xs rounded-button bg-card border text-muted-foreground"
          >
            <option value="all">Planos</option>
            <option value="basic">Básico</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </div>

      <Card className="rounded-xl p-0 border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-medium text-xs text-muted-foreground">Usuário</th>
                <th className="text-left py-3 px-2 font-medium text-xs text-muted-foreground">E-mail</th>
                <th className="text-left py-3 px-2 font-medium text-xs text-muted-foreground">Plano</th>
                <th className="text-left py-3 px-2 font-medium text-xs text-muted-foreground">Status</th>
                <th className="text-left py-3 px-2 font-medium text-xs text-muted-foreground">Trial +Dias</th>
                <th className="text-left py-3 px-2 font-medium text-xs text-muted-foreground">Assinatura +Dias</th>
                <th className="text-left py-3 px-2 font-medium text-xs text-muted-foreground">Ações</th>
                <th className="text-left py-3 px-2 font-medium text-xs text-muted-foreground">Data</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td className="py-6 px-2 text-sm text-muted-foreground" colSpan={8}>Carregando...</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td className="py-6 px-2 text-sm text-muted-foreground" colSpan={8}>Nenhum usuário encontrado.</td></tr>
              )}
              {!loading && filtered.map((u) => {
                const initials = (u.full_name || u.email).split(/\s|@/).filter(Boolean).slice(0,2).map(s=>s[0]).join('').toUpperCase();
                const idShort = (u.id || u.user_id || '').slice(0,8) || '—';
                const status = getStatus(u);
                const planRaw = (u.subscriber?.subscription_tier || '').toLowerCase();
                const plan = planRaw ? (planRaw === 'pro' ? 'Pro' : planRaw === 'enterprise' ? 'Enterprise' : 'Básico') : '—';
                const subCreated = u.subscriber?.created_at || undefined;
                const profileCreated = (profiles.find(p=>p.email===u.email)?.created_at) as string | undefined;
                const dateStr = (subCreated || profileCreated) ? new Date(subCreated || profileCreated!).toLocaleDateString() : '—';

                const badgeStyle = (kind: 'plan-pro'|'plan-enterprise'|'plan-basic'|'status-active'|'status-trial'|'status-inactive') => {
                  switch(kind){
                    case 'plan-pro': return { backgroundColor: 'hsl(var(--warning) / 0.15)', color: 'hsl(var(--warning))' } as React.CSSProperties;
                    case 'plan-enterprise': return { backgroundColor: 'hsl(var(--primary) / 0.15)', color: 'hsl(var(--primary))' } as React.CSSProperties;
                    case 'plan-basic': return { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--foreground))' } as React.CSSProperties;
                    case 'status-active': return { backgroundColor: 'hsl(var(--success) / 0.15)', color: 'hsl(var(--success))' } as React.CSSProperties;
                    case 'status-trial': return { backgroundColor: 'hsl(var(--primary) / 0.15)', color: 'hsl(var(--primary))' } as React.CSSProperties;
                    default: return { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' } as React.CSSProperties;
                  }
                };

                return (
                  <tr key={u.email} className="border-b last:border-b-0">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-medium grid place-items-center">
                          {initials}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{u.full_name || '—'}</p>
                          <p className="text-xs text-muted-foreground">ID: {idShort}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-sm break-words whitespace-normal max-w-[260px]">{u.email}</td>
                    <td className="py-3 px-2">
                      <span className="px-2 py-1 rounded-full text-xs font-medium" style={
                        plan==='Pro' ? badgeStyle('plan-pro') : plan==='Enterprise' ? badgeStyle('plan-enterprise') : badgeStyle('plan-basic')
                      }>{plan}</span>
                    </td>
                    <td className="py-3 px-2">
                      <span className="px-2 py-1 rounded-full text-xs font-medium" style={
                        status==='active' ? badgeStyle('status-active') : status==='trial' ? badgeStyle('status-trial') : badgeStyle('status-inactive')
                      }>{status==='active' ? 'Ativo' : status==='trial' ? 'Trial' : 'Inativo'}</span>
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        placeholder="+"
                        className="w-16 px-2 py-1 text-xs border rounded text-center"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const days = parseInt(e.currentTarget.value);
                            if (days > 0) {
                              addDaysTo(u, 'trial_end', days);
                              e.currentTarget.value = '';
                            }
                          }
                        }}
                        onBlur={(e) => {
                          const days = parseInt(e.currentTarget.value);
                          if (days > 0) {
                            addDaysTo(u, 'trial_end', days);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        {u.subscriber?.trial_end ? `${getDaysRemaining(u.subscriber.trial_end) || 0}d` : '-'}
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        placeholder="+"
                        className="w-16 px-2 py-1 text-xs border rounded text-center"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const days = parseInt(e.currentTarget.value);
                            if (days > 0) {
                              addDaysTo(u, 'subscription_end', days);
                              e.currentTarget.value = '';
                            }
                          }
                        }}
                        onBlur={(e) => {
                          const days = parseInt(e.currentTarget.value);
                          if (days > 0) {
                            addDaysTo(u, 'subscription_end', days);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        {u.subscriber?.subscription_end ? `${getDaysRemaining(u.subscriber.subscription_end) || 0}d` : '-'}
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex gap-1">
                        {u.id && !isAdmin(u.id) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs"
                            onClick={() => promote(u.id!)}
                          >
                            Admin
                          </Button>
                        )}
                        {u.id && isAdmin(u.id) && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-6 px-2 text-xs"
                            onClick={() => demote(u.id!)}
                          >
                            Remover
                          </Button>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-xs text-muted-foreground">{dateStr}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="usuario@exemplo.com"
              />
            </div>
            <div>
              <Label htmlFor="name">Nome (opcional)</Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome do usuário"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                id="admin"
                type="checkbox"
                checked={newIsAdmin}
                onChange={(e) => setNewIsAdmin(e.target.checked)}
              />
              <Label htmlFor="admin">Criar como administrador</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateUser} disabled={creating || !newEmail}>
              {creating ? "Criando..." : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
