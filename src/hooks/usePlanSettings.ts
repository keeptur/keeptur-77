import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PlanSettings {
  trial_days: number;
  auto_trial: boolean;
  auto_billing: boolean;
  annual_discount: number;
  coupons_enabled: boolean;
  first_purchase_discount: number;
}

export const usePlanSettings = () => {
  const [settings, setSettings] = useState<PlanSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('plan_settings')
        .select('trial_days, auto_trial, auto_billing, annual_discount, coupons_enabled, first_purchase_discount')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      setSettings(data || {
        trial_days: 14,
        auto_trial: true,
        auto_billing: true,
        annual_discount: 20,
        coupons_enabled: true,
        first_purchase_discount: 15
      });
    } catch (error: any) {
      console.error('Erro ao carregar configurações:', error);
      setError(error.message);
      
      // Fallback para valores padrão
      setSettings({
        trial_days: 14,
        auto_trial: true,
        auto_billing: true,
        annual_discount: 20,
        coupons_enabled: true,
        first_purchase_discount: 15
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();

    // Listener para atualizações de configurações
    const handleSettingsUpdate = () => {
      loadSettings();
    };

    window.addEventListener('plan-settings-updated', handleSettingsUpdate);

    return () => {
      window.removeEventListener('plan-settings-updated', handleSettingsUpdate);
    };
  }, []);

  return { settings, loading, error, reload: loadSettings };
};