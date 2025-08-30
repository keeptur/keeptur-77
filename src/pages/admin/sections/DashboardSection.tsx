import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

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

/**
 * Dashboard principal para o painel de administração.
 *
 * Esta implementação remove dados mockados e substitui por métricas reais
 * calculadas a partir das tabelas do Supabase. As métricas de conversão (trial
 * → pagante, retenção e churn) são derivadas de `kpis`. Os gráficos são
 * construídos a partir de eventos reais (criação de perfis e contas) nos
 * últimos 7 dias. Além disso, os cartões de conversão e ticket médio são
 * apresentados lado a lado em telas grandes.
 */
export default function DashboardSection() {
  const [kpis, setKpis] = useState<KPIs>({
    users: 0,
    admins: 0,
    accounts: 0,
    activeSubs: 0,
    inTrial: 0,
  });
  const [recent, setRecent] = useState<ProfileLite[]>([]);
  const [revenueData, setRevenueData] = useState<{ d: string; v: number }[]>([]);
  const [usersData, setUsersData] = useState<{ d: string; v: number }[]>([]);
  const [realMetrics, setRealMetrics] = useState({
    totalRevenue: 0,
    revenueGrowth: 0,
    userGrowth: 0,
    subsGrowth: 0,
    averageTicket: 0,
  });

  useEffect(() => {
    const load = async () => {
      // Métricas básicas do banco usando função segura
      const adminData = await api.getAdminMetrics();

      const [{ data: profiles }, { data: roles }, { data: accounts }, { data: subscribers }] = await Promise.all([
        supabase.from("profiles").select("id, email, full_name, created_at"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("accounts").select("id, subscribed, trial_start, trial_end"),
        supabase
          .from('subscribers')
          .select('id, email, subscribed, trial_start, trial_end, subscription_end, updated_at, stripe_customer_id')
      ]);

      // KPIs
      const users = profiles?.length || 0;
      const admins = (roles || []).filter((r) => r.role === 'admin').length;
      const accs = accounts?.length || 0;
      const now = new Date();
      const activeSubs = (subscribers || []).filter((s: any) => {
        const subscribed = !!s.subscribed;
        const subEnd = s.subscription_end ? new Date(s.subscription_end as any) : null;
        return subscribed || (subEnd && subEnd > now);
      }).length;
      const inTrial = (subscribers || []).filter((s: any) => {
        const subscribed = !!s.subscribed;
        const subEnd = s.subscription_end ? new Date(s.subscription_end as any) : null;
        const trialEnd = s.trial_end ? new Date(s.trial_end as any) : null;
        return !subscribed && (!subEnd || subEnd <= now) && trialEnd && trialEnd > now;
      }).length;
      setKpis({ users, admins, accounts: accs, activeSubs, inTrial });

      // Últimos usuários
      const rec = (profiles || [])
        .slice()
        .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, 5) as ProfileLite[];
      setRecent(rec);

      // Série temporal dos últimos 7 dias
      const days: string[] = [];
      const userCountByDay: Record<string, number> = {};
      const accountCountByDay: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        days.push(key);
        userCountByDay[key] = 0;
        accountCountByDay[key] = 0;
      }
      // Contar perfis por dia
      (profiles || []).forEach((p) => {
        if (!p.created_at) return;
        const date = new Date(p.created_at);
        const key = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (key in userCountByDay) userCountByDay[key]++;
      });
      // Contar novas contas/assinaturas confirmadas por dia usando subscribers.updated_at
      (subscribers || []).forEach((s: any) => {
        if (!s.updated_at || !s.subscribed) return;
        const date = new Date(s.updated_at);
        const key = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (key in accountCountByDay) accountCountByDay[key]++;
      });
      setUsersData(days.map((d) => ({ d, v: userCountByDay[d] })));
      setRevenueData(days.map((d) => ({ d, v: accountCountByDay[d] })));

      // ========= Receita real via Stripe (mesma lógica da página de Usuários) =========
      const processedCustomers = new Set<string>();
      const allPayments: { id: string; amount: number; status: string; date: string }[] = [];
      for (const sub of subscribers || []) {
        if (!sub?.stripe_customer_id || processedCustomers.has(sub.stripe_customer_id)) continue;
        processedCustomers.add(sub.stripe_customer_id);
        const { data, error } = await supabase.functions.invoke('get-payment-history', {
          body: { customer_email: sub.email }
        });
        if (error) continue;
        const list = data?.payment_history || [];
        for (const p of list) {
          allPayments.push({ id: p.id, amount: p.amount, status: p.status, date: p.date });
        }
      }
      // Unificar por id e manter apenas pagos
      const uniquePaid = allPayments
        .filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i)
        .filter((p) => p.status === 'paid');

      const totalRevenueCents = uniquePaid.reduce((sum, p) => sum + (p.amount || 0), 0);
      // Ticket médio por fatura paga
      const averageTicketCents = uniquePaid.length > 0 ? Math.round(totalRevenueCents / uniquePaid.length) : 0;

      // Crescimento: últimos 7 dias vs 7 anteriores
      const byDay: Record<string, number> = {};
      uniquePaid.forEach((p) => {
        const d = new Date(p.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        byDay[key] = (byDay[key] || 0) + (p.amount || 0);
      });
      const today = new Date();
      const sumRange = (startOffset: number, endOffset: number) => {
        let sum = 0;
        for (let i = startOffset; i <= endOffset; i++) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          sum += byDay[key] || 0;
        }
        return sum;
      };
      const last7 = sumRange(0, 6);
      const prev7 = sumRange(7, 13);
      const revenueGrowth = prev7 > 0 ? Number((((last7 - prev7) / prev7) * 100).toFixed(1)) : 0;

      // Ajustar métricas reais (prioriza Stripe ao invés da view)
      setRealMetrics({
        totalRevenue: totalRevenueCents,
        revenueGrowth,
        userGrowth: adminData?.subscription_growth_percentage || 0,
        subsGrowth: adminData?.subscription_growth_percentage || 0,
        averageTicket: averageTicketCents,
      });
    };
    load().catch(() => {});
  }, []);

  // Métricas de conversão calculadas dinamicamente
  const conversionRates = useMemo(() => {
    const trialBase = kpis.activeSubs + kpis.inTrial;
    const trialToPaid = trialBase > 0 ? (kpis.activeSubs / trialBase) * 100 : 0;
    const retention = kpis.accounts > 0 ? (kpis.activeSubs / kpis.accounts) * 100 : 0;
    const churn = kpis.accounts > 0 ? ((kpis.accounts - kpis.activeSubs) / kpis.accounts) * 100 : 0;
    return {
      trialToPaid: trialToPaid.toFixed(1),
      retention: retention.toFixed(1),
      churn: churn.toFixed(1),
    };
  }, [kpis]);

  // Ticket médio: aqui ainda é fictício por ausência de dados financeiros
  const ticketAverage = useMemo(() => {
    // Placeholder: total de contas dividido por assinantes ativos
    return kpis.activeSubs > 0 ? (kpis.accounts / kpis.activeSubs).toFixed(2) : '0.00';
  }, [kpis]);

  return (
    <div className="space-y-6">
      {/* Cards KPI com gradientes */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="rounded-xl overflow-hidden" style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium">Faturamento Total</p>
                <p className="text-white text-2xl font-bold">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((realMetrics.totalRevenue || 0) / 100)}
                </p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">R$</span>
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-white/80 text-sm">
                {realMetrics.revenueGrowth > 0 ? '+' : ''}{realMetrics.revenueGrowth}% este período
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl overflow-hidden" style={{ background: "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)" }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium">Usuários</p>
                <p className="text-white text-2xl font-bold">{kpis.users.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl"></span>
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-white/80 text-sm">
                {realMetrics.userGrowth > 0 ? '+' : ''}{realMetrics.userGrowth}% este período
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl overflow-hidden" style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}>
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
              <span className="text-white/80 text-sm">
                {realMetrics.subsGrowth > 0 ? '+' : ''}{realMetrics.subsGrowth}% este período
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl overflow-hidden" style={{ background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)" }}>
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
              <span className="text-white/80 text-sm">
                {kpis.inTrial === 0 ? 'Nenhum trial ativo' : `${kpis.inTrial} trial(s) ativo(s)`}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Gráficos de evolução */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-xl">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg">Evolução de Perfis</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={usersData}>
                  <CartesianGrid vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="d" tickLine={false} axisLine={false} stroke="#64748b" fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} stroke="#64748b" fontSize={12} />
                  <Tooltip cursor={{ stroke: "#e2e8f0" }} />
                  <Line type="monotone" dataKey="v" stroke="#57b5e7" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg">Evolução de Contas</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="d" tickLine={false} axisLine={false} stroke="#64748b" fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} stroke="#64748b" fontSize={12} />
                  <Tooltip cursor={{ stroke: "#e2e8f0" }} />
                  <Line type="monotone" dataKey="v" stroke="#8dd3c7" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Últimos usuários e métricas de conversão/ticket */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  {recent.map((u) => (
                    <tr key={u.id} className="border-b last:border-b-0">
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
                      <td className="py-3 px-2 text-xs text-muted-foreground">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                  {recent.length === 0 && (
                    <tr>
                      <td className="py-6 px-2 text-sm text-muted-foreground" colSpan={3}>
                        Nenhum usuário recente.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
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
                <span className="text-sm font-semibold">{conversionRates.trialToPaid}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${conversionRates.trialToPaid}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm text-muted-foreground">Taxa de Retenção</span>
                </div>
                <span className="text-sm font-semibold">{conversionRates.retention}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${conversionRates.retention}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm text-muted-foreground">Taxa de Churn</span>
                </div>
                <span className="text-sm font-semibold">{conversionRates.churn}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-red-500 h-2 rounded-full" style={{ width: `${conversionRates.churn}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Ticket Médio</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-2">
            <p className="text-3xl font-bold text-primary">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((realMetrics.averageTicket || 0) / 100)}
            </p>
            <p className="text-sm text-muted-foreground">Por usuário/mês</p>
            <div className="text-green-600 text-sm">
              {kpis.activeSubs > 0 ? `${kpis.activeSubs} assinatura(s) ativa(s)` : 'Nenhuma assinatura ativa'}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}