import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface UserData {
  id: string;
  email: string;
  full_name: string;
  empresa?: string;
  subdominio?: string;
  trial_start?: string;
  trial_end?: string;
  subscription_status?: string;
}

interface PlanData {
  trial_days: number;
  auto_trial: boolean;
  auto_billing: boolean;
}

export const useRealTimeData = () => {
  const [planSettings, setPlanSettings] = useState<PlanData | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);

  useEffect(() => {
    loadPlanSettings();
    loadUsers();
    
    // Escutar mudanças em tempo real
    const channel = supabase
      .channel('email-data-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profiles'
        },
        async (payload) => {
          console.log('Novo usuário cadastrado:', payload.new);
          
          // Disparar email de boas-vindas automaticamente
          const newUser = payload.new as any;
          await sendWelcomeEmail(newUser);
          
          // Atualizar lista de usuários
          loadUsers();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'subscribers'
        },
        (payload) => {
          console.log('Status de assinatura atualizado:', payload.new);
          // Disparar emails baseados em mudança de status
          handleSubscriptionStatusChange(payload.new as any);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadPlanSettings = async () => {
    try {
      const { data } = await supabase
        .from('plan_settings')
        .select('trial_days, auto_trial, auto_billing')
        .limit(1)
        .maybeSingle();

      if (data) {
        setPlanSettings(data);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações do plano:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at')
        .order('created_at', { ascending: false });

      if (profiles) {
        // Processar dados dos usuários para extrair empresa e subdomínio
        const processedUsers = profiles.map(profile => {
          const emailParts = profile.email.split('@');
          const subdomain = emailParts[1]?.split('.')[0] || '';
          
          return {
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name || profile.email,
            empresa: subdomain,
            subdominio: subdomain,
            trial_start: calculateTrialStart(profile.created_at),
            trial_end: calculateTrialEnd(profile.created_at),
            subscription_status: 'trial'
          };
        });

        setUsers(processedUsers);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const sendWelcomeEmail = async (user: any) => {
    try {
      // Preparar dados reais do usuário
      const emailData = {
        to_email: user.email,
        template_type: 'welcome',
        variables: {
          nome_usuario: user.full_name || user.email.split('@')[0],
          email: user.email,
          nome_sistema: 'Keeptur',
          empresa: user.email.split('@')[1]?.split('.')[0] || '',
          subdominio: user.email.split('@')[1]?.split('.')[0] || '',
          link_acesso: `https://${user.email.split('@')[1]?.split('.')[0] || 'app'}.keeptur.com`,
          dias_trial: planSettings?.trial_days || 14,
          data_vencimento: calculateTrialEnd(new Date().toISOString())
        }
      };

      // Enviar via edge function
      const { error } = await supabase.functions.invoke('send-automated-email', {
        body: emailData
      });

      if (error) {
        console.error('Erro ao enviar email de boas-vindas:', error);
      } else {
        toast({
          title: "Email enviado",
          description: `Email de boas-vindas enviado para ${user.email}`
        });
      }
    } catch (error) {
      console.error('Erro ao processar envio de email:', error);
    }
  };

  const handleSubscriptionStatusChange = async (subscriber: any) => {
    // Implementar lógica para emails baseados em mudança de status
    if (subscriber.subscribed && !subscriber.previous_subscribed) {
      // Usuário se tornou assinante - enviar email de boas-vindas premium
      await sendSubscriptionWelcomeEmail(subscriber);
    }
    
    if (!subscriber.subscribed && subscriber.trial_end) {
      const trialEndDate = new Date(subscriber.trial_end);
      const now = new Date();
      const daysUntilEnd = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilEnd === 7) {
        // 7 dias para o fim do trial
        await sendTrialEndingEmail(subscriber);
      } else if (daysUntilEnd === 1) {
        // 1 dia para o fim do trial
        await sendTrialEndingSoonEmail(subscriber);
      } else if (daysUntilEnd <= 0) {
        // Trial expirado
        await sendTrialExpiredEmail(subscriber);
      }
    }
  };

  const sendSubscriptionWelcomeEmail = async (subscriber: any) => {
    const emailData = {
      to_email: subscriber.email,
      template_type: 'subscription_welcome',
      variables: {
        nome_usuario: subscriber.display_name || subscriber.email.split('@')[0],
        email: subscriber.email,
        nome_sistema: 'Keeptur',
        nome_plano: subscriber.subscription_tier || 'Premium',
        empresa: subscriber.email.split('@')[1]?.split('.')[0] || '',
        link_acesso: `https://${subscriber.email.split('@')[1]?.split('.')[0] || 'app'}.keeptur.com`
      }
    };

    await supabase.functions.invoke('send-automated-email', {
      body: emailData
    });
  };

  const sendTrialEndingEmail = async (subscriber: any) => {
    const emailData = {
      to_email: subscriber.email,
      template_type: 'trial_ending',
      variables: {
        nome_usuario: subscriber.display_name || subscriber.email.split('@')[0],
        email: subscriber.email,
        nome_sistema: 'Keeptur',
        dias_restantes: '7',
        data_vencimento: new Date(subscriber.trial_end).toLocaleDateString('pt-BR'),
        link_pagamento: `https://${subscriber.email.split('@')[1]?.split('.')[0] || 'app'}.keeptur.com/subscription`
      }
    };

    await supabase.functions.invoke('send-automated-email', {
      body: emailData
    });
  };

  const sendTrialEndingSoonEmail = async (subscriber: any) => {
    const emailData = {
      to_email: subscriber.email,
      template_type: 'trial_ending',
      variables: {
        nome_usuario: subscriber.display_name || subscriber.email.split('@')[0],
        email: subscriber.email,
        nome_sistema: 'Keeptur',
        dias_restantes: '1',
        data_vencimento: new Date(subscriber.trial_end).toLocaleDateString('pt-BR'),
        link_pagamento: `https://${subscriber.email.split('@')[1]?.split('.')[0] || 'app'}.keeptur.com/subscription`
      }
    };

    await supabase.functions.invoke('send-automated-email', {
      body: emailData
    });
  };

  const sendTrialExpiredEmail = async (subscriber: any) => {
    const emailData = {
      to_email: subscriber.email,
      template_type: 'trial_ended',
      variables: {
        nome_usuario: subscriber.display_name || subscriber.email.split('@')[0],
        email: subscriber.email,
        nome_sistema: 'Keeptur',
        data_vencimento: new Date(subscriber.trial_end).toLocaleDateString('pt-BR'),
        link_pagamento: `https://${subscriber.email.split('@')[1]?.split('.')[0] || 'app'}.keeptur.com/subscription`
      }
    };

    await supabase.functions.invoke('send-automated-email', {
      body: emailData
    });
  };

  const calculateTrialStart = (createdAt: string) => {
    return new Date(createdAt).toISOString();
  };

  const calculateTrialEnd = (createdAt: string) => {
    const trialDays = planSettings?.trial_days || 14;
    const startDate = new Date(createdAt);
    const endDate = new Date(startDate.getTime() + (trialDays * 24 * 60 * 60 * 1000));
    return endDate.toISOString();
  };

  const getRealTimeVariables = (user: UserData) => {
    return {
      nome_usuario: user.full_name,
      email: user.email,
      nome_sistema: 'Keeptur',
      empresa: user.empresa || '',
      subdominio: user.subdominio || '',
      dias_trial: planSettings?.trial_days || 14,
      data_vencimento: user.trial_end ? new Date(user.trial_end).toLocaleDateString('pt-BR') : '',
      dias_restantes: user.trial_end ? 
        Math.ceil((new Date(user.trial_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)).toString() : '0',
      link_acesso: `https://${user.subdominio || 'app'}.keeptur.com`,
      link_pagamento: `https://${user.subdominio || 'app'}.keeptur.com/subscription`,
      valor_plano: 'R$ 39,90',
      nome_plano: 'Plano Premium'
    };
  };

  return {
    planSettings,
    users,
    getRealTimeVariables,
    sendWelcomeEmail,
    loadUsers,
    loadPlanSettings
  };
};