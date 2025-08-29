import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Check, Star, Users, Zap } from "lucide-react";
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

export default function Plans() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAnnual, setIsAnnual] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [annualDiscount, setAnnualDiscount] = useState(20);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
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
    fetchPlans();
  }, []);

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setPlanModalOpen(true);
  };

  const handlePlanSuccess = () => {
    fetchPlans(); // Refresh plans after successful subscription
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
    <div className="container max-w-7xl mx-auto px-4 py-8">
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
  );
}