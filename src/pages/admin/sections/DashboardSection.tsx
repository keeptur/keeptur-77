
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface KPIs {
  users: number;
  admins: number;
  accounts: number;
  activeSubs: number;
  inTrial: number;
}

export default function DashboardSection() {
  const [kpis, setKpis] = useState<KPIs>({ users: 0, admins: 0, accounts: 0, activeSubs: 0, inTrial: 0 });

  useEffect(() => {
    const load = async () => {
      // Perfis
      const { data: profiles } = await supabase.from("profiles").select("id, email");
      // Admins
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      // Contas e status
      const { data: accounts } = await supabase.from("accounts").select("id, subscribed, trial_start, trial_end");

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

      setKpis({ users, admins, accounts: accs, activeSubs, inTrial });
    };
    load().catch(() => {});
  }, []);

  const Box = ({ title, value }: { title: string; value: number }) => (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <Box title="Usuários" value={kpis.users} />
      <Box title="Admins" value={kpis.admins} />
      <Box title="Contas" value={kpis.accounts} />
      <Box title="Assinaturas ativas" value={kpis.activeSubs} />
      <Box title="Em trial" value={kpis.inTrial} />
    </div>
  );
}
