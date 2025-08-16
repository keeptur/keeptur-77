import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Check, Crown, Trash2 } from "lucide-react";

interface PlanCardProps {
  plan: any;
  userCount?: number;
  isPopular?: boolean;
  onToggle: (id: string, active: boolean) => void;
  onEdit: (plan: any) => void;
  onDelete: (planId: string) => void;
  settings?: any;
}

export default function PlanCard({ plan, userCount, isPopular, onToggle, onEdit, onDelete, settings }: PlanCardProps) {
  const formatBRL = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const calculateAnnualPrice = (monthlyPrice: number) => {
    const annualPrice = monthlyPrice * 12;
    const discount = settings?.annual_discount || 20;
    return annualPrice * (1 - discount / 100);
  };

  const handlePurchase = (isAnnual: boolean) => {
    const url = isAnnual ? plan.stripe_price_id_yearly : plan.stripe_price_id_monthly;
    if (url) {
      window.open(url, '_blank');
    }
  };

  const features = plan.features || [
    `Até ${plan.seats} usuários`,
    "Suporte técnico",
    "Relatórios básicos",
    "Integrações padrão"
  ];

  return (
    <Card className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${isPopular ? "border-primary shadow-glow" : ""}`}>
      {isPopular && (
        <div className="absolute -top-1 -right-8 bg-gradient-to-r from-warning to-orange-500 text-warning-foreground px-8 py-1 text-xs font-semibold transform rotate-45 z-10 whitespace-nowrap">
          <Crown className="w-3 h-3 mr-1 inline" />
          Mais Popular
        </div>
      )}
      
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
            <p className="text-sm text-muted-foreground">{plan.description || "Ideal para pequenas equipes"}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(plan.id)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="space-y-2">
          <div className="text-3xl font-bold">
            {formatBRL(plan.price_cents)}
          </div>
          <div className="text-sm text-muted-foreground">por mês</div>
          
          {settings?.annual_discount && (
            <div className="text-sm">
              <span className="text-muted-foreground">Anual: </span>
              <span className="font-semibold text-green-600">
                {formatBRL(calculateAnnualPrice(plan.price_cents))}
              </span>
              <span className="text-xs text-muted-foreground ml-1">
                ({settings.annual_discount}% desc.)
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-3">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-success" />
              <span className="text-sm text-muted-foreground">{feature}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex gap-2">
            <Button
              variant="default"
              onClick={() => handlePurchase(false)}
              className="flex-1"
              disabled={!plan.stripe_price_id_monthly}
            >
              Comprar Mensal
            </Button>
            <Button
              variant="outline"
              onClick={() => handlePurchase(true)}
              className="flex-1"
              disabled={!plan.stripe_price_id_yearly}
            >
              Comprar Anual
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Ativo</span>
            <Switch
              checked={plan.active}
              onCheckedChange={(checked) => onToggle(plan.id, checked)}
            />
          </div>
          
          <Button
            variant="outline"
            onClick={() => onEdit(plan)}
            className="w-full"
          >
            Editar Plano
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}