import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus } from "lucide-react";
import PlanCard from "@/components/plans/PlanCard";
import PlanModal from "@/components/plans/PlanModal";
import PlanSettings from "@/components/plans/PlanSettings";
import { usePlanSettings } from "@/hooks/usePlanSettings";

interface PlanKit {
  id: string;
  name: string;
  seats: number;
  price_cents: number;
  currency: string;
  active: boolean;
  sort_order: number;
  description?: string;
  features?: string[];
  stripe_price_id_monthly?: string;
  stripe_price_id_yearly?: string;
}

export default function PlansSection() {
  const { toast } = useToast();
  const { settings } = usePlanSettings();
  const [plans, setPlans] = useState<PlanKit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanKit | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('plan_kits')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar planos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePlan = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('plan_kits')
        .update({ active, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: `Plano ${active ? 'ativado' : 'desativado'} com sucesso!`,
      });
      
      await loadPlans();
    } catch (error) {
      console.error('Erro ao atualizar plano:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar plano. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleEditPlan = (plan: PlanKit) => {
    setEditingPlan(plan);
    setIsModalOpen(true);
  };

  const handleSavePlan = async (planData: any) => {
    try {
      if (editingPlan) {
        const { error } = await supabase
          .from('plan_kits')
          .update({
            name: planData.name,
            price_cents: planData.price_cents,
            seats: planData.seats,
            description: planData.description,
            features: planData.features,
            stripe_price_id_monthly: planData.stripe_price_id_monthly,
            stripe_price_id_yearly: planData.stripe_price_id_yearly,
            active: planData.active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingPlan.id);

        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Plano atualizado com sucesso!",
        });
      } else {
        const { error } = await supabase
          .from('plan_kits')
          .insert({
            name: planData.name,
            price_cents: planData.price_cents,
            seats: planData.seats,
            description: planData.description,
            features: planData.features,
            stripe_price_id_monthly: planData.stripe_price_id_monthly,
            stripe_price_id_yearly: planData.stripe_price_id_yearly,
            active: planData.active,
            currency: 'BRL'
          });

        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Plano criado com sucesso!",
        });
      }
      
      await loadPlans();
      setIsModalOpen(false);
      setEditingPlan(null);
    } catch (error) {
      console.error('Erro ao salvar plano:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar plano. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleDeletePlan = async (planId: string) => {
    try {
      const { error } = await supabase
        .from('plan_kits')
        .delete()
        .eq('id', planId);

      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Plano excluído com sucesso!",
      });
      
      await loadPlans();
      setIsModalOpen(false);
      setEditingPlan(null);
    } catch (error) {
      console.error('Erro ao excluir plano:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir plano. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleAddPlan = () => {
    setEditingPlan(null);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Carregando planos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gerenciamento de Planos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure e gerencie os planos de assinatura da plataforma.
          </p>
        </div>
        <Button onClick={handleAddPlan} className="flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Adicionar Plano</span>
        </Button>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {plans.map((plan, index) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isPopular={index === 1}
            onToggle={handleTogglePlan}
            onEdit={handleEditPlan}
            onDelete={handleDeletePlan}
            settings={settings}
          />
        ))}
      </div>

      {/* Settings */}
      <PlanSettings />

      {/* Modal */}
      <PlanModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPlan(null);
        }}
        plan={editingPlan}
        onSave={handleSavePlan}
        onDelete={handleDeletePlan}
      />
    </div>
  );
}