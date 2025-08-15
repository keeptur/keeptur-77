import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface PlanModalProps {
  open: boolean;
  onClose: () => void;
  plan?: any;
  onSave: (planData: any) => void;
}

export default function PlanModal({ open, onClose, plan, onSave }: PlanModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    price_cents: 0,
    seats: 1,
    currency: "BRL",
    active: true,
    sort_order: 100,
    description: "",
    features: ""
  });

  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name || "",
        price_cents: plan.price_cents || 0,
        seats: plan.seats || 1,
        currency: plan.currency || "BRL",
        active: plan.active ?? true,
        sort_order: plan.sort_order || 100,
        description: "",
        features: ""
      });
    } else {
      setFormData({
        name: "",
        price_cents: 3990,
        seats: 1,
        currency: "BRL",
        active: true,
        sort_order: 100,
        description: "",
        features: ""
      });
    }
  }, [plan]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const showAdditionalUserSection = formData.seats > 10;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{plan ? "Editar Plano" : "Novo Plano"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome do Plano</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nome do plano"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Preço Mensal (R$)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price_cents / 100}
                onChange={(e) => setFormData({ ...formData, price_cents: Math.round(parseFloat(e.target.value || "0") * 100) })}
                placeholder="0,00"
                required
              />
            </div>
            <div>
              <Label htmlFor="seats">Limite de Usuários</Label>
              <Input
                id="seats"
                type="number"
                min="1"
                value={formData.seats}
                onChange={(e) => setFormData({ ...formData, seats: parseInt(e.target.value || "1") })}
                placeholder="0"
                required
              />
            </div>
          </div>

          {showAdditionalUserSection && (
            <div>
              <Label htmlFor="additional">Preço por Usuário Adicional (R$)</Label>
              <Input
                id="additional"
                type="number"
                step="0.01"
                min="0"
                placeholder="39,90"
              />
            </div>
          )}

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição do plano"
            />
          </div>

          <div>
            <Label htmlFor="features">Recursos Incluídos</Label>
            <Textarea
              id="features"
              rows={4}
              value={formData.features}
              onChange={(e) => setFormData({ ...formData, features: e.target.value })}
              placeholder="Liste os recursos, um por linha"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Plano Ativo</p>
              <p className="text-xs text-muted-foreground">Disponível para novos usuários</p>
            </div>
            <Switch
              checked={formData.active}
              onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              Salvar Alterações
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}