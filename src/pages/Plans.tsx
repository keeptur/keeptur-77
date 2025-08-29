import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Check, Star, Users, Zap, Clock, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PlanSelectionModal } from "@/components/modals/PlanSelectionModal";

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

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
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
            daysRemaining = Math.ceil((subEnd - now) / (1000 * 60 * 60 * 24));
          } else if (trialEnd && trialEnd > now && !isSubscribed) {
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
    Promise.all([loadUserStatus(), fetchPlans()]);
    
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
        
        // Recarregar planos para atualizar status
        setTimeout(() => {
          Promise.all([loadUserStatus(), fetchPlans()]);
          setPaymentStatus(null);
        }, 3000);
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

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header com informações do usuário */}
      {!userStatus.isAdmin && (
        <div className={`${
          userStatus.isSubscribed 
            ? 'bg-gradient-to-r from-green-600 to-emerald-600' 
            : 'bg-gradient-to-r from-primary to-blue-600'
        } text-white`}>
          <div className="container max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  userStatus.isSubscribed ? 'bg-green-500/20' : 'bg-white/20'
                }`}>
                  {userStatus.isSubscribed ? (
                    <Crown className={`w-8 h-8 ${userStatus.isSubscribed ? 'text-green-300' : 'text-white'}`} />
                  ) : (
                    <Clock className="w-8 h-8" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    {userStatus.isSubscribed 
                      ? `Plano ${userStatus.subscriptionTier || 'Ativo'}` 
                      : userStatus.isInTrial 
                        ? "Período de Trial" 
                        : "Sem Plano Ativo"}
                  </h2>
                  <p className={userStatus.isSubscribed ? "text-green-100" : "text-blue-100"}>
                    {userStatus.isSubscribed
                      ? `${userStatus.daysRemaining} dias de plano ativo`
                      : userStatus.isInTrial
                        ? `${userStatus.daysRemaining} dias restantes`
                        : "Escolha um plano para continuar"}
                  </p>
                </div>
              </div>
              
              {(!userStatus.isSubscribed || userStatus.isInTrial) && (
                <Button
                  onClick={handleSubscribe}
                  size="lg"
                  className="bg-white text-primary hover:bg-blue-50"
                >
                  {userStatus.isInTrial ? "Assinar agora" : "Escolher Plano"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo principal */}
      <div className="container max-w-7xl mx-auto px-4 py-8">
        {paymentStatus && (
          <Card className={`mb-6 border-2 ${
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
        
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Escolha seu Plano</h1>
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

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
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
                      <span className="text-muted-foreground ml-1">/usuário/mês</span>
                    </div>
                    
                    {isAnnual && monthlySavings > 0 && (
                      <p className="text-sm text-green-600 mt-2">
                        Economize {formatCurrency(monthlySavings)} por usuário/ano
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