import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Calendar, RefreshCw, ArrowUp, X, Download, Users, Star, Plus, Check, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { PlanSelectionModal } from "@/components/modals/PlanSelectionModal";
import { ManageUsersModal } from "@/components/modals/ManageUsersModal";
import { UserManagement } from "@/components/plans/UserManagement";
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
  const {
    toast
  } = useToast();
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
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<AvailablePlan | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);
  const [annualDiscount, setAnnualDiscount] = useState(20);
  const [planUsers, setPlanUsers] = useState<string[]>([]);
  const [contractedUsers, setContractedUsers] = useState<string[]>([]); // Usuários contratados
  const [paymentStatus, setPaymentStatus] = useState<'checking' | 'success' | 'pending' | null>(null);
  useEffect(() => {
    document.title = "Assinaturas | Keeptur";
    loadSubscriptionData();

    // Verificar se voltou do checkout
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    if (sessionId) {
      verifyPayment(sessionId);
      // Limpar URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
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
      // Parallel execution for better performance
      const [sessionResponse, mondeToken] = await Promise.all([supabase.auth.getSession(), Promise.resolve(localStorage.getItem("monde_token") || undefined)]);
      const hasSession = !!sessionResponse.data.session;
      setHasSupabaseSession(hasSession);

      // Resolve user email (Supabase session -> Monde People fallback)
      let email: string | undefined = sessionResponse.data.session?.user?.email || undefined;
      if (!email) {
        try {
          const uid = api.getCurrentUserIdFromToken();
          if (uid) {
            const person = await api.getPerson(uid);
            email = person?.data?.attributes?.email || undefined;
          }
        } catch (_) {}
      }

      // Parallel execution of all API calls for better performance
      const [syncResponse, ...dataResponses] = await Promise.allSettled([supabase.functions.invoke('sync-subscriber', {
        body: {
          email,
          mondeToken,
          source: 'monde'
        }
      }), supabase.functions.invoke('get-subscription-data', {
        body: {
          email,
          mondeToken
        }
      }), supabase.functions.invoke('get-available-plans'), hasSession ? supabase.functions.invoke('get-payment-history') : Promise.resolve({
        value: {
          data: {
            payment_history: []
          }
        }
      } as any), hasSession ? supabase.functions.invoke('get-payment-method') : Promise.resolve({
        value: {
          data: {
            payment_method: null
          }
        }
      } as any)]);
      const [subResponse, plansResponse, historyResponse, methodResponse] = dataResponses as any[];
      if (subResponse.status === 'fulfilled' && subResponse.value.data) {
        setSubscriptionData(subResponse.value.data);
        setSettings(prev => ({
          ...prev,
          autoRenewal: !!subResponse.value.data.auto_renewal
        }));
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
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados da assinatura',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  const verifyPayment = async (sessionId: string) => {
    setPaymentStatus('checking');
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('verify-payment', {
        body: {
          session_id: sessionId
        }
      });
      if (error) throw error;
      if (data?.paid) {
        setPaymentStatus('success');

        // Carregar usuários contratados dos metadados do pagamento
        if (data.users_activated && data.user_emails) {
          setContractedUsers(data.user_emails);
          setPlanUsers(data.user_emails);
        }
        toast({
          title: "Pagamento confirmado!",
          description: `Plano ${data.plan_name} ativado com sucesso para ${data.users_activated} usuário(s).`
        });

        // Recarregar dados imediatamente e também após delay
        loadSubscriptionData();
        setTimeout(() => {
          loadSubscriptionData();
          setPaymentStatus(null);
        }, 2000);
      } else {
        setPaymentStatus('pending');
        toast({
          title: "Pagamento pendente",
          description: "O pagamento ainda está sendo processado. Verifique novamente em alguns minutos.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error verifying payment:', error);
      setPaymentStatus('pending');
      toast({
        title: "Erro ao verificar pagamento",
        description: "Não foi possível verificar o status do pagamento. Tente novamente.",
        variant: "destructive"
      });
    }
  };
  const formatPricePerUser = (cents: number, seats: number) => {
    const pricePerUser = cents / seats;
    return formatCurrency(pricePerUser);
  };
  const handleSelectPlan = (plan: AvailablePlan) => {
    setSelectedPlan(plan);
    setShowPlanModal(true);
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

      // Resolver e-mail do comprador
      const {
        data: sessionData
      } = await supabase.auth.getSession();
      let buyerEmail: string | undefined = sessionData.session?.user?.email || undefined;
      const mondeToken = localStorage.getItem('monde_token') || undefined;
      if (!buyerEmail && mondeToken) {
        try {
          const payload = JSON.parse(atob(mondeToken.split('.')[1] || ''));
          if (payload?.email) buyerEmail = String(payload.email);
        } catch {}
      }
      const {
        data,
        error
      } = await supabase.functions.invoke('create-checkout', {
        body: {
          plan_id: planId,
          is_annual: isAnnual,
          user_emails: ["fabio@allanacaires.monde.com.br"],
          monde_token: mondeToken
        }
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error changing subscription:', error);
      toast({
        title: "Erro",
        description: (error as any)?.message || "Erro ao alterar plano",
        variant: "destructive"
      });
    }
  };
  const handleManagePayment = async () => {
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('customer-portal');
      if (error) {
        console.error('Customer portal error:', error);
        if (error.message?.includes('No Authorization header') || error.message?.includes('Auth error')) {
          toast({
            title: "Sessão expirada",
            description: "Faça login novamente para acessar o portal de pagamento",
            variant: "destructive"
          });
          return;
        }
        throw error;
      }
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Erro",
        description: "Erro ao abrir portal de pagamento",
        variant: "destructive"
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
      case 'visa':
        return '💳';
      case 'mastercard':
        return '💳';
      case 'amex':
        return '💳';
      default:
        return '💳';
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
      const remainingMonths = Math.floor(diffDays % 365 / 30);
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
    const diffMs = now.getTime() - (trialEnd.getTime() - subscriptionData.days_remaining * 24 * 60 * 60 * 1000);
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
    return <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Carregando assinatura...</div>
      </div>;
  }
  return <div className="max-w-6xl mx-auto space-y-8">
      {/* Status de pagamento */}
      {paymentStatus && <Card className={`border-2 ${paymentStatus === 'success' ? 'border-green-500 bg-green-50' : paymentStatus === 'checking' ? 'border-blue-500 bg-blue-50' : 'border-yellow-500 bg-yellow-50'}`}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              {paymentStatus === 'checking' && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>}
              <span className="font-medium">
                {paymentStatus === 'success' && "✅ Pagamento confirmado!"}
                {paymentStatus === 'checking' && "🔄 Verificando pagamento..."}
                {paymentStatus === 'pending' && "⏳ Pagamento pendente"}
              </span>
            </div>
          </CardContent>
        </Card>}

      {/* Header */}
      

      {/* Main Subscription Card */}
      <Card className="relative overflow-hidden subscription-card bg-gradient-to-br from-primary to-purple-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">
                {subscriptionData.subscribed ? `Plano ${subscriptionData.current_plan?.name || subscriptionData.subscription_tier}` : subscriptionData.trial_active ? "Período de Trial" : "Sem Assinatura Ativa"}
              </h2>
              <p className="text-blue-100 text-sm">
                {subscriptionData.subscribed ? `Próxima cobrança: ${subscriptionData.next_billing_date ? new Date(subscriptionData.next_billing_date).toLocaleDateString('pt-BR') : 'N/A'}` : subscriptionData.trial_active ? `Trial ativo até ${subscriptionData.trial_end ? new Date(subscriptionData.trial_end).toLocaleDateString('pt-BR') : 'N/A'}` : "Assine um plano para continuar usando todos os recursos"}
              </p>
              {(subscriptionData.subscribed || subscriptionData.trial_active) && <p className="text-xs text-blue-100 mt-1">
                  {subscriptionData.subscribed ? `Assinando há ${getSubscriptionDuration()}` : `Trial iniciado há ${getTrialDuration()}`}
                </p>}
            </div>
            <div className="text-right">
              {subscriptionData.subscribed && subscriptionData.current_plan ? <>
                  <div className="flex items-baseline">
                    <span className="text-2xl font-bold">{formatCurrency(subscriptionData.current_plan.price_cents)}</span>
                    <span className="text-sm ml-1 text-blue-100">/{subscriptionData.current_plan.billing_cycle === 'yearly' ? 'ano' : 'mês'}</span>
                  </div>
                  <p className="text-xs text-blue-100 mt-1">
                    Renovação: {subscriptionData.auto_renewal ? 'Automática' : 'Manual'}
                  </p>
                </> : subscriptionData.trial_active ? <div className="text-right">
                  <div className="text-2xl font-bold">Gratuito</div>
                  <p className="text-xs text-blue-100 mt-1">{subscriptionData.days_remaining} dias restantes</p>
                </div> : <div className="text-right">
                  <div className="text-lg font-bold">Escolha um Plano</div>
                </div>}
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
                    {subscriptionData.subscribed ? subscriptionData.auto_renewal ? "Automática" : "Manual" : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
          {(!subscriptionData.subscribed || subscriptionData.trial_active) && <Button variant="secondary" onClick={() => setShowPlanModal(true)} className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Escolher Plano</span>
              </Button>}
            {subscriptionData.subscribed && <Button variant="secondary" onClick={() => setShowPlanModal(true)} className="flex items-center space-x-2">
                <ArrowUp className="w-4 h-4" />
                <span>Alterar Plano</span>
              </Button>}
            
            {subscriptionData.subscribed && <Button variant="outline" onClick={handleCancelSubscription} className="flex items-center space-x-2 bg-red-500/20 text-white border-red-300/30 hover:bg-red-500/30">
                <X className="w-4 h-4" />
                <span>Cancelar Assinatura</span>
              </Button>}
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
              <Switch checked={subscriptionData.auto_renewal} onCheckedChange={() => toggleSetting('autoRenewal')} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Notificações de Cobrança</p>
                <p className="text-xs text-muted-foreground">
                  Receber lembretes antes da cobrança
                </p>
              </div>
              <Switch checked={settings.billingNotifications} onCheckedChange={() => toggleSetting('billingNotifications')} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">E-mails Promocionais</p>
                <p className="text-xs text-muted-foreground">
                  Receber ofertas e promoções especiais
                </p>
              </div>
              <Switch checked={settings.promotionalEmails} onCheckedChange={() => toggleSetting('promotionalEmails')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Usuários do Plano
              <Button variant="ghost" size="sm" onClick={() => setShowUsersModal(true)}>
                Gerenciar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subscriptionData.subscribed && subscriptionData.current_plan ? <div className="space-y-4">
                {contractedUsers.length > 0 ? <div className="space-y-2">
                    {contractedUsers.map((email, index) => <div key={email} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                            <Users className="w-4 h-4 text-primary-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{email.split('@')[0].toUpperCase()}</p>
                            <p className="text-xs text-muted-foreground">{email}</p>
                          </div>
                        </div>
                        <Badge variant="secondary">
                          {index === 0 ? "Comprador" : "Ativo"}
                        </Badge>
                      </div>)}
                  </div> : <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">Nenhum usuário adicionado ao plano</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => setShowUsersModal(true)}>
                      + Adicionar Usuário
                    </Button>
                  </div>}
                <p className="text-xs text-muted-foreground text-center">
                  {Math.max(subscriptionData.current_plan.seats - contractedUsers.length, 0)} usuários restantes
                </p>
              </div> : <div className="flex items-center justify-center p-8 text-muted-foreground">
                <div className="text-center">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Assine um plano para adicionar usuários</p>
                </div>
              </div>}
          </CardContent>
        </Card>
      </div>

      {/* Seção de planos para usuários sem assinatura */}
      {!subscriptionData.subscribed && !subscriptionData.trial_active && availablePlans.length > 0 && <>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Escolha seu Plano</h2>
            <p className="text-xl text-muted-foreground mb-6">
              Selecione o plano ideal para sua equipe
            </p>
            
            <div className="flex items-center justify-center space-x-4 mb-8">
              <span className="text-sm font-medium">Mensal</span>
              <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
              <span className="text-sm font-medium">Anual</span>
              <Badge variant="secondary" className="ml-2">
                Economize {annualDiscount}%
              </Badge>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {availablePlans.map(plan => {
          const monthlyPrice = isAnnual ? plan.yearly_price_cents / 12 : plan.price_cents;
          const yearlyTotal = plan.yearly_price_cents;
          const monthlySavings = isAnnual ? plan.price_cents * 12 - yearlyTotal : 0;
          return <Card key={plan.id} className={`relative transition-all duration-200 hover:shadow-lg ${plan.is_current ? 'ring-2 ring-primary shadow-lg' : ''}`}>
                  {plan.is_current && <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">
                        <Star className="w-3 h-3 mr-1" />
                        Plano Atual
                      </Badge>
                    </div>}
                  
                  <CardHeader className="text-center pb-4">
                    <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                    {plan.description && <p className="text-base text-muted-foreground">{plan.description}</p>}
                    
                    <div className="mt-4">
                      <div className="flex items-baseline justify-center">
                        <span className="text-4xl font-bold">
                          {formatCurrency(monthlyPrice)}
                        </span>
                        <span className="text-muted-foreground ml-1">/mês</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {formatPricePerUser(monthlyPrice, plan.seats)} por usuário
                      </div>
                      
                      {isAnnual && monthlySavings > 0 && <p className="text-sm text-green-600 mt-2">
                          Economize {formatCurrency(monthlySavings)} por ano
                        </p>}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-center text-muted-foreground">
                      <Users className="w-4 h-4 mr-2" />
                      <span>Até {plan.seats} usuários</span>
                    </div>
                    
                    <div className="space-y-3">
                      {plan.features.map((feature, index) => <div key={index} className="flex items-start space-x-3">
                          <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </div>)}
                    </div>
                    
                    <Button className="w-full mt-6" size="lg" variant={plan.is_current ? "outline" : "default"} onClick={() => handleSelectPlan(plan)} disabled={plan.is_current}>
                      {plan.is_current ? "Plano Atual" : plan.is_upgrade ? <>
                          <Zap className="w-4 h-4 mr-2" />
                          Fazer Upgrade
                        </> : <>
                          <Zap className="w-4 h-4 mr-2" />
                          Selecionar Plano
                        </>}
                    </Button>
                  </CardContent>
                </Card>;
        })}
          </div>
        </>}

      {/* Gestão de usuários removida - agora só existe uma seção acima */}

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
            {paymentHistory.length > 0 ? <div className="overflow-x-auto">
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
                    {paymentHistory.map(payment => <tr key={payment.id} className="border-b">
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
                          <Badge className={payment.status === 'paid' ? "bg-green-100 text-green-800" : payment.status === 'pending' ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}>
                            {payment.status === 'paid' ? 'Pago' : payment.status === 'pending' ? 'Pendente' : 'Falhado'}
                          </Badge>
                        </td>
                        <td className="py-4">
                          {payment.invoice_url && <Button variant="ghost" size="sm" onClick={() => window.open(payment.invoice_url, '_blank')}>
                              Baixar
                            </Button>}
                        </td>
                      </tr>)}
                  </tbody>
                </table>
              </div> : <div className="flex items-center justify-center p-8 text-muted-foreground">
                <p>Nenhum histórico de pagamento encontrado</p>
              </div>}
          </CardContent>
      </Card>
      {/* Modals */}
      {subscriptionData.subscribed && subscriptionData.current_plan && <ManageUsersModal open={showUsersModal} onOpenChange={setShowUsersModal} planSeats={subscriptionData.current_plan.seats} users={contractedUsers} onUsersUpdate={newUsers => {
      setContractedUsers(newUsers);
      setPlanUsers(newUsers);
    }} />}
      
      <PlanSelectionModal open={showPlanModal} onOpenChange={setShowPlanModal} plans={selectedPlan ? [selectedPlan] : availablePlans} onSuccess={loadSubscriptionData} />
    </div>;
}