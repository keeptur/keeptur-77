import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
interface KPIs {
  users: number;
  admins: number;
  accounts: number;
  activeSubs: number;
  inTrial: number;
}
interface ProfileLite {
  id: string;
  email: string;
  full_name?: string | null;
  created_at?: string | null;
}
export default function DashboardSection() {
  const [kpis, setKpis] = useState<KPIs>({
    users: 0,
    admins: 0,
    accounts: 0,
    activeSubs: 0,
    inTrial: 0
  });
  const [recent, setRecent] = useState<ProfileLite[]>([]);
  useEffect(() => {
    const load = async () => {
      // Perfis (para métricas e lista recente)
      const {
        data: profiles
      } = await supabase.from("profiles").select("id, email, full_name, created_at");
      // Admins
      const {
        data: roles
      } = await supabase.from("user_roles").select("user_id, role");
      // Contas e status (mantém compatibilidade atual)
      const {
        data: accounts
      } = await supabase.from("accounts").select("id, subscribed, trial_start, trial_end");
      const users = profiles?.length || 0;
      const admins = (roles || []).filter(r => r.role === "admin").length;
      const accs = accounts?.length || 0;
      const activeSubs = (accounts || []).filter(a => a.subscribed).length;
      const now = new Date();
      const inTrial = (accounts || []).filter(a => {
        if (!a.trial_start || !a.trial_end) return false;
        const end = new Date(a.trial_end as any);
        return end > now && !a.subscribed;
      }).length;
      setKpis({
        users,
        admins,
        accounts: accs,
        activeSubs,
        inTrial
      });
      const rec = (profiles || []).slice().sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, 5) as ProfileLite[];
      setRecent(rec);
    };
    load().catch(() => {});
  }, []);
  const revenueData = useMemo(() => [{
    d: "01/08",
    v: 85000
  }, {
    d: "03/08",
    v: 92000
  }, {
    d: "05/08",
    v: 88000
  }, {
    d: "07/08",
    v: 105000
  }, {
    d: "09/08",
    v: 118000
  }, {
    d: "11/08",
    v: 125000
  }, {
    d: "13/08",
    v: 127450
  }], []);
  const usersData = useMemo(() => [{
    d: "01/08",
    v: 2450
  }, {
    d: "03/08",
    v: 2520
  }, {
    d: "05/08",
    v: 2680
  }, {
    d: "07/08",
    v: 2750
  }, {
    d: "09/08",
    v: 2780
  }, {
    d: "11/08",
    v: 2820
  }, {
    d: "13/08",
    v: 2847
  }], []);
  return <div className="space-y-6">
      {/* Cards KPI com gradientes como no layout de referência */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="rounded-xl overflow-hidden" style={{
        background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
      }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium">Faturamento Total</p>
                <p className="text-white text-2xl font-bold">R$ 0</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">R$</span>
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-white/80 text-sm">+0% este período</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl overflow-hidden" style={{
        background: "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)"
      }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium">Usuários Ativos</p>
                <p className="text-white text-2xl font-bold">{kpis.users.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">👤</span>
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-white/80 text-sm">+0% este período</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl overflow-hidden" style={{
        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)"
      }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium">Assinaturas Ativas</p>
                <p className="text-white text-2xl font-bold">{kpis.activeSubs.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">★</span>
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-white/80 text-sm">+0% este período</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl overflow-hidden" style={{
        background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
      }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium">Em Trial</p>
                <p className="text-white text-2xl font-bold">{kpis.inTrial.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">⏱</span>
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-white/80 text-sm">-0% este período</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-xl">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg">Evolução do Faturamento</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="d" tickLine={false} axisLine={false} stroke="#64748b" fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} stroke="#64748b" fontSize={12} />
                  <Tooltip cursor={{
                  stroke: "#e2e8f0"
                }} />
                  <Line type="monotone" dataKey="v" stroke="#57b5e7" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg">Crescimento de Usuários</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={usersData}>
                  <CartesianGrid vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="d" tickLine={false} axisLine={false} stroke="#64748b" fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} stroke="#64748b" fontSize={12} />
                  <Tooltip cursor={{
                  stroke: "#e2e8f0"
                }} />
                  <Line type="monotone" dataKey="v" stroke="#8dd3c7" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 rounded-xl">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg">Últimos Usuários Cadastrados</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-xs text-muted-foreground">Usuário</th>
                    <th className="text-left py-3 px-2 font-medium text-xs text-muted-foreground">E-mail</th>
                    <th className="text-left py-3 px-2 font-medium text-xs text-muted-foreground">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map(u => <tr key={u.id} className="border-b last:border-b-0">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-500 text-white text-xs font-medium grid place-items-center">
                            {(u.full_name || u.email)?.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{u.full_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">ID: {u.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-sm break-words whitespace-normal max-w-[260px]">{u.email}</td>
                      <td className="py-3 px-2 text-xs text-muted-foreground">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
                    </tr>)}
                  {recent.length === 0 && <tr>
                      <td className="py-6 px-2 text-sm text-muted-foreground" colSpan={3}>Nenhum usuário recente.</td>
                    </tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Métricas de Conversão</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm text-muted-foreground">Trial para Pagante</span>
                  </div>
                  <span className="text-sm font-semibold">68.5%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{
                  width: "68.5%"
                }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-sm text-muted-foreground">Taxa de Retenção</span>
                  </div>
                  <span className="text-sm font-semibold">84.2%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{
                  width: "84.2%"
                }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm text-muted-foreground">Taxa de Churn</span>
                  </div>
                  <span className="text-sm font-semibold">4.8%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full" style={{
                  width: "4.8%"
                }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Ticket Médio</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-2">
              <p className="text-3xl font-bold text-primary">R$ 89,50</p>
              <p className="text-sm text-muted-foreground">Por usuário/mês</p>
              <div className="text-green-600 text-sm">+12% vs período anterior</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>;
}