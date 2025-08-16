import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Calendar, RefreshCw, ArrowUp, X, Download, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionData {
  subscribed: boolean;
  subscription_tier?: string;
  subscription_end?: string;
  trial_end?: string;
}

interface PlanData {
  name: string;
  price_cents: number;
  currency: string;
  seats: number;
}

export default function SubscriptionPage() {
  const { toast } = useToast();
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData>({ subscribed: false });
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    autoRenewal: true,
    billingNotifications: true,
    promotionalEmails: false
  });

  useEffect(() => {
    document.title = "Assinaturas | Keeptur";
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    setLoading(true);
    try {
      // Check subscription status
      const { data: subData, error: subError } = await supabase.functions.invoke('check-subscription');
      
      if (subError) throw subError;
      
      setSubscriptionData({
        subscribed: subData?.subscribed || false,
        subscription_tier: subData?.subscription_tier,
        subscription_end: subData?.subscription_end,
        trial_end: subData?.trial_end
      });

      // Load plan details if subscribed
      if (subData?.subscribed && subData?.subscription_tier) {
        const { data: planInfo } = await supabase
          .from('plan_kits')
          .select('name, price_cents, currency, seats')
          .eq('name', subData.subscription_tier)
          .eq('active', true)
          .maybeSingle();
        
        if (planInfo) {
          setPlanData(planInfo);
        }
      }
    } catch (error) {
      console.error('Error loading subscription data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados da assinatura",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const handleSubscriptionChange = (plan: string, isAnnual: boolean = false) => {
    // This would integrate with your plan selection logic
    console.log(`Changing to ${plan} plan, annual: ${isAnnual}`);
  };

  const handleManagePayment = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Erro",
        description: "Erro ao abrir portal de pagamento",
        variant: "destructive",
      });
    }
  };

  const handleCancelSubscription = () => {
    // This would show a confirmation modal
    console.log('Cancel subscription clicked');
  };

  const toggleSetting = (setting: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const isTrialActive = subscriptionData.trial_end && new Date(subscriptionData.trial_end) > new Date() && !subscriptionData.subscribed;
  const daysRemaining = isTrialActive ? Math.ceil((new Date(subscriptionData.trial_end!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Carregando assinatura...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Minhas Assinaturas</h1>
          <p className="text-sm mt-1 text-muted-foreground">
            Gerencie suas assinaturas ativas e histórico de pagamentos
          </p>
        </div>
      </div>

      {/* Main Subscription Card */}
      <Card className="relative overflow-hidden subscription-card bg-gradient-to-br from-primary to-purple-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">
                {subscriptionData.subscribed 
                  ? `Plano ${planData?.name || subscriptionData.subscription_tier}` 
                  : isTrialActive 
                    ? "Período de Trial" 
                    : "Sem Assinatura Ativa"
                }
              </h2>
              <p className="text-blue-100 text-sm">
                {subscriptionData.subscribed 
                  ? `Assinatura ativa desde ${subscriptionData.subscription_end ? new Date(subscriptionData.subscription_end).toLocaleDateString('pt-BR') : 'N/A'}`
                  : isTrialActive
                    ? `Trial ativo até ${new Date(subscriptionData.trial_end!).toLocaleDateString('pt-BR')}`
                    : "Assine um plano para continuar usando todos os recursos"
                }
              </p>
            </div>
            <div className="text-right">
              {subscriptionData.subscribed && planData ? (
                <>
                  <div className="flex items-baseline">
                    <span className="text-2xl font-bold">{formatCurrency(planData.price_cents)}</span>
                    <span className="text-sm ml-1 text-blue-100">/mês</span>
                  </div>
                  <p className="text-xs text-blue-100 mt-1">
                    Próxima cobrança: {subscriptionData.subscription_end ? new Date(subscriptionData.subscription_end).toLocaleDateString('pt-BR') : 'N/A'}
                  </p>
                </>
              ) : isTrialActive ? (
                <div className="text-right">
                  <div className="text-2xl font-bold">Gratuito</div>
                  <p className="text-xs text-blue-100 mt-1">{daysRemaining} dias restantes</p>
                </div>
              ) : (
                <div className="text-right">
                  <div className="text-lg font-bold">Escolha um Plano</div>
                </div>
              )}
            </div>
          </div>

          {/* Usage Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm text-blue-100">Usuários</p>
                  <p className="font-semibold">
                    {planData?.seats ? `${planData.seats} usuários` : 'Ilimitado'}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm text-blue-100">
                    {isTrialActive ? "Dias restantes" : "Status"}
                  </p>
                  <p className="font-semibold">
                    {isTrialActive ? `${daysRemaining} dias` : subscriptionData.subscribed ? "Ativo" : "Inativo"}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <RefreshCw className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm text-blue-100">Renovação</p>
                  <p className="font-semibold">
                    {subscriptionData.subscribed ? "Automática" : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={() => handleSubscriptionChange('upgrade')}
              className="flex items-center space-x-2"
            >
              <ArrowUp className="w-4 h-4" />
              <span>Alterar Plano</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleManagePayment}
              className="flex items-center space-x-2 bg-white/20 text-white border-white/30 hover:bg-white/30"
            >
              <CreditCard className="w-4 h-4" />
              <span>Método de Pagamento</span>
            </Button>
            {subscriptionData.subscribed && (
              <Button
                variant="outline"
                onClick={handleCancelSubscription}
                className="flex items-center space-x-2 bg-red-500/20 text-white border-red-300/30 hover:bg-red-500/30"
              >
                <X className="w-4 h-4" />
                <span>Cancelar Assinatura</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Settings and Payment Method */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Configurações da Assinatura
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Renovação Automática</p>
                <p className="text-xs text-muted-foreground">
                  Renovar automaticamente na data de vencimento
                </p>
              </div>
              <Switch
                checked={settings.autoRenewal}
                onCheckedChange={() => toggleSetting('autoRenewal')}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Notificações de Cobrança</p>
                <p className="text-xs text-muted-foreground">
                  Receber lembretes antes da cobrança
                </p>
              </div>
              <Switch
                checked={settings.billingNotifications}
                onCheckedChange={() => toggleSetting('billingNotifications')}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">E-mails Promocionais</p>
                <p className="text-xs text-muted-foreground">
                  Receber ofertas e promoções especiais
                </p>
              </div>
              <Switch
                checked={settings.promotionalEmails}
                onCheckedChange={() => toggleSetting('promotionalEmails')}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Método de Pagamento
              <Button variant="ghost" size="sm" onClick={handleManagePayment}>
                Alterar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4 p-4 bg-muted rounded-lg">
              <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center">
                <CreditCard className="w-6 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium">•••• •••• •••• 4532</p>
                <p className="text-xs text-muted-foreground">Expira em 12/2027</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Histórico de Pagamentos
            <Button variant="ghost" size="sm" className="flex items-center space-x-1">
              <Download className="w-4 h-4" />
              <span>Baixar Fatura</span>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 font-medium">Data</th>
                  <th className="text-left py-3 font-medium">Descrição</th>
                  <th className="text-left py-3 font-medium">Valor</th>
                  <th className="text-left py-3 font-medium">Status</th>
                  <th className="text-left py-3 font-medium">Ação</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-4 text-muted-foreground">15 Dez 2024</td>
                  <td className="py-4 text-muted-foreground">Plano Pro - Mensal</td>
                  <td className="py-4 font-medium">R$ 249,00</td>
                  <td className="py-4">
                    <Badge className="bg-green-100 text-green-800">Pago</Badge>
                  </td>
                  <td className="py-4">
                    <Button variant="ghost" size="sm">Baixar</Button>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-4 text-muted-foreground">15 Nov 2024</td>
                  <td className="py-4 text-muted-foreground">Plano Pro - Mensal</td>
                  <td className="py-4 font-medium">R$ 249,00</td>
                  <td className="py-4">
                    <Badge className="bg-green-100 text-green-800">Pago</Badge>
                  </td>
                  <td className="py-4">
                    <Button variant="ghost" size="sm">Baixar</Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}