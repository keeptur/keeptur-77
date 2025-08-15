import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Check, Crown } from "lucide-react";

interface PlanCardProps {
  plan: {
    id: string;
    name: string;
    seats: number;
    price_cents: number;
    currency: string;
    active: boolean;
    sort_order: number;
  };
  userCount?: number;
  isPopular?: boolean;
  onToggle: (id: string, active: boolean) => void;
  onEdit: (plan: any) => void;
}

export default function PlanCard({ plan, userCount = 0, isPopular = false, onToggle, onEdit }: PlanCardProps) {
  const formatBRL = (cents: number) =>
    (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const features = [
    `Até ${plan.seats} usuários`,
    "Suporte técnico",
    "Relatórios básicos",
    "Integrações padrão"
  ];

  return (
    <Card className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${isPopular ? "border-primary shadow-glow" : ""}`}>
      {isPopular && (
        <div className="absolute -top-1 -right-8 bg-gradient-to-r from-warning to-orange-500 text-warning-foreground px-8 py-1 text-xs font-semibold transform rotate-45 z-10">
          <Crown className="w-3 h-3 mr-1 inline" />
          Mais Popular
        </div>
      )}
      
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
            <p className="text-sm text-muted-foreground">Ideal para pequenas equipes</p>
          </div>
          <Switch
            checked={plan.active}
            onCheckedChange={(checked) => onToggle(plan.id, checked)}
          />
        </div>
        
        <div>
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-primary">{formatBRL(plan.price_cents)}</span>
            <span className="text-sm text-muted-foreground ml-1">/mês</span>
          </div>
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

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">
            Usuários: {userCount}/∞
          </span>
          <Badge variant={plan.active ? "default" : "secondary"} className="text-xs">
            {plan.active ? "Ativo" : "Inativo"}
          </Badge>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => onEdit(plan)}
        >
          Editar Plano
        </Button>
      </CardContent>
    </Card>
  );
}