
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
    let mounted = true;
    
    const initData = async () => {
      if (!mounted) return;
      await loadPlanSettings();
      if (!mounted) return;
      await loadUsers();
    };
    
    initData();
    
    // Escutar mudanças em tempo real nos subscribers (não nos profiles)
    const channel = supabase
      .channel('email-data-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'subscribers'
        },
        async (payload) => {
          if (!mounted) return;
          console.log('Novo subscriber cadastrado:', payload.new);
          
          // Disparar email de boas-vindas automaticamente para o email correto
          const newSubscriber = payload.new as any;
          if (newSubscriber.email) {
            await sendWelcomeEmail(newSubscriber);
          }
          
          // Atualizar lista de usuários apenas se o componente ainda está montado
          if (mounted) {
            await loadUsers();
          }
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
          if (!mounted) return;
          console.log('Subscriber atualizado:', payload.new);
          // Disparar emails baseados em mudança de status
          handleSubscriptionStatusChange(payload.new as any);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
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
      // Buscar dados dos subscribers, não dos profiles
      const { data: subscribers } = await supabase
        .from('subscribers')
        .select('*')
        .order('created_at', { ascending: false });

      if (subscribers) {
        // Processar dados dos subscribers
        const processedUsers = subscribers.map(subscriber => {
          // Usar o email correto do subscriber, não o de login
          const emailParts = subscriber.email.split('@');
          const subdomain = emailParts[1]?.split('.')[0] || '';
          
          return {
            id: subscriber.id,
            email: subscriber.email, // Email correto do subscriber
            full_name: subscriber.display_name || subscriber.username || subscriber.email,
            empresa: subdomain,
            subdominio: subdomain,
            trial_start: subscriber.trial_start || calculateTrialStart(subscriber.created_at),
            trial_end: subscriber.trial_end || calculateTrialEnd(subscriber.created_at),
            subscription_status: subscriber.subscribed ? 'active' : 'trial'
          };
        });

        setUsers(processedUsers);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const sendWelcomeEmail = async (subscriber: any) => {
    try {
      // Verificar se existe regra de automação ativa para user_signup
      const { data: rule } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('trigger', 'user_signup')
        .eq('active', true)
        .limit(1)
        .maybeSingle();

      if (!rule) {
        console.log('Nenhuma regra ativa para user_signup');
        return;
      }

      // Preparar dados reais do subscriber
      const emailData = {
        to_email: subscriber.email, // Email correto do subscriber
        template_type: rule.template_type,
        variables: {
          nome_usuario: subscriber.display_name || subscriber.username || subscriber.email.split('@')[0],
          email: subscriber.email,
          nome_sistema: 'Keeptur',
          empresa: subscriber.email.split('@')[1]?.split('.')[0] || '',
          subdominio: subscriber.email.split('@')[1]?.split('.')[0] || '',
          link_acesso: `https://${subscriber.email.split('@')[1]?.split('.')[0] || 'app'}.keeptur.com`,
          dias_trial: planSettings?.trial_days?.toString() || '14',
          data_vencimento: subscriber.trial_end ? 
            new Date(subscriber.trial_end).toLocaleDateString('pt-BR') : 
            calculateTrialEnd(subscriber.created_at)
        },
        delay_hours: rule.delay_hours || 0
      };

      // Enviar via edge function
      const { error } = await supabase.functions.invoke('send-automated-email', {
        body: emailData
      });

      if (error) {
        console.error('Erro ao enviar email de boas-vindas:', error);
        
        // Log do erro no banco
        await supabase
          .from('email_logs')
          .insert([{
            user_email: subscriber.email,
            template_type: rule.template_type,
            status: 'failed',
            error_message: error.message,
            metadata: { subscriber_id: subscriber.id }
          }]);
      } else {
        console.log('Email de boas-vindas enviado:', subscriber.email);
        
        // Log do sucesso
        await supabase
          .from('email_logs')
          .insert([{
            user_email: subscriber.email,
            template_type: rule.template_type,
            status: 'sent',
            metadata: { subscriber_id: subscriber.id }
          }]);

        toast({
          title: "Email enviado",
          description: `Email de boas-vindas enviado para ${subscriber.email}`
        });
      }
    } catch (error) {
      console.error('Erro ao processar envio de email:', error);
    }
  };

  const handleSubscriptionStatusChange = async (subscriber: any) => {
    try {
      // Verificar mudanças de status e disparar emails apropriados
      if (subscriber.subscribed && !subscriber.previous_subscribed) {
        // Usuário se tornou assinante - verificar regra subscription_active
        const { data: rule } = await supabase
          .from('automation_rules')
          .select('*')
          .eq('trigger', 'subscription_active')
          .eq('active', true)
          .limit(1)
          .maybeSingle();

        if (rule) {
          await sendSubscriptionWelcomeEmail(subscriber, rule);
        }
      }
      
      // Verificar status do trial
      if (!subscriber.subscribed && subscriber.trial_end) {
        const trialEndDate = new Date(subscriber.trial_end);
        const now = new Date();
        const daysUntilEnd = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilEnd === 7) {
          await checkAndSendTrialEmail('trial_ending', subscriber, '7');
        } else if (daysUntilEnd === 1) {
          await checkAndSendTrialEmail('trial_ending', subscriber, '1');
        } else if (daysUntilEnd <= 0) {
          await checkAndSendTrialEmail('trial_expired', subscriber, '0');
        }
      }
    } catch (error) {
      console.error('Erro ao processar mudança de status:', error);
    }
  };

  const checkAndSendTrialEmail = async (trigger: string, subscriber: any, daysRemaining: string) => {
    const { data: rule } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('trigger', trigger)
      .eq('active', true)
      .limit(1)
      .maybeSingle();

    if (!rule) return;

    const emailData = {
      to_email: subscriber.email,
      template_type: rule.template_type,
      variables: {
        nome_usuario: subscriber.display_name || subscriber.username || subscriber.email.split('@')[0],
        email: subscriber.email,
        nome_sistema: 'Keeptur',
        dias_restantes: daysRemaining,
        data_vencimento: new Date(subscriber.trial_end).toLocaleDateString('pt-BR'),
        link_pagamento: `https://${subscriber.email.split('@')[1]?.split('.')[0] || 'app'}.keeptur.com/subscription`
      },
      delay_hours: rule.delay_hours || 0
    };

    const { error } = await supabase.functions.invoke('send-automated-email', {
      body: emailData
    });

    // Log do resultado
    await supabase
      .from('email_logs')
      .insert([{
        user_email: subscriber.email,
        template_type: rule.template_type,
        status: error ? 'failed' : 'sent',
        error_message: error?.message,
        metadata: { subscriber_id: subscriber.id, trigger }
      }]);
  };

  const sendSubscriptionWelcomeEmail = async (subscriber: any, rule: any) => {
    const emailData = {
      to_email: subscriber.email,
      template_type: rule.template_type,
      variables: {
        nome_usuario: subscriber.display_name || subscriber.username || subscriber.email.split('@')[0],
        email: subscriber.email,
        nome_sistema: 'Keeptur',
        nome_plano: subscriber.subscription_tier || 'Premium',
        empresa: subscriber.email.split('@')[1]?.split('.')[0] || '',
        link_acesso: `https://${subscriber.email.split('@')[1]?.split('.')[0] || 'app'}.keeptur.com`
      },
      delay_hours: rule.delay_hours || 0
    };

    const { error } = await supabase.functions.invoke('send-automated-email', {
      body: emailData
    });

    // Log do resultado
    await supabase
      .from('email_logs')
      .insert([{
        user_email: subscriber.email,
        template_type: rule.template_type,
        status: error ? 'failed' : 'sent',
        error_message: error?.message,
        metadata: { subscriber_id: subscriber.id }
      }]);
  };

  const calculateTrialStart = (createdAt: string) => {
    return new Date(createdAt).toISOString();
  };

  const calculateTrialEnd = (createdAt: string) => {
    const trialDays = planSettings?.trial_days || 14;
    const startDate = new Date(createdAt);
    const endDate = new Date(startDate.getTime() + (trialDays * 24 * 60 * 60 * 1000));
    return endDate.toLocaleDateString('pt-BR');
  };

  const getRealTimeVariables = (user: UserData) => {
    return {
      nome_usuario: user.full_name,
      email: user.email,
      nome_sistema: 'Keeptur',
      empresa: user.empresa || '',
      subdominio: user.subdominio || '',
      dias_trial: planSettings?.trial_days?.toString() || '14',
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
