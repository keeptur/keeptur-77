
import React, { useEffect, useMemo, useState } from 'react';
import { UserProfile } from "@/components/shared/UserProfile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminProfileForm from "@/components/admin/AdminProfileForm";

const DEFAULT_TRIAL_DAYS = 7;

function TrialInfo() {
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      // Tenta via sessão do Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const { data } = await supabase
          .from('subscribers')
          .select('trial_end, subscribed')
          .or(`user_id.eq.${user.id},email.eq.${user.email}`)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (mounted) {
          if (data?.trial_end && !data?.subscribed) {
            const now = Date.now();
            const t = new Date(data.trial_end).getTime();
            setDaysRemaining(Math.max(0, Math.ceil((t - now) / (1000 * 60 * 60 * 24))));
            return;
          }
          setDaysRemaining(null);
        }
        return;
      }

      // Sem sessão: tenta Edge Function baseada no token do Monde
      const mondeToken = localStorage.getItem("monde_token");
      if (mondeToken) {
        try {
          const { data } = await supabase.functions.invoke('sync-subscriber', { body: { mondeToken } });
          const trialEnd = (data as any)?.trial_end as string | undefined;
          const subscribed = !!(data as any)?.subscribed;
          if (mounted && trialEnd && !subscribed) {
            const now = Date.now();
            const t = new Date(trialEnd).getTime();
            setDaysRemaining(Math.max(0, Math.ceil((t - now) / (1000 * 60 * 60 * 24))));
          } else if (mounted) {
            setDaysRemaining(null);
          }
        } catch {
          mounted && setDaysRemaining(null);
        }
      } else {
        mounted && setDaysRemaining(null);
      }
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
        <p className="text-2xl font-semibold">{daysRemaining} dia{daysRemaining === 1 ? '' : 's'}</p>
      </div>
    </div>
  );
}

const ProfilePage = () => {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        mounted && setIsAdmin(false);
        return;
      }
      const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
      const admin = (roles || []).some(r => r.role === 'admin');
      mounted && setIsAdmin(admin);
    })();
    return () => { /* noop */ };
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
        {isAdmin && (
          <AdminProfileForm />
        )}

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
