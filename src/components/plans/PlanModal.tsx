import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";

interface PlanModalProps {
  open: boolean;
  onClose: () => void;
  plan?: any;
  onSave: (planData: any) => void;
  onDelete?: (planId: string) => void;
}

export default function PlanModal({ open, onClose, plan, onSave, onDelete }: PlanModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    seats: 1,
    description: '',
    features: '',
    stripeMonthlyUrl: '',
    stripeYearlyUrl: '',
    active: true
  });

  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name || '',
        price: plan.price_cents ? plan.price_cents / 100 : 0,
        seats: plan.seats || 1,
        description: plan.description || '',
        features: plan.features ? plan.features.join(', ') : '',
        stripeMonthlyUrl: plan.stripe_price_id_monthly || '',
        stripeYearlyUrl: plan.stripe_price_id_yearly || '',
        active: plan.active ?? true
      });
    } else {
      setFormData({
        name: '',
        price: 0,
        seats: 1,
        description: '',
        features: '',
        stripeMonthlyUrl: '',
        stripeYearlyUrl: '',
        active: true
      });
    }
  }, [plan]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      price_cents: Math.round(formData.price * 100),
      features: formData.features.split(',').map(f => f.trim()).filter(f => f),
      stripe_price_id_monthly: formData.stripeMonthlyUrl,
      stripe_price_id_yearly: formData.stripeYearlyUrl
    };
    onSave(submitData);
  };

  const handleDelete = () => {
    if (plan && onDelete) {
      onDelete(plan.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{plan ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
            {plan && onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir Plano</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir o plano "{plan.name}"? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome do Plano *</Label>
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
              <Label htmlFor="price">Preço Mensal (R$) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                placeholder="39.90"
                required
              />
            </div>
            <div>
              <Label htmlFor="seats">Limite de Usuários *</Label>
              <Input
                id="seats"
                type="number"
                min="1"
                value={formData.seats}
                onChange={(e) => setFormData({ ...formData, seats: parseInt(e.target.value) || 1 })}
                placeholder="10"
                required
              />
            </div>
          </div>

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
              value={formData.features}
              onChange={(e) => setFormData({ ...formData, features: e.target.value })}
              placeholder="Feature 1, Feature 2, Feature 3..."
              rows={3}
            />
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="stripe-monthly">URL Stripe Mensal *</Label>
              <Input
                id="stripe-monthly"
                type="url"
                value={formData.stripeMonthlyUrl}
                onChange={(e) => setFormData({ ...formData, stripeMonthlyUrl: e.target.value })}
                placeholder="https://buy.stripe.com/..."
                required
              />
            </div>

            <div>
              <Label htmlFor="stripe-yearly">URL Stripe Anual *</Label>
              <Input
                id="stripe-yearly"
                type="url"
                value={formData.stripeYearlyUrl}
                onChange={(e) => setFormData({ ...formData, stripeYearlyUrl: e.target.value })}
                placeholder="https://buy.stripe.com/..."
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Plano Ativo</Label>
              <p className="text-xs text-muted-foreground">Disponível para assinatura</p>
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