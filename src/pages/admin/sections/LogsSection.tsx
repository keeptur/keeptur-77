
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

interface LogRow {
  id: string;
  user_id: string;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

export default function LogsSection() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("access_logs").select("*").order("created_at", { ascending: false }).limit(100);
      setLogs((data || []) as any);
      setLoading(false);
    };
    load().catch(() => setLoading(false));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logs de Acesso (100 mais recentes)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border bg-background overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>User-Agent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4}>Carregando...</TableCell></TableRow>
              ) : logs.length === 0 ? (
                <TableRow><TableCell colSpan={4}>Nenhum log.</TableCell></TableRow>
              ) : (
                logs.map(l => (
                  <TableRow key={l.id}>
                    <TableCell>{new Date(l.created_at).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="font-mono text-xs">{l.user_id}</TableCell>
                    <TableCell>{l.ip || "-"}</TableCell>
                    <TableCell className="max-w-[420px] truncate">{l.user_agent || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
