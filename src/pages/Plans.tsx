import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Check, Star, Users, Zap, Clock, Crown, User, Calendar, RefreshCw, 
  ArrowUp, CreditCard, X, Download, UserPlus, Edit, Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PlanSelectionModal } from "@/components/modals/PlanSelectionModal";
import { UserManagement } from "@/components/plans/UserManagement";

interface Plan {
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

interface UserSubscriptionStatus {
  isSubscribed: boolean;
  isInTrial: boolean;
  isAdmin: boolean;
  daysRemaining: number;
  subscriptionTier?: string;
  userEmail?: string;
}

interface PaymentItem {
  date?: string;
  description?: string;
  amount_cents?: number;
  currency?: string;
  status?: string;
  invoice_url?: string;
}

export default function Plans() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAnnual, setIsAnnual] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [annualDiscount, setAnnualDiscount] = useState(20);
  const [userStatus, setUserStatus] = useState<UserSubscriptionStatus>({
    isSubscribed: false,
    isInTrial: false,
    isAdmin: false,
    daysRemaining: 0
  });
  const [paymentStatus, setPaymentStatus] = useState<'checking' | 'success' | 'pending' | null>(null);
  const [planUsers, setPlanUsers] = useState<string[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentItem[]>([]);
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const formatPricePerUser = (cents: number, seats: number) => {
    const pricePerUser = cents / seats;
    return formatCurrency(pricePerUser);
  };

  const loadUserStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Check if user is admin
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        
        const isAdmin = (roles || []).some((r) => r.role === "admin");
        
        if (isAdmin) {
          setUserStatus(prev => ({ ...prev, isAdmin: true }));
          return;
        }

        // Check subscriber status
        const { data: subscriber } = await supabase
          .from("subscribers")
          .select("trial_end, subscription_end, subscribed, subscription_tier")
          .or(`user_id.eq.${user.id},email.eq.${user.email}`)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (subscriber) {
          const now = Date.now();
          const trialEnd = subscriber.trial_end ? new Date(subscriber.trial_end).getTime() : null;
          const subEnd = subscriber.subscription_end ? new Date(subscriber.subscription_end).getTime() : null;
          
          let daysRemaining = 0;
          let isSubscribed = !!subscriber.subscribed;
          let isInTrial = false;

          if (isSubscribed && subEnd && subEnd > now) {
            // Plano ativo: usar subscription_end
            daysRemaining = Math.ceil((subEnd - now) / (1000 * 60 * 60 * 24));
          } else if (trialEnd && trialEnd > now && !isSubscribed) {
            // Trial ativo
            isInTrial = true;
            daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
          }

          setUserStatus({
            isSubscribed,
            isInTrial,
            isAdmin: false,
            daysRemaining,
            subscriptionTier: subscriber.subscription_tier || undefined,
            userEmail: user.email || undefined
          });
        }
      } else {
        // Try with Monde token
        const mondeToken = localStorage.getItem("monde_token");
        if (mondeToken) {
          try {
            const { data } = await supabase.functions.invoke("sync-subscriber", {
              body: { mondeToken },
            });
            
            if (data) {
              const trialEnd = data.trial_end ? new Date(data.trial_end).getTime() : null;
              const now = Date.now();
              
              setUserStatus({
                isSubscribed: !!data.subscribed,
                isInTrial: trialEnd ? trialEnd > now : false,
                isAdmin: false,
                daysRemaining: trialEnd ? Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)) : 0,
                subscriptionTier: data.subscription_tier
              });
            }
          } catch (error) {
            console.error('Error syncing subscriber:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error loading user status:', error);
    }
  };

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-available-plans');
      
      if (error) throw error;
      
      if (data?.available_plans) {
        setPlans(data.available_plans);
        setAnnualDiscount(data.annual_discount || 20);
      }
    } catch (error: any) {
      console.error('Error fetching plans:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os planos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([loadUserStatus(), fetchPlans(), loadPaymentHistory()]);
    
    // Verificar se voltou do checkout
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    if (sessionId) {
      verifyPayment(sessionId);
      // Limpar URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const verifyPayment = async (sessionId: string) => {
    setPaymentStatus('checking');
    try {
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { session_id: sessionId }
      });

      if (error) throw error;

      if (data?.paid) {
        setPaymentStatus('success');
        toast({
          title: "Pagamento confirmado!",
          description: `Plano ${data.plan_name} ativado com sucesso para ${data.users_activated} usuário(s).`,
        });
        
        // Recarregar dados imediatamente e também após delay
        Promise.all([loadUserStatus(), fetchPlans()]);
        setTimeout(() => {
          Promise.all([loadUserStatus(), fetchPlans()]);
          setPaymentStatus(null);
        }, 2000);
      } else {
        setPaymentStatus('pending');
        toast({
          title: "Pagamento pendente",
          description: "O pagamento ainda está sendo processado. Verifique novamente em alguns minutos.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error verifying payment:', error);
      setPaymentStatus('pending');
      toast({
        title: "Erro ao verificar pagamento",
        description: "Não foi possível verificar o status do pagamento. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const loadPaymentHistory = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-payment-history');
      if (error) throw error;
      if (Array.isArray((data as any)?.paymentHistory)) {
        setPaymentHistory((data as any).paymentHistory as PaymentItem[]);
      } else if (Array.isArray(data)) {
        setPaymentHistory(data as PaymentItem[]);
      }
    } catch (e) {
      console.warn('Não foi possível carregar o histórico de pagamentos:', e);
    }
  };

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setPlanModalOpen(true);
  };

  const handlePlanSuccess = () => {
    fetchPlans();
    loadUserStatus();
  };

  const handleSubscribe = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    let buyerEmail: string | undefined = sessionData.session?.user?.email || undefined;
    const mondeToken = localStorage.getItem("monde_token") || undefined;

    if (!buyerEmail && mondeToken) {
      try {
        const payload = JSON.parse(atob((mondeToken.split(".")[1] || "")));
        if (payload?.email) buyerEmail = String(payload.email);
      } catch {}
    }

    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { quantity: 1, monde_token: mondeToken, buyer_email: buyerEmail },
    });

    if (!error && (data as any)?.url) {
      // Open Stripe checkout in a new tab to avoid iframe restrictions
      window.open((data as any).url as string, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-2 text-muted-foreground">Carregando planos...</p>
        </div>
      </div>
    );
  }

  const currentPlan = plans.find(p => p.is_current);
  const currentPlanPrice = currentPlan ? (isAnnual ? currentPlan.yearly_price_cents / 12 : currentPlan.price_cents) : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto space-y-8 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Minhas Assinaturas</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie suas assinaturas ativas e histórico de pagamentos
            </p>
          </div>
        </div>

        {/* Status de pagamento */}
        {paymentStatus && (
          <Card className={`border-2 ${
            paymentStatus === 'success' ? 'border-green-500 bg-green-50' : 
            paymentStatus === 'checking' ? 'border-blue-500 bg-blue-50' : 
            'border-yellow-500 bg-yellow-50'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                {paymentStatus === 'checking' && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                )}
                <span className="font-medium">
                  {paymentStatus === 'success' && "✅ Pagamento confirmado!"}
                  {paymentStatus === 'checking' && "🔄 Verificando pagamento..."}
                  {paymentStatus === 'pending' && "⏳ Pagamento pendente"}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Card de plano/estado atual */}
        <Card className="rounded-xl p-6 bg-gradient-to-r from-primary to-blue-600 text-white">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">{userStatus.isSubscribed ? `Plano ${userStatus.subscriptionTier || 'Pro'}` : 'Sem Plano Ativo'}</h2>
              <p className="text-blue-100 text-sm">
                {userStatus.isSubscribed ? `Assinatura ativa` : 'Escolha um plano para começar'}
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-baseline">
                <span className="text-2xl font-bold">{formatCurrency(currentPlanPrice)}</span>
                <span className="text-sm ml-1 text-blue-100">/mês</span>
              </div>
              {userStatus.isSubscribed && (
                <p className="text-xs text-blue-100 mt-1">
                  Próxima cobrança: {new Date(Date.now() + userStatus.daysRemaining * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm text-blue-100">Usuários</p>
                  <p className="font-semibold">{planUsers.length} de {currentPlan?.seats || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm text-blue-100">Dias restantes</p>
                  <p className="font-semibold">{userStatus.daysRemaining} dias</p>
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
                  <p className="font-semibold">Automática</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {userStatus.isSubscribed ? (
              <>
                <Button
                  onClick={() => {
                    const upgradePlan = plans.find(p => !p.is_current && p.is_upgrade);
                    if (upgradePlan) {
                      setSelectedPlan(upgradePlan);
                      setPlanModalOpen(true);
                    }
                  }}
                  className="bg-white text-primary hover:bg-gray-50 flex items-center space-x-2"
                >
                  <ArrowUp className="w-4 h-4" />
                  <span>Alterar Plano</span>
                </Button>
                <Button
                  variant="outline"
                  className="bg-white/20 text-white border-white/30 hover:bg-white/30 flex items-center space-x-2"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Método de Pagamento</span>
                </Button>
                <Button
                  variant="outline"
                  className="bg-red-500/20 text-white border-red-300/30 hover:bg-red-500/30 flex items-center space-x-2"
                >
                  <X className="w-4 h-4" />
                  <span>Cancelar Assinatura</span>
                </Button>
              </>
            ) : (
              <Button onClick={handleSubscribe} className="bg-white text-primary hover:bg-gray-50 flex items-center space-x-2">
                <ArrowUp className="w-4 h-4" />
                <span>Escolher Plano</span>
              </Button>
            )}
          </div>
        </Card>

        {/* Seção de planos para usuários sem assinatura */}
        {!userStatus.isSubscribed && !userStatus.isAdmin && (
          <>
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
              {plans.map((plan) => {
                const monthlyPrice = isAnnual ? plan.yearly_price_cents / 12 : plan.price_cents;
                const yearlyTotal = plan.yearly_price_cents;
                const monthlySavings = isAnnual ? (plan.price_cents * 12) - yearlyTotal : 0;
                
                return (
                  <Card 
                    key={plan.id}
                    className={`relative transition-all duration-200 hover:shadow-lg ${
                      plan.is_current ? 'ring-2 ring-primary shadow-lg' : ''
                    }`}
                  >
                    {plan.is_current && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground">
                          <Star className="w-3 h-3 mr-1" />
                          Plano Atual
                        </Badge>
                      </div>
                    )}
                    
                    <CardHeader className="text-center pb-4">
                      <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                      {plan.description && (
                        <CardDescription className="text-base">{plan.description}</CardDescription>
                      )}
                      
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
                        
                        {isAnnual && monthlySavings > 0 && (
                          <p className="text-sm text-green-600 mt-2">
                            Economize {formatCurrency(monthlySavings)} por ano
                          </p>
                        )}
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-center text-muted-foreground">
                        <Users className="w-4 h-4 mr-2" />
                        <span>Até {plan.seats} usuários</span>
                      </div>
                      
                      <div className="space-y-3">
                        {plan.features.map((feature, index) => (
                          <div key={index} className="flex items-start space-x-3">
                            <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{feature}</span>
                          </div>
                        ))}
                      </div>
                      
                      <Button 
                        className="w-full mt-6" 
                        size="lg"
                        variant={plan.is_current ? "outline" : "default"}
                        onClick={() => handleSelectPlan(plan)}
                        disabled={plan.is_current}
                      >
                        {plan.is_current ? (
                          "Plano Atual"
                        ) : plan.is_upgrade ? (
                          <>
                            <Zap className="w-4 h-4 mr-2" />
                            Fazer Upgrade
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4 mr-2" />
                            Selecionar Plano
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {/* Seções para usuários com assinatura */}
        {userStatus.isSubscribed && !userStatus.isAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configurações da Assinatura */}
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Configurações da Assinatura</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Renovação Automática</p>
                    <p className="text-xs text-muted-foreground">Renovar automaticamente na data de vencimento</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Notificações de Cobrança</p>
                    <p className="text-xs text-muted-foreground">Receber lembretes antes da cobrança</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">E-mails Promocionais</p>
                    <p className="text-xs text-muted-foreground">Receber ofertas e promoções especiais</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>

            {/* Usuários da Conta */}
            <Card className="rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold">Usuários da Conta</CardTitle>
                <Button size="sm" variant="ghost" className="text-primary">
                  <UserPlus className="w-4 h-4 mr-1" />
                  Adicionar Usuário
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    {planUsers.length} de {currentPlan?.seats || 1} usuários utilizados
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm">
                          JD
                        </div>
                        <div>
                          <p className="text-sm font-medium">João Dias</p>
                          <p className="text-xs text-muted-foreground">
                            {userStatus.userEmail || 'joao@empresa.monde.com.br'}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">Admin</Badge>
                    </div>
                    {planUsers.map((user, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-white text-sm">
                            {user.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{user}</p>
                            <p className="text-xs text-muted-foreground">{user}@empresa.monde.com.br</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="ghost">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Gestão de usuários detalhada */}
        {userStatus.isSubscribed && !userStatus.isAdmin && (
          <UserManagement
            planSeats={currentPlan?.seats || 1}
            currentUsers={planUsers}
            onUsersUpdate={setPlanUsers}
          />
        )}

        {/* Histórico de Pagamentos */}
        {(paymentHistory.length > 0 || (userStatus.isSubscribed && !userStatus.isAdmin)) && (
          <Card className="rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Histórico de Pagamentos</CardTitle>
              <Button size="sm" variant="ghost" className="text-primary">
                <Download className="w-4 h-4 mr-1" />
                Baixar Fatura
              </Button>
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
                    {paymentHistory.length === 0 ? (
                      <tr>
                        <td className="py-6 text-muted-foreground" colSpan={5}>
                          Nenhum pagamento encontrado.
                        </td>
                      </tr>
                    ) : (
                      paymentHistory.map((p, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="py-4 text-muted-foreground">
                            {p.date ? new Date(p.date).toLocaleDateString('pt-BR') : '-'}
                          </td>
                          <td className="py-4 text-muted-foreground">
                            {p.description || 'Assinatura'}
                          </td>
                          <td className="py-4 font-medium">
                            {formatCurrency(p.amount_cents || 0)}
                          </td>
                          <td className="py-4">
                            <Badge 
                              variant="secondary" 
                              className={
                                (p.status || '').toLowerCase() === 'paid' 
                                  ? 'bg-green-100 text-green-800' 
                                  : (p.status || '').toLowerCase() === 'pending' 
                                    ? 'bg-amber-100 text-amber-800' 
                                    : 'bg-gray-100 text-gray-800'
                              }
                            >
                              {(p.status || '').toLowerCase() === 'paid' ? 'Pago' : (p.status || '—')}
                            </Badge>
                          </td>
                          <td className="py-4">
                            {p.invoice_url ? (
                              <a href={p.invoice_url} target="_blank" rel="noreferrer" className="text-primary text-xs">
                                Baixar
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-xs">Indisponível</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modal de seleção de planos */}
        {selectedPlan && (
          <PlanSelectionModal
            open={planModalOpen}
            onOpenChange={setPlanModalOpen}
            plans={[selectedPlan]}
            onSuccess={handlePlanSuccess}
          />
        )}
      </div>
    </div>
  );
}