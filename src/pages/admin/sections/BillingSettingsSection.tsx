import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";

interface SettingsRow {
  trial_days: number;
  price_per_seat_cents: number;
  currency: string;
  stripe_publishable_key?: string;
}

interface SubscriptionStatus {
  subscribed: boolean;
  subscription_tier?: string;
  subscription_end?: string;
}

export default function BillingSettingsSection() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingsRow>({
    trial_days: 7,
    price_per_seat_cents: 3990,
    currency: "BRL",
    stripe_publishable_key: ""
  });
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({ subscribed: false });
  const [loadingStatus, setLoadingStatus] = useState(false);

  useEffect(() => {
    loadSettings();
    refreshStatus();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings({
          trial_days: data.trial_days || 7,
          price_per_seat_cents: data.price_per_seat_cents || 3990,
          currency: data.currency || 'BRL',
          stripe_publishable_key: data.stripe_publishable_key || ''
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          trial_days: settings.trial_days,
          price_per_seat_cents: settings.price_per_seat_cents,
          currency: settings.currency,
          stripe_publishable_key: settings.stripe_publishable_key,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso!",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações",
        variant: "destructive",
      });
    }
  };

  const priceBRL = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format((settings.price_per_seat_cents * quantity) / 100);

  const startCheckout = async () => {
    try {
      // Resolver e-mail do comprador
      const { data: sessionData } = await supabase.auth.getSession();
      let buyerEmail: string | undefined = sessionData.session?.user?.email || undefined;
      const mondeToken = localStorage.getItem('monde_token') || undefined;
      if (!buyerEmail && mondeToken) {
        try {
          const payload = JSON.parse(atob((mondeToken.split('.')[1] || '')));
          if (payload?.email) buyerEmail = String(payload.email);
        } catch {}
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { quantity, monde_token: mondeToken, buyer_email: buyerEmail }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Erro",
        description: (error as any)?.message || "Erro ao iniciar checkout",
        variant: "destructive",
      });
    }
  };

  const openPortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening portal:', error);
      toast({
        title: "Erro",
        description: "Erro ao abrir portal",
        variant: "destructive",
      });
    }
  };

  const refreshStatus = async () => {
    setLoadingStatus(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');

      if (error) throw error;

      setSubscriptionStatus({
        subscribed: data?.subscribed || false,
        subscription_tier: data?.subscription_tier,
        subscription_end: data?.subscription_end
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setLoadingStatus(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle>Status da Assinatura</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                Status: {subscriptionStatus.subscribed ? "Ativo" : "Inativo"}
              </p>
              {subscriptionStatus.subscription_tier && (
                <p className="text-sm text-muted-foreground">
                  Plano: {subscriptionStatus.subscription_tier}
                </p>
              )}
              {subscriptionStatus.subscription_end && (
                <p className="text-sm text-muted-foreground">
                  Próxima cobrança: {new Date(subscriptionStatus.subscription_end).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
            <Button 
              onClick={refreshStatus} 
              disabled={loadingStatus}
              variant="outline"
              size="sm"
            >
              {loadingStatus ? "Verificando..." : "Atualizar Status"}
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <Label htmlFor="quantity">Quantidade de usuários:</Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">
              Total: {priceBRL}/mês
            </span>
          </div>

          <div className="flex space-x-2">
            {!subscriptionStatus.subscribed ? (
              <Button onClick={startCheckout}>
                Assinar Agora
              </Button>
            ) : (
              <Button onClick={openPortal} variant="outline">
                Gerenciar Assinatura
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Plano e Trial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="trial-days">Dias de Trial</Label>
              <Input
                id="trial-days"
                type="number"
                value={settings.trial_days}
                onChange={(e) => setSettings(prev => ({ ...prev, trial_days: parseInt(e.target.value) || 0 }))}
                min="0"
              />
            </div>
            <div>
              <Label htmlFor="price">Preço por usuário (centavos)</Label>
              <Input
                id="price"
                type="number"
                value={settings.price_per_seat_cents}
                onChange={(e) => setSettings(prev => ({ ...prev, price_per_seat_cents: parseInt(e.target.value) || 0 }))}
                min="0"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Valor atual: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(settings.price_per_seat_cents / 100)}
              </p>
            </div>
            <Button onClick={saveSettings}>
              Salvar
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stripe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="stripe-key">Chave Pública do Stripe</Label>
              <Input
                id="stripe-key"
                type="text"
                value={settings.stripe_publishable_key}
                onChange={(e) => setSettings(prev => ({ ...prev, stripe_publishable_key: e.target.value }))}
                placeholder="pk_test_..."
              />
            </div>
            <Button onClick={saveSettings}>
              Salvar
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}