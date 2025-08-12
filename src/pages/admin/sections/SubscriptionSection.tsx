
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface SettingsRow {
  id: string;
  trial_days: number;
  price_per_seat_cents: number;
  currency: string;
  stripe_publishable_key?: string | null;
  stripe_secret_key?: string | null;
}

export default function SubscriptionSection() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingsRow | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [status, setStatus] = useState<{ subscribed?: boolean; subscription_tier?: string | null; subscription_end?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data, error } = await supabase.from("settings").select("*").limit(1).maybeSingle();
      if (!mounted) return;
      if (error) {
        toast({ title: "Erro ao carregar configurações", description: error.message, variant: "destructive" });
      } else {
        setSettings(data as SettingsRow);
      }
      setLoading(false);
    };
    load();
    refreshStatus().catch(() => {});
    return () => { mounted = false; };
  }, []);

  const priceBRL = useMemo(() => {
    const cents = settings?.price_per_seat_cents ?? 3990;
    return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }, [settings]);

  const startCheckout = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", { body: { quantity } });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
      else throw new Error("URL do checkout não recebida");
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
    } catch {
      // silencioso
    }
  }

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Assinatura</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Status: {status?.subscribed ? "ATIVA" : "INATIVA"}
            {status?.subscription_tier ? ` • ${status.subscription_tier}` : ""}
          </p>
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="sm:w-40">
              <Label>Assentos</Label>
              <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value || "1", 10))} />
            </div>
            <div className="flex gap-2">
              <Button onClick={startCheckout}>Assinar/Comprar</Button>
              <Button variant="secondary" onClick={openPortal}>Gerenciar</Button>
              <Button variant="outline" onClick={refreshStatus}>Atualizar</Button>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">Preço atual: {priceBRL} por usuário/mês</div>
        </CardContent>
      </Card>

      <Card className="h-full">
        <CardHeader>
          <CardTitle>Informações do Plano</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Trial (dias)</Label>
            <Input type="number" min={0} value={settings?.trial_days ?? 7} disabled />
          </div>
          <div>
            <Label>Preço por usuário (centavos)</Label>
            <Input type="number" min={0} value={settings?.price_per_seat_cents ?? 3990} disabled />
          </div>
          <div>
            <Label>Stripe Publishable Key</Label>
            <Input type="text" value={settings?.stripe_publishable_key ?? ""} disabled />
          </div>
          <div>
            <Label>Stripe Secret Key</Label>
            <Input type="password" value={settings?.stripe_secret_key ?? ""} disabled />
          </div>
          <p className="md:col-span-2 text-sm text-muted-foreground">
            Edite estes valores em Configurações &gt; Plano/Stripe.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
