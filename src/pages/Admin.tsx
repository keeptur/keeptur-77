import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SettingsRow {
  id: string;
  trial_days: number;
  price_per_seat_cents: number;
  currency: string;
  stripe_publishable_key?: string | null;
  stripe_secret_key?: string | null;
}

export default function AdminPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingsRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState<number>(1);
  const [status, setStatus] = useState<{ subscribed?: boolean; subscription_tier?: string | null; subscription_end?: string | null } | null>(null);

  useEffect(() => {
    document.title = "Admin | Keeptur";
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { data, error } = await supabase.from("settings").select("*").limit(1).maybeSingle();
        if (error) throw error;
        if (mounted) setSettings(data as SettingsRow);
      } catch (err: any) {
        toast({ title: "Erro ao carregar configurações", description: err.message, variant: "destructive" });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    // auto-refresh subscription on enter
    refreshStatus().catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const priceBRL = useMemo(() => {
    const cents = settings?.price_per_seat_cents ?? 3990;
    return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }, [settings]);

  const saveSettings = async () => {
    if (!settings) return;
    try {
      const { error } = await supabase
        .from("settings")
        .update({
          trial_days: settings.trial_days,
          price_per_seat_cents: settings.price_per_seat_cents,
          stripe_publishable_key: settings.stripe_publishable_key ?? null,
          stripe_secret_key: settings.stripe_secret_key ?? null,
        })
        .eq("id", settings.id);
      if (error) throw error;
      toast({ title: "Configurações salvas" });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
  };

  const startCheckout = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", { body: { quantity } });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("URL do checkout não recebida");
      }
    } catch (err: any) {
      toast({ title: "Erro ao iniciar checkout", description: err.message, variant: "destructive" });
    }
  };

  const openPortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Erro ao abrir portal", description: err.message, variant: "destructive" });
    }
  };

  async function refreshStatus() {
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      setStatus(data as any);
    } catch (err: any) {
      // silent
    }
  }

  if (loading) return <div className="p-6">Carregando...</div>;

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Admin Keeptur</h1>
        <p className="text-muted-foreground">Gerencie plano, trial e assinatura.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Assinatura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Status: {status?.subscribed ? "ATIVA" : "INATIVA"}
              {status?.subscription_tier ? ` • ${status.subscription_tier}` : ""}
            </p>
            <div className="flex items-end gap-3">
              <div>
                <Label>Quantidade de assentos</Label>
                <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value || "1", 10))} />
              </div>
              <Button onClick={startCheckout}>Assinar/Comprar</Button>
              <Button variant="secondary" onClick={openPortal}>Gerenciar</Button>
              <Button variant="outline" onClick={refreshStatus}>Atualizar</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Configurações</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Trial (dias)</Label>
              <Input type="number" min={0} value={settings?.trial_days ?? 7} onChange={(e) => setSettings((s) => (s ? { ...s, trial_days: parseInt(e.target.value || "0", 10) } : s))} />
            </div>
            <div>
              <Label>Preço por usuário (centavos)</Label>
              <Input type="number" min={0} value={settings?.price_per_seat_cents ?? 3990} onChange={(e) => setSettings((s) => (s ? { ...s, price_per_seat_cents: parseInt(e.target.value || "0", 10) } : s))} />
            </div>
            <div>
              <Label>Stripe Publishable Key</Label>
              <Input
                type="text"
                placeholder="pk_live_... ou pk_test_..."
                value={settings?.stripe_publishable_key ?? ""}
                onChange={(e) => setSettings((s) => (s ? { ...s, stripe_publishable_key: e.target.value } : s))}
              />
            </div>
            <div>
              <Label>Stripe Secret Key</Label>
              <Input
                type="password"
                placeholder="sk_live_... ou sk_test_..."
                value={settings?.stripe_secret_key ?? ""}
                onChange={(e) => setSettings((s) => (s ? { ...s, stripe_secret_key: e.target.value } : s))}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={saveSettings}>Salvar</Button>
            </div>
            <div className="md:col-span-3 text-sm text-muted-foreground">Preço atual: {priceBRL}</div>
          </CardContent>
        </Card>
      </div>

      {/* ... keep existing code (painéis adicionais serão adicionados em próximos passos) */}
    </div>
  );
}
