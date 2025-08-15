
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import PlanCard from "@/components/plans/PlanCard";
import PlanModal from "@/components/plans/PlanModal";
import PlanCharts from "@/components/plans/PlanCharts";
import PlanSettings from "@/components/plans/PlanSettings";

interface PlanKit {
  id: string;
  name: string;
  seats: number;
  price_cents: number;
  currency: string;
  active: boolean;
  sort_order: number;
}

export default function PlansSection() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<PlanKit[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanKit | null>(null);

  const loadPlans = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("plan_kits")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      toast({ 
        title: "Erro ao carregar planos", 
        description: error.message, 
        variant: "destructive" 
      });
    } else {
      setPlans(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleTogglePlan = async (id: string, active: boolean) => {
    const { error } = await supabase
      .from("plan_kits")
      .update({ active })
      .eq("id", id);

    if (error) {
      toast({ 
        title: "Erro ao atualizar plano", 
        description: error.message, 
        variant: "destructive" 
      });
    } else {
      toast({ title: active ? "Plano ativado" : "Plano desativado" });
      loadPlans();
    }
  };

  const handleEditPlan = (plan: PlanKit) => {
    setEditingPlan(plan);
    setModalOpen(true);
  };

  const handleSavePlan = async (planData: any) => {
    if (editingPlan) {
      // Update existing plan
      const { error } = await supabase
        .from("plan_kits")
        .update(planData)
        .eq("id", editingPlan.id);

      if (error) {
        toast({ 
          title: "Erro ao atualizar plano", 
          description: error.message, 
          variant: "destructive" 
        });
      } else {
        toast({ title: "Plano atualizado com sucesso" });
        setModalOpen(false);
        setEditingPlan(null);
        loadPlans();
      }
    } else {
      // Create new plan
      const { error } = await supabase
        .from("plan_kits")
        .insert(planData);

      if (error) {
        toast({ 
          title: "Erro ao criar plano", 
          description: error.message, 
          variant: "destructive" 
        });
      } else {
        toast({ title: "Plano criado com sucesso" });
        setModalOpen(false);
        loadPlans();
      }
    }
  };

  const handleAddPlan = () => {
    setEditingPlan(null);
    setModalOpen(true);
  };

  // Mock user counts for demonstration
  const getUserCount = (planId: string) => {
    const counts = { 0: 247, 1: 684, 2: 316 };
    const index = plans.findIndex(p => p.id === planId);
    return counts[index as keyof typeof counts] || 0;
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
            userCount={getUserCount(plan.id)}
            isPopular={index === 1} // Make middle plan popular
            onToggle={handleTogglePlan}
            onEdit={handleEditPlan}
          />
        ))}
      </div>

      {/* Charts */}
      <PlanCharts />

      {/* Settings */}
      <PlanSettings />

      {/* Modal */}
      <PlanModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingPlan(null);
        }}
        plan={editingPlan}
        onSave={handleSavePlan}
      />
    </div>
  );
}
