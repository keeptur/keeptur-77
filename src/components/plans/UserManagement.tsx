import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, X, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { api } from "@/lib/api";

interface CompanyUser {
  id: string;
  name: string;
  email: string;
  monde_email: string;
  active: boolean;
}

interface UserManagementProps {
  planSeats: number;
  currentUsers: string[];
  onUsersUpdate: (users: string[]) => void;
}

export function UserManagement({ planSeats, currentUsers, onUsersUpdate }: UserManagementProps) {
  const { toast } = useToast();
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [assignedUsers, setAssignedUsers] = useState<string[]>(currentUsers);

  useEffect(() => {
    loadCompanyUsers();
  }, []);

  const loadCompanyUsers = async () => {
    try {
      setLoading(true);
      
      // Obter usuários da mesma empresa via API do Monde
      const currentUser = await api.getCurrentUser();
      if (!currentUser?.data?.attributes?.company_id) {
        throw new Error("Empresa não identificada");
      }

      // Simular busca de usuários da mesma empresa (sem API específica disponível)
      // Por enquanto, retornamos lista vazia - implementação deve usar API real do Monde
      const users: CompanyUser[] = [];
      
      // TODO: Implementar busca real via API do Monde quando disponível
      // const companyUsersResponse = await api.getCompanyUsers(currentUser.data.attributes.company_id);
      // const users: CompanyUser[] = companyUsersResponse.data.map((user: any) => ({
      //   id: user.id,
      //   name: user.attributes.name || user.attributes.login,
      //   email: user.attributes.email,
      //   monde_email: `${user.attributes.login}@${user.attributes.company?.domain || 'empresa'}.monde.com.br`,
      //   active: assignedUsers.includes(`${user.attributes.login}@${user.attributes.company?.domain || 'empresa'}.monde.com.br`)
      // }));

      setCompanyUsers(users);
    } catch (error: any) {
      console.error('Error loading company users:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os usuários da empresa",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = () => {
    if (!newUserEmail.trim()) return;
    
    // Validar se é um email válido do domínio .monde.com.br
    if (!newUserEmail.endsWith('.monde.com.br')) {
      toast({
        title: "Email inválido",
        description: "Use apenas emails do domínio .monde.com.br",
        variant: "destructive",
      });
      return;
    }

    // Verificar se já não está na lista
    if (assignedUsers.includes(newUserEmail)) {
      toast({
        title: "Usuário já adicionado",
        description: "Este usuário já está na lista",
        variant: "destructive",
      });
      return;
    }

    // Verificar limite de assentos
    if (assignedUsers.length >= planSeats) {
      toast({
        title: "Limite excedido",
        description: `Seu plano permite apenas ${planSeats} usuários`,
        variant: "destructive",
      });
      return;
    }

    const updatedUsers = [...assignedUsers, newUserEmail];
    setAssignedUsers(updatedUsers);
    onUsersUpdate(updatedUsers);
    setNewUserEmail("");
    
    toast({
      title: "Usuário adicionado",
      description: "Usuário adicionado ao plano com sucesso",
    });
  };

  const handleRemoveUser = (userEmail: string) => {
    const updatedUsers = assignedUsers.filter(email => email !== userEmail);
    setAssignedUsers(updatedUsers);
    onUsersUpdate(updatedUsers);
    
    toast({
      title: "Usuário removido",
      description: "Usuário removido do plano",
    });
  };

  const handleToggleUser = (user: CompanyUser) => {
    if (assignedUsers.includes(user.monde_email)) {
      handleRemoveUser(user.monde_email);
    } else {
      if (assignedUsers.length >= planSeats) {
        toast({
          title: "Limite excedido",
          description: `Seu plano permite apenas ${planSeats} usuários`,
          variant: "destructive",
        });
        return;
      }
      
      const updatedUsers = [...assignedUsers, user.monde_email];
      setAssignedUsers(updatedUsers);
      onUsersUpdate(updatedUsers);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Gerenciar Usuários do Plano
        </CardTitle>
        <CardDescription>
          {assignedUsers.length} / {planSeats} usuários ativos | {planSeats - assignedUsers.length} disponíveis para associar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Adicionar novo usuário */}
        <div className="space-y-3">
          <h4 className="font-medium">Adicionar Usuário</h4>
          <div className="flex gap-2">
            <Input
              placeholder="usuario@empresa.monde.com.br"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddUser()}
            />
            <Button 
              onClick={handleAddUser}
              disabled={assignedUsers.length >= planSeats}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Usuários da empresa */}
        {!loading && companyUsers.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Usuários da Empresa</h4>
            <div className="grid gap-2">
              {companyUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-muted-foreground">{user.monde_email}</div>
                    </div>
                  </div>
                  <Button
                    variant={assignedUsers.includes(user.monde_email) ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => handleToggleUser(user)}
                    disabled={!assignedUsers.includes(user.monde_email) && assignedUsers.length >= planSeats}
                  >
                    {assignedUsers.includes(user.monde_email) ? "Remover" : "Adicionar"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Usuários ativos */}
        {assignedUsers.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Usuários Ativos no Plano</h4>
            <div className="space-y-2">
              {assignedUsers.map((userEmail) => (
                <div
                  key={userEmail}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Ativo</Badge>
                    <span className="text-sm">{userEmail}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveUser(userEmail)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-4">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
            <p className="mt-2 text-sm text-muted-foreground">Carregando usuários...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}