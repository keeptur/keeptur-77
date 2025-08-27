import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Calendar, RefreshCw, ArrowUp, X, Download, Users, Star, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { PlanSelectionModal } from "@/components/modals/PlanSelectionModal";
// ReloginModal removed

interface CompleteSubscriptionData {
  subscribed: boolean;
  subscription_tier?: string;
  subscription_end?: string;
  trial_active: boolean;
  trial_end?: string;
  days_remaining: number;
  current_plan?: {
    name: string;
    price_cents: number;
    currency: string;
    seats: number;
    features: string[];
    billing_cycle: 'monthly' | 'yearly';
  };
  next_billing_date?: string;
  auto_renewal: boolean;
  stripe_customer_id?: string;
}

interface PaymentHistoryItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  invoice_url?: string;
  invoice_pdf?: string;
}

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  created: number;
}

interface AvailablePlan {
  id: string;
  name: string;
  description?: string;
  price_cents: number;
  yearly_price_cents: number;
  currency: string;
  seats: number;
  features: string[];
  stripe_price_id_monthly?: string;
  stripe_price_id_yearly?: string;
  is_current: boolean;
  is_upgrade: boolean;
  sort_order: number;
}

export default function SubscriptionPage() {
  const { toast } = useToast();
  const [subscriptionData, setSubscriptionData] = useState<CompleteSubscriptionData>({ 
    subscribed: false, 
    trial_active: false, 
    days_remaining: 0, 
    auto_renewal: false 
  });
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [availablePlans, setAvailablePlans] = useState<AvailablePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    autoRenewal: true,
    billingNotifications: true,
    promotionalEmails: false
  });
  const [hasSupabaseSession, setHasSupabaseSession] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);

  useEffect(() => {
    document.title = "Assinaturas | Keeptur";
    loadSubscriptionData();
  }, []);

// Automatically open plan selection when user has no subscription and plans are available
useEffect(() => {
  if (!loading && availablePlans.length > 0 && !subscriptionData.subscribed && !subscriptionData.trial_active) {
    setShowPlanModal(true);
  }
}, [loading, availablePlans.length, subscriptionData.subscribed, subscriptionData.trial_active]);

const loadSubscriptionData = async () => {
  setLoading(true);
  try {
    // Detect Supabase session, but don't block UI if absent
    const { data: sessionData } = await supabase.auth.getSession();
    const hasSession = !!sessionData.session;
    setHasSupabaseSession(hasSession);

    // Resolve user email (Supabase session -> Monde People fallback)
    let email: string | undefined = sessionData.session?.user?.email || undefined;
    const mondeToken = localStorage.getItem("monde_token") || undefined;
    if (!email) {
      try {
        const uid = api.getCurrentUserIdFromToken();
        if (uid) {
          const person = await api.getPerson(uid);
          email = person?.data?.attributes?.email || undefined;
        }
      } catch (_) {}
    }

    // 1) Sync subscriber (public)
    await supabase.functions.invoke('sync-subscriber', { body: { email, mondeToken, source: 'monde' } });

    // 2) Load data (public + session-optional)
    const responses = await Promise.allSettled([
      supabase.functions.invoke('get-subscription-data', { body: { email, mondeToken } }),
      supabase.functions.invoke('get-available-plans'),
      hasSession ? supabase.functions.invoke('get-payment-history') : Promise.resolve({ value: { data: { payment_history: [] } } } as any),
      hasSession ? supabase.functions.invoke('get-payment-method') : Promise.resolve({ value: { data: { payment_method: null } } } as any),
    ]);

    const [subResponse, plansResponse, historyResponse, methodResponse] = responses as any[];

    if (subResponse.status === 'fulfilled' && subResponse.value.data) {
      setSubscriptionData(subResponse.value.data);
      setSettings(prev => ({ ...prev, autoRenewal: !!subResponse.value.data.auto_renewal }));
    }

    if (plansResponse.status === 'fulfilled' && plansResponse.value.data?.available_plans) {
      setAvailablePlans(plansResponse.value.data.available_plans);
    }

    if (historyResponse.status === 'fulfilled' && historyResponse.value.data?.payment_history) {
      setPaymentHistory(historyResponse.value.data.payment_history);
    } else if (!hasSession) {
      setPaymentHistory([]);
    }

    if (methodResponse.status === 'fulfilled' && methodResponse.value.data?.payment_method !== undefined) {
      setPaymentMethod(methodResponse.value.data.payment_method);
    } else if (!hasSession) {
      setPaymentMethod(null);
    }
  } catch (error) {
    console.error('Error loading subscription data:', error);
    toast({ title: 'Erro', description: 'Erro ao carregar dados da assinatura', variant: 'destructive' });
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

  const handleSubscriptionChange = async (planId: string, isAnnual: boolean = false) => {
    try {
      const plan = availablePlans.find(p => p.id === planId);
      if (!plan) return;

      const priceId = isAnnual ? plan.stripe_price_id_yearly : plan.stripe_price_id_monthly;
      if (!priceId) {
        toast({
          title: "Erro",
          description: "Preço não configurado para este plano",
          variant: "destructive",
        });
        return;
      }

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
        body: { price_id: priceId, monde_token: mondeToken, buyer_email: buyerEmail }
      });
      
      if (error) throw error;
      
      if (data?.url) {
        const newWindow = window.open(data.url, '_blank');
        if (newWindow) {
          const checkClosed = setInterval(() => {
            if (newWindow.closed) {
              clearInterval(checkClosed);
              // Reload subscription data when user returns from checkout
              setTimeout(() => loadSubscriptionData(), 2000);
            }
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Error changing subscription:', error);
      toast({
        title: "Erro",
        description: (error as any)?.message || "Erro ao alterar plano",
        variant: "destructive",
      });
    }
  };

  const handleManagePayment = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) {
        console.error('Customer portal error:', error);
        if (error.message?.includes('No Authorization header') || error.message?.includes('Auth error')) {
          toast({
            title: "Sessão expirada",
            description: "Faça login novamente para acessar o portal de pagamento",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }
      
      if (data?.url) {
        // Open in new tab and reload data when user returns
        const newWindow = window.open(data.url, '_blank');
        if (newWindow) {
          const checkClosed = setInterval(() => {
            if (newWindow.closed) {
              clearInterval(checkClosed);
              // Reload subscription data when user returns
              setTimeout(() => loadSubscriptionData(), 2000);
            }
          }, 1000);
        }
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

  const getCardBrandIcon = (brand: string) => {
    switch (brand.toLowerCase()) {
      case 'visa': return '💳';
      case 'mastercard': return '💳';
      case 'amex': return '💳';
      default: return '💳';
    }
  };

  const getSubscriptionDuration = () => {
    if (!subscriptionData.subscription_end) return 'N/A';
    
    const now = new Date();
    const subEnd = new Date(subscriptionData.subscription_end);
    const diffMs = subEnd.getTime() - now.getTime();
    const diffDays = Math.abs(Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    
    if (diffDays < 30) {
      return `${diffDays} dias`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} ${months === 1 ? 'mês' : 'meses'}`;
    } else {
      const years = Math.floor(diffDays / 365);
      const remainingMonths = Math.floor((diffDays % 365) / 30);
      if (remainingMonths === 0) {
        return `${years} ${years === 1 ? 'ano' : 'anos'}`;
      }
      return `${years} ${years === 1 ? 'ano' : 'anos'} e ${remainingMonths} ${remainingMonths === 1 ? 'mês' : 'meses'}`;
    }
  };

  const getTrialDuration = () => {
    if (!subscriptionData.trial_end) return 'N/A';
    
    const now = new Date();
    const trialEnd = new Date(subscriptionData.trial_end);
    const diffMs = now.getTime() - (trialEnd.getTime() - (subscriptionData.days_remaining * 24 * 60 * 60 * 1000));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) {
      return 'hoje';
    } else if (diffDays === 1) {
      return '1 dia';
    } else {
      return `${diffDays} dias`;
    }
  };

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
                  ? `Plano ${subscriptionData.current_plan?.name || subscriptionData.subscription_tier}` 
                  : subscriptionData.trial_active 
                    ? "Período de Trial" 
                    : "Sem Assinatura Ativa"
                }
              </h2>
              <p className="text-blue-100 text-sm">
                {subscriptionData.subscribed 
                  ? `Próxima cobrança: ${subscriptionData.next_billing_date ? new Date(subscriptionData.next_billing_date).toLocaleDateString('pt-BR') : 'N/A'}`
                  : subscriptionData.trial_active
                    ? `Trial ativo até ${subscriptionData.trial_end ? new Date(subscriptionData.trial_end).toLocaleDateString('pt-BR') : 'N/A'}`
                    : "Assine um plano para continuar usando todos os recursos"
                }
              </p>
              {(subscriptionData.subscribed || subscriptionData.trial_active) && (
                <p className="text-xs text-blue-100 mt-1">
                  {subscriptionData.subscribed 
                    ? `Assinando há ${getSubscriptionDuration()}` 
                    : `Trial iniciado há ${getTrialDuration()}`
                  }
                </p>
              )}
            </div>
            <div className="text-right">
              {subscriptionData.subscribed && subscriptionData.current_plan ? (
                <>
                  <div className="flex items-baseline">
                    <span className="text-2xl font-bold">{formatCurrency(subscriptionData.current_plan.price_cents)}</span>
                    <span className="text-sm ml-1 text-blue-100">/{subscriptionData.current_plan.billing_cycle === 'yearly' ? 'ano' : 'mês'}</span>
                  </div>
                  <p className="text-xs text-blue-100 mt-1">
                    Renovação: {subscriptionData.auto_renewal ? 'Automática' : 'Manual'}
                  </p>
                </>
              ) : subscriptionData.trial_active ? (
                <div className="text-right">
                  <div className="text-2xl font-bold">Gratuito</div>
                  <p className="text-xs text-blue-100 mt-1">{subscriptionData.days_remaining} dias restantes</p>
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
                    {subscriptionData.current_plan?.seats ? `${subscriptionData.current_plan.seats} usuários` : 'Ilimitado'}
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
                    {subscriptionData.trial_active ? "Dias restantes" : "Status"}
                  </p>
                  <p className="font-semibold">
                    {subscriptionData.trial_active ? `${subscriptionData.days_remaining} dias` : subscriptionData.subscribed ? "Ativo" : "Inativo"}
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
                    {subscriptionData.subscribed ? (subscriptionData.auto_renewal ? "Automática" : "Manual") : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
          {(!subscriptionData.subscribed || subscriptionData.trial_active) && (
              <Button
                variant="secondary"
                onClick={() => setShowPlanModal(true)}
                className="flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Escolher Plano</span>
              </Button>
            )}
            {subscriptionData.subscribed && (
              <Button
                variant="secondary"
                onClick={() => setShowPlanModal(true)}
                className="flex items-center space-x-2"
              >
                <ArrowUp className="w-4 h-4" />
                <span>Alterar Plano</span>
              </Button>
            )}
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
                checked={subscriptionData.auto_renewal}
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
            {paymentMethod ? (
              <div className="flex items-center space-x-4 p-4 bg-muted rounded-lg">
                <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-semibold">
                  {paymentMethod.brand.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">•••• •••• •••• {paymentMethod.last4}</p>
                  <p className="text-xs text-muted-foreground">
                    Expira em {paymentMethod.exp_month.toString().padStart(2, '0')}/{paymentMethod.exp_year}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center p-8 text-muted-foreground">
                <p>Nenhum método de pagamento cadastrado</p>
              </div>
            )}
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
            {paymentHistory.length > 0 ? (
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
                    {paymentHistory.map((payment) => (
                      <tr key={payment.id} className="border-b">
                        <td className="py-4 text-muted-foreground">
                          {new Date(payment.date).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-4 text-muted-foreground">{payment.description}</td>
                        <td className="py-4 font-medium">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: payment.currency === 'BRL' ? 'BRL' : 'USD'
                          }).format(payment.amount / 100)}
                        </td>
                        <td className="py-4">
                          <Badge 
                            className={
                              payment.status === 'paid' 
                                ? "bg-green-100 text-green-800" 
                                : payment.status === 'pending'
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }
                          >
                            {payment.status === 'paid' ? 'Pago' : payment.status === 'pending' ? 'Pendente' : 'Falhado'}
                          </Badge>
                        </td>
                        <td className="py-4">
                          {payment.invoice_url && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => window.open(payment.invoice_url, '_blank')}
                            >
                              Baixar
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center justify-center p-8 text-muted-foreground">
                <p>Nenhum histórico de pagamento encontrado</p>
              </div>
            )}
          </CardContent>
      </Card>
      {/* Plan Selection Modal */}
<PlanSelectionModal
  open={showPlanModal}
  onOpenChange={setShowPlanModal}
  plans={availablePlans}
  onSuccess={loadSubscriptionData}
/>

{/* Relogin modal removed: page now works sem sessão Supabase (modo leitura) */}
    </div>
  );
}