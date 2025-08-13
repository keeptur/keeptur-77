
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface SettingsRow {
  id: string;
  trial_days: number;
  price_per_seat_cents: number;
  currency: string;
  stripe_publishable_key?: string | null;
}

export default function SettingsSection() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingsRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data, error } = await supabase.from("settings").select("*").limit(1).maybeSingle();
      if (error) {
        toast({ title: "Erro ao carregar configurações", description: error.message, variant: "destructive" });
      } else if (mounted) {
        setSettings(data as SettingsRow);
      }
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, []);

  const saveSettings = async () => {
    if (!settings) return;
    const { error } = await supabase
      .from("settings")
      .update({
        trial_days: settings.trial_days,
        price_per_seat_cents: settings.price_per_seat_cents,
        stripe_publishable_key: settings.stripe_publishable_key ?? null,
      })
      .eq("id", settings.id);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Configurações salvas" });
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Plano e Trial</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Trial (dias)</Label>
            <Input
              type="number"
              min={0}
              value={settings?.trial_days ?? 7}
              onChange={(e) => setSettings((s) => (s ? { ...s, trial_days: parseInt(e.target.value || "0", 10) } : s))}
            />
          </div>
          <div>
            <Label>Preço por usuário (centavos)</Label>
            <Input
              type="number"
              min={0}
              value={settings?.price_per_seat_cents ?? 3990}
              onChange={(e) => setSettings((s) => (s ? { ...s, price_per_seat_cents: parseInt(e.target.value || "0", 10) } : s))}
            />
          </div>
          <div className="md:col-span-2">
            <Button onClick={saveSettings}>Salvar</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stripe</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Publishable Key</Label>
            <Input
              type="text"
              placeholder="pk_live_... ou pk_test_..."
              value={settings?.stripe_publishable_key ?? ""}
              onChange={(e) => setSettings((s) => (s ? { ...s, stripe_publishable_key: e.target.value } : s))}
            />
          </div>
          <div className="md:col-span-2">
            <Button onClick={saveSettings}>Salvar</Button>
          </div>
          <p className="md:col-span-2 text-sm text-muted-foreground">
            A chave pública da Stripe é usada no frontend. A chave secreta é configurada de forma segura nas variáveis de ambiente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
