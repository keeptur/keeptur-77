
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface PlanKit {
  id: string;
  name: string;
  seats: number;
  price_cents: number;
  currency: string;
  active: boolean;
  sort_order: number;
}

export default function PlansSection() {
  const { toast } = useToast();
  const [list, setList] = useState<PlanKit[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<Omit<PlanKit, "id">>({
    name: "",
    seats: 1,
    price_cents: 3990,
    currency: "BRL",
    active: true,
    sort_order: 100,
  });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("plan_kits").select("*").order("sort_order", { ascending: true });
    if (error) {
      toast({ title: "Erro ao carregar planos", description: error.message, variant: "destructive" });
    } else {
      setList((data || []) as any);
    }
    setLoading(false);
  };

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  const formatBRL = (cents: number) =>
    (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const create = async () => {
    const { error } = await supabase.from("plan_kits").insert(form as any);
    if (error) {
      toast({ title: "Erro ao criar plano", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Plano criado" });
      setForm({ name: "", seats: 1, price_cents: 3990, currency: "BRL", active: true, sort_order: 100 });
      load();
    }
  };

  const update = async (id: string, patch: Partial<PlanKit>) => {
    const { error } = await supabase.from("plan_kits").update(patch as any).eq("id", id);
    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Atualizado" });
      load();
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("plan_kits").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Plano removido" });
      load();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Novo kit de plano</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-2">
            <Label>Nome</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Equipe (3)" />
          </div>
          <div>
            <Label>Assentos</Label>
            <Input type="number" min={1} value={form.seats} onChange={(e) => setForm({ ...form, seats: parseInt(e.target.value || "1", 10) })} />
          </div>
          <div>
            <Label>Preço (centavos)</Label>
            <Input type="number" min={0} value={form.price_cents} onChange={(e) => setForm({ ...form, price_cents: parseInt(e.target.value || "0", 10) })} />
          </div>
          <div>
            <Label>Moeda</Label>
            <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
          </div>
          <div className="flex items-end gap-3">
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <span className="text-sm">Ativo</span>
            </div>
            <Button onClick={create}>Criar</Button>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border bg-background overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="w-28">Assentos</TableHead>
              <TableHead className="w-40">Preço</TableHead>
              <TableHead className="w-24">Ativo</TableHead>
              <TableHead className="w-40">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5}>Carregando...</TableCell></TableRow>
            ) : list.length === 0 ? (
              <TableRow><TableCell colSpan={5}>Nenhum plano cadastrado.</TableCell></TableRow>
            ) : (
              list.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.seats}</TableCell>
                  <TableCell>{formatBRL(p.price_cents)}</TableCell>
                  <TableCell>{p.active ? "Sim" : "Não"}</TableCell>
                  <TableCell className="space-x-2">
                    <Button variant="secondary" size="sm" onClick={() => update(p.id, { active: !p.active })}>
                      {p.active ? "Desativar" : "Ativar"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => update(p.id, { sort_order: (p.sort_order || 100) - 1 })}>
                      Subir
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => update(p.id, { sort_order: (p.sort_order || 100) + 1 })}>
                      Descer
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => remove(p.id)}>Excluir</Button>
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
