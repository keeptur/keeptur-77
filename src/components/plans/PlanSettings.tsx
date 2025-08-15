import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function PlanSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    trialDays: 14,
    autoTrial: true,
    autoBilling: true,
    annualDiscount: 20,
    couponsEnabled: true,
    firstPurchaseDiscount: 15
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('plan_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings({
          trialDays: data.trial_days,
          autoTrial: data.auto_trial,
          autoBilling: data.auto_billing,
          annualDiscount: data.annual_discount,
          couponsEnabled: data.coupons_enabled,
          firstPurchaseDiscount: data.first_purchase_discount
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar configurações dos planos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('plan_settings')
        .upsert({
          trial_days: settings.trialDays,
          auto_trial: settings.autoTrial,
          auto_billing: settings.autoBilling,
          annual_discount: settings.annualDiscount,
          coupons_enabled: settings.couponsEnabled,
          first_purchase_discount: settings.firstPurchaseDiscount,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Trial Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Trial</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Período de Trial</p>
              <p className="text-xs text-muted-foreground">Duração padrão do período gratuito</p>
            </div>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                value={settings.trialDays}
                onChange={(e) => setSettings({ ...settings, trialDays: parseInt(e.target.value) || 0 })}
                className="w-16 text-center"
                min="0"
              />
              <span className="text-sm text-muted-foreground">dias</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Trial Automático</p>
              <p className="text-xs text-muted-foreground">Iniciar trial automaticamente no cadastro</p>
            </div>
            <Switch
              checked={settings.autoTrial}
              onCheckedChange={(checked) => setSettings({ ...settings, autoTrial: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Cobrança Automática</p>
              <p className="text-xs text-muted-foreground">Cobrar automaticamente após o trial</p>
            </div>
            <Switch
              checked={settings.autoBilling}
              onCheckedChange={(checked) => setSettings({ ...settings, autoBilling: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Discount Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Gestão de Descontos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Desconto Anual</p>
              <p className="text-xs text-muted-foreground">Desconto para pagamento anual</p>
            </div>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                value={settings.annualDiscount}
                onChange={(e) => setSettings({ ...settings, annualDiscount: parseInt(e.target.value) || 0 })}
                className="w-16 text-center"
                min="0"
                max="100"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Cupons Ativos</p>
              <p className="text-xs text-muted-foreground">Permitir uso de cupons de desconto</p>
            </div>
            <Switch
              checked={settings.couponsEnabled}
              onCheckedChange={(checked) => setSettings({ ...settings, couponsEnabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Desconto Primeira Compra</p>
              <p className="text-xs text-muted-foreground">Desconto especial para novos clientes</p>
            </div>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                value={settings.firstPurchaseDiscount}
                onChange={(e) => setSettings({ ...settings, firstPurchaseDiscount: parseInt(e.target.value) || 0 })}
                className="w-16 text-center"
                min="0"
                max="100"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botão de Salvar */}
      <div className="flex justify-end mt-6">
        <Button 
          onClick={saveSettings}
          disabled={saving || loading}
          className="min-w-32"
        >
          {saving ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
}