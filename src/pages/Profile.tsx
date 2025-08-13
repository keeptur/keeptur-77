import React, { useEffect, useState } from 'react';
import { UserProfile } from "@/components/shared/UserProfile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminProfileForm from "@/components/admin/AdminProfileForm";

/**
 * Exibe informações do perfil e do trial/assinatura para o usuário logado.
 *
 * Esta versão corrige o cálculo dos dias de trial: se `trial_end` não estiver
 * presente, calcula-se com base em `trial_start` e na configuração de dias
 * padrão definida pelo administrador. Caso o usuário esteja inscrito ou sem
 * período de trial, nada é mostrado.
 */
function TrialInfo() {
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  // Chave usada localmente para armazenar a data de início do trial quando ainda não existe registro no Supabase.
  const TRIAL_START_KEY = "keeptur:trial-start";

  useEffect(() => {
    let mounted = true;
    (async () => {
      // Tenta via sessão do Supabase
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        // Buscar configurações dinâmicas para trial
        const { data: settings } = await supabase
          .from('settings')
          .select('trial_days')
          .limit(1)
          .maybeSingle();
        const trialDaysCfg = settings?.trial_days ?? null;

        const { data } = await supabase
          .from('subscribers')
          .select('trial_end, trial_start, subscribed, subscription_end')
          .or(`user_id.eq.${user.id},email.eq.${user.email}`)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (mounted) {
          if (data?.subscribed) {
            // Assinante ativo: não exibir trial
            setDaysRemaining(null);
            return;
          }
          if (data?.trial_end) {
            // Calcular com base no trial_end
            const nowMs = Date.now();
            const endMs = new Date(data.trial_end).getTime();
            setDaysRemaining(Math.max(0, Math.ceil((endMs - nowMs) / (1000 * 60 * 60 * 24))));
            return;
          }
          if (data?.trial_start && trialDaysCfg) {
            // Calcular com base no início + dias de configuração
            const start = new Date(data.trial_start);
            const end = new Date(start);
            end.setDate(end.getDate() + trialDaysCfg);
            const nowMs = Date.now();
            const diffMs = end.getTime() - nowMs;
            setDaysRemaining(Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24))));
            return;
          }
          // Se não há registro de trial no Supabase mas temos configuração, usa a data local para calcular
          if (trialDaysCfg) {
            const startIso = localStorage.getItem(TRIAL_START_KEY);
            const startDate = startIso ? new Date(startIso) : new Date();
            const end = new Date(startDate);
            end.setDate(end.getDate() + trialDaysCfg);
            const nowMs = Date.now();
            const diffMs = end.getTime() - nowMs;
            setDaysRemaining(Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24))));
            return;
          }
          setDaysRemaining(null);
        }
        return;
      }
      // Usuário sem sessão: não mostrar info
      mounted && setDaysRemaining(null);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (daysRemaining === null) return null;
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-muted-foreground">Dias restantes de trial</p>
        <p className="text-2xl font-semibold">
          {daysRemaining} dia{daysRemaining === 1 ? '' : 's'}
        </p>
      </div>
    </div>
  );
}

const ProfilePage = () => {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        mounted && setIsAdmin(false);
        return;
      }
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      const admin = (roles || []).some((r) => r.role === 'admin');
      mounted && setIsAdmin(admin);
    })();
    return () => {
      // noop
    };
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-2 mb-6">
        <User className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Meu Perfil</h1>
      </div>
      <div className="grid gap-6">
        {/* Perfil do usuário logado */}
        <UserProfile showFullProfile={true} />
        {/* Trial info (apenas não-admin) */}
        {!isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Status do Trial</CardTitle>
              <CardDescription>Informações sobre seu período de avaliação</CardDescription>
            </CardHeader>
            <CardContent>
              <TrialInfo />
            </CardContent>
          </Card>
        )}
        {/* Formulário de perfil (somente admin) */}
        {isAdmin && <AdminProfileForm />}
        {/* Informações adicionais */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações da Conta</CardTitle>
            <CardDescription>
              Suas informações pessoais e configurações de acesso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">
                Para alterar suas informações pessoais, entre em contato com o administrador do sistema.
              </p>
              <p>
                Todas as alterações em dados pessoais passam por um processo de validação.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;