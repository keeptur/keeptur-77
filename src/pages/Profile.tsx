import React, { useMemo } from 'react';
import { UserProfile } from "@/components/shared/UserProfile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "lucide-react";

const DEFAULT_TRIAL_DAYS = 7;

function TrialInfo() {
  const daysRemaining = useMemo(() => {
    const startIso = localStorage.getItem("keeptur:trial-start");
    const start = startIso ? new Date(startIso) : new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + DEFAULT_TRIAL_DAYS);
    const diffMs = end.getTime() - Date.now();
    const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    return days;
  }, []);

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
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-2 mb-6">
        <User className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Meu Perfil</h1>
      </div>

      <div className="grid gap-6">
        {/* Perfil do usuário logado */}
        <UserProfile showFullProfile={true} />
        
        {/* Trial info */}
        <Card>
          <CardHeader>
            <CardTitle>Status do Trial</CardTitle>
            <CardDescription>Informações sobre seu período de avaliação</CardDescription>
          </CardHeader>
          <CardContent>
            <TrialInfo />
          </CardContent>
        </Card>
        
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