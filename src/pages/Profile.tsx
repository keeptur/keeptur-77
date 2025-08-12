import React from 'react';
import { UserProfile } from "@/components/shared/UserProfile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "lucide-react";

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