import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Plus, Minus, Star, Users, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePlanSettings } from "@/hooks/usePlanSettings";

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

interface PlanSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plans: AvailablePlan[];
  onSuccess?: () => void;
  currentPlan?: {
    name: string;
    price_cents: number;
    seats: number;
  };
}

interface UserInfo {
  name: string;
  email: string;
}

export function PlanSelectionModal({ open, onOpenChange, plans, onSuccess, currentPlan }: PlanSelectionModalProps) {
  const { toast } = useToast();
  const { settings: planSettings } = usePlanSettings();
  const [selectedPlan, setSelectedPlan] = useState<AvailablePlan | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);
  const [userCount, setUserCount] = useState(1);
  const [users, setUsers] = useState<UserInfo[]>([{ name: "", email: "" }]);
  const [loading, setLoading] = useState(false);

  // Auto-select the provided plan when there's only one (avoid double selection flow)
  useEffect(() => {
    if (open && !selectedPlan && plans.length === 1) {
      setSelectedPlan(plans[0]);
    }
  }, [open, plans, selectedPlan]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const handleUserCountChange = (newCount: number) => {
    const count = Math.max(1, Math.min(20, newCount)); // Limite entre 1 e 20
    setUserCount(count);
    
    // Ajustar array de usuários
    const newUsers = [...users];
    while (newUsers.length < count) {
      newUsers.push({ name: "", email: "" });
    }
    while (newUsers.length > count) {
      newUsers.pop();
    }
    setUsers(newUsers);
  };

  const updateUser = (index: number, field: keyof UserInfo, value: string) => {
    const newUsers = [...users];
    newUsers[index] = { ...newUsers[index], [field]: value };
    setUsers(newUsers);
  };

  const removeUser = (index: number) => {
    if (users.length > 1) {
      const newUsers = users.filter((_, i) => i !== index);
      setUsers(newUsers);
      setUserCount(newUsers.length);
    }
  };

  const calculateTotal = () => {
    if (!selectedPlan) return 0;
    
    const newPlanPrice = isAnnual ? selectedPlan.yearly_price_cents / 12 : selectedPlan.price_cents;
    
    // If upgrading and there's a current plan, calculate prorated upgrade
    if (currentPlan && selectedPlan.price_cents > currentPlan.price_cents) {
      const currentPlanPrice = currentPlan.price_cents;
      return newPlanPrice - currentPlanPrice; // Show only the difference
    }
    
    // Otherwise show full price (new subscription or downgrade)
    return newPlanPrice;
  };

  const calculateAnnualSavings = () => {
    if (!selectedPlan) return 0;
    const monthlyTotal = selectedPlan.price_cents * 12;
    const annualTotal = selectedPlan.yearly_price_cents;
    return monthlyTotal - annualTotal;
  };

  const validateUsers = () => {
    const mondeEmailRegex = /^[^\s@]+@([a-z0-9-]+\.)*monde\.com\.br$/i;
    for (let i = 0; i < userCount; i++) {
      const user = users[i];
      if (!user.name.trim() || !user.email.trim()) {
        toast({
          title: "Erro",
          description: `Por favor, preencha todos os dados do usuário ${i + 1}`,
          variant: "destructive",
        });
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(user.email)) {
        toast({
          title: "Erro", 
          description: `E-mail inválido para o usuário ${i + 1}`,
          variant: "destructive",
        });
        return false;
      }
      if (!mondeEmailRegex.test(user.email)) {
        toast({
          title: "Somente e-mails Monde",
          description: `O e-mail do usuário ${i + 1} deve ser @*.monde.com.br (ex: nome@equipe.monde.com.br)`,
          variant: "destructive",
        });
        return false;
      }
    }
    return true;
  };

  const handleCheckout = async () => {
    if (!selectedPlan) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const mondeToken = localStorage.getItem('monde_token');
    if (!sessionData.session?.user && !mondeToken) {
      toast({
        title: "Login obrigatório",
        description: "Você precisa estar logado (Monde ou Supabase) para finalizar a compra",
        variant: "destructive",
      });
      return;
    }

    // Use logged-in Supabase email or Monde token email (do NOT use users list)
    let buyerEmail = sessionData.session?.user?.email as string | undefined;
    if (!buyerEmail && mondeToken) {
      try {
        const payload = JSON.parse(atob((mondeToken.split(".")[1] || "")));
        buyerEmail = typeof payload?.email === 'string' ? payload.email : undefined;
      } catch {}
    }
    if (!buyerEmail && mondeToken) {
      try {
        const { data } = await supabase.functions.invoke('sync-subscriber', { body: { mondeToken } });
        if (typeof data?.email === 'string') {
          buyerEmail = data.email;
        }
      } catch (e) {
        console.warn('sync-subscriber fallback failed', e);
      }
    }
    if (!buyerEmail) {
      toast({
        title: "Erro",
        description: "Não foi possível identificar o e-mail do comprador. Faça login novamente.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const mondeTokenToSend = mondeToken || undefined;

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          plan_id: selectedPlan.id,
          is_annual: isAnnual,
          monde_token: mondeTokenToSend,
          buyer_email: buyerEmail,
        }
      });
      
      if (error) throw error;
      
      if (data?.url) {
        // Open Stripe checkout in a new tab to avoid iframe restrictions
        window.open(data.url, '_blank');
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (error: any) {
      console.error('Error creating checkout:', error);
      
      let errorMessage = "Erro ao processar checkout. Tente novamente.";
      if (error?.message) {
        errorMessage = error.message;
      }
      
      // Handle specific error cases
      if (error?.details === 'StripeInvalidRequestError') {
        errorMessage = "Erro na configuração de pagamento. Tente novamente ou contate o suporte.";
      }
      
      toast({
        title: "Erro no Checkout",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  const resetModal = () => {
    setSelectedPlan(null);
    setIsAnnual(false);
    setUserCount(1);
    setUsers([{ name: "", email: "" }]);
  };

  const handleModalClose = (open: boolean) => {
    if (!open) {
      resetModal();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleModalClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Escolher Plano</DialogTitle>
          <DialogDescription className="sr-only">Revise os dados e finalize a assinatura</DialogDescription>
        </DialogHeader>

        {!selectedPlan ? (
          // Plan Selection
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Selecione um plano</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Mensal</span>
                <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
                <span className="text-sm text-muted-foreground">Anual</span>
                {isAnnual && (
                  <Badge variant="secondary" className="ml-2">
                    Economize até 20%
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <Card 
                  key={plan.id}
                  className={`relative transition-all hover:shadow-lg border-2 ${
                    plan.is_current 
                      ? 'border-primary/50 cursor-not-allowed opacity-75' 
                      : 'border-border hover:border-primary/30 cursor-pointer'
                  }`}
                  onClick={() => !plan.is_current && setSelectedPlan(plan)}
                >
                  <CardHeader className="text-center pb-4">
                    <div className="space-y-2">
                      <CardTitle className="text-xl font-bold">{plan.name} ({plan.seats})</CardTitle>
                      {plan.is_current && (
                        <Badge variant="default" className="mx-auto">Atual</Badge>
                      )}
                      <div className="space-y-1">
                        <div className="text-4xl font-bold text-primary">
                          {formatCurrency(isAnnual ? plan.yearly_price_cents / 12 : plan.price_cents)}
                        </div>
                        <div className="text-sm text-muted-foreground">/mês</div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency((isAnnual ? plan.yearly_price_cents / 12 : plan.price_cents) / Math.max(1, plan.seats))} por usuário
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>Até {plan.seats} usuários</span>
                    </div>

                    <div className="space-y-3">
                      {planSettings?.coupons_enabled && (
                        <>
                          <h4 className="font-medium text-sm">% Descontos Aplicáveis</h4>
                          
                          {planSettings.first_purchase_discount > 0 && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <div className="flex items-center space-x-2 text-green-700">
                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                                <span className="text-sm font-medium">Desconto Primeira Compra</span>
                                <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                                  -{planSettings.first_purchase_discount}%
                                </Badge>
                              </div>
                            </div>
                          )}
                          
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground mb-2">Cupom de Desconto</p>
                            <div className="flex space-x-2">
                              <input 
                                type="text" 
                                placeholder="Digite seu cupom" 
                                className="flex-1 px-3 py-1 text-sm border border-input rounded text-center"
                              />
                              <Button size="sm" variant="outline" className="text-xs">Aplicar</Button>
                            </div>
                            <p className="text-xs text-blue-600 mt-1">
                              💡 Use cupons de desconto para economizar na sua assinatura!
                            </p>
                          </div>

                          {planSettings.first_purchase_discount > 0 && (
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Preço original:</span>
                                <span>{formatCurrency(isAnnual ? plan.yearly_price_cents / 12 : plan.price_cents)}</span>
                              </div>
                              <div className="flex justify-between text-sm text-green-600">
                                <span>Desconto total ({planSettings.first_purchase_discount}%):</span>
                                <span>-{formatCurrency(((isAnnual ? plan.yearly_price_cents / 12 : plan.price_cents) * (planSettings.first_purchase_discount / 100)))}</span>
                              </div>
                              <div className="border-t pt-2">
                                <div className="flex justify-between font-bold text-lg text-blue-600">
                                  <span>Preço final:</span>
                                  <span>{formatCurrency(((isAnnual ? plan.yearly_price_cents / 12 : plan.price_cents) * (1 - planSettings.first_purchase_discount / 100)))}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {isAnnual && (
                        <p className="text-xs text-green-600 text-center bg-green-50 p-2 rounded">
                          Economize {formatCurrency((plan.price_cents * 12) - plan.yearly_price_cents)} por ano
                        </p>
                      )}
                    </div>

                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3" 
                      disabled={plan.is_current}
                      onClick={() => !plan.is_current && setSelectedPlan(plan)}
                    >
                      <span className="mr-2">⚡</span>
                      {plan.is_current ? "Plano Atual" : "Fazer Upgrade"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          // User Configuration
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Confirmar Plano - {selectedPlan.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Revise os detalhes e prossiga para o pagamento
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedPlan(null)}>
                ← Voltar aos planos
              </Button>
            </div>

            {/* Seleção de quantidade removida temporariamente - será o máximo do plano */}

            {/* Dados dos usuários removidos temporariamente - serão adicionados após a contratação */}

            {/* Billing Toggle */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">Cobrança Anual</span>
                      {isAnnual && (
                        <Badge variant="secondary">Economize {formatCurrency(calculateAnnualSavings())}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isAnnual ? "Pague uma vez por ano e economize" : "Cobrança mensal"}
                    </p>
                  </div>
                  <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="text-base">Resumo do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Plano: {selectedPlan.name}</span>
                  <span>{userCount} usuário{userCount > 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span>Preço por usuário</span>
                  <span>{formatCurrency((isAnnual ? selectedPlan.yearly_price_cents / 12 : selectedPlan.price_cents) / Math.max(1, selectedPlan.seats))}/mês</span>
                </div>
                <div className="flex justify-between">
                  <span>Período de cobrança</span>
                  <span>{isAnnual ? 'Anual' : 'Mensal'}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-semibold">
                  <span>
                    {currentPlan && selectedPlan && selectedPlan.price_cents > currentPlan.price_cents 
                      ? 'Valor do Upgrade' 
                      : 'Total'
                    }
                  </span>
                  <span>{formatCurrency(calculateTotal())}/{isAnnual ? 'ano' : 'mês'}</span>
                </div>
                {currentPlan && selectedPlan && selectedPlan.price_cents > currentPlan.price_cents && (
                  <p className="text-xs text-muted-foreground">
                    Você pagará apenas a diferença entre os planos
                  </p>
                )}
                {isAnnual && (
                  <p className="text-sm text-green-600">
                    Economia anual: {formatCurrency(calculateAnnualSavings())}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setSelectedPlan(null)}>
                Voltar
              </Button>
              <Button onClick={handleCheckout} disabled={loading} className="min-w-[120px]">
                {loading ? "Processando..." : "Finalizar Pedido"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}