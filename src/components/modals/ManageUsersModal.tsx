import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Plus, X } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ManageUsersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planSeats: number;
  users: string[];
  onUsersUpdate: (users: string[]) => void;
}

export function ManageUsersModal({ open, onOpenChange, planSeats, users, onUsersUpdate }: ManageUsersModalProps) {
  const [newUserEmail, setNewUserEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAddUser = async () => {
    if (!newUserEmail.trim()) return;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUserEmail)) {
      toast({
        title: "Email inválido",
        description: "Por favor, insira um email válido.",
        variant: "destructive"
      });
      return;
    }

    // Check if user already exists
    if (users.includes(newUserEmail)) {
      toast({
        title: "Usuário já existe",
        description: "Este usuário já está no plano.",
        variant: "destructive"
      });
      return;
    }

    // Check seat limit
    if (users.length >= planSeats) {
      toast({
        title: "Limite de usuários atingido",
        description: `O plano permite no máximo ${planSeats} usuários.`,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('add-plan-users', {
        body: {
          user_emails: [newUserEmail],
          buyer_email: users[0],
          mondeToken: typeof window !== 'undefined' ? localStorage.getItem('monde_token') : undefined,
        }
      });

      if (error) throw error;

      if (data?.success && data.added_users?.includes(newUserEmail)) {
        const updatedUsers = [...users, newUserEmail];
        onUsersUpdate(updatedUsers);
        setNewUserEmail("");
        toast({
          title: "Usuário adicionado",
          description: `${newUserEmail} foi adicionado ao plano com sucesso.`,
        });
      } else {
        throw new Error("Falha ao adicionar usuário");
      }
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast({
        title: "Erro ao adicionar usuário",
        description: error.message || "Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveUser = (emailToRemove: string) => {
    const updatedUsers = users.filter(email => email !== emailToRemove);
    onUsersUpdate(updatedUsers);
    toast({
      title: "Usuário removido",
      description: `${emailToRemove} foi removido do plano.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Gerenciar usuários do plano</DialogTitle>
          <DialogDescription className="sr-only">Gerencie os usuários vinculados ao seu plano</DialogDescription>
        </DialogHeader>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Usuários do Plano ({users.length}/{planSeats})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add new user */}
            <div className="flex gap-2">
              <Input
                placeholder="email@exemplo.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddUser()}
                disabled={loading || users.length >= planSeats}
              />
              <Button 
                onClick={handleAddUser} 
                disabled={loading || !newUserEmail.trim() || users.length >= planSeats}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {loading ? "Adicionando..." : "Adicionar"}
              </Button>
            </div>

            {users.length >= planSeats && (
              <p className="text-sm text-muted-foreground">
                Limite de usuários atingido para este plano.
              </p>
            )}

            {/* Current users list */}
            <div className="space-y-2">
              {users.map((email, index) => (
                <div key={email} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                      <Users className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{email.split('@')[0].toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground">{email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {index === 0 ? "Comprador" : "Ativo"}
                    </Badge>
                    {index > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveUser(email)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {users.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum usuário no plano</p>
                <p className="text-sm">Adicione usuários usando o campo acima</p>
              </div>
            )}
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
