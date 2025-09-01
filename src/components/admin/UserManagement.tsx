import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, UserPlus, Trash2, Crown, Calendar, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { InputValidation } from "@/utils/inputValidation";

interface ActiveUser {
  id: string;
  email: string;
  display_name?: string;
  subscription_tier?: string;
  subscription_end?: string;
  last_login_at?: string;
  source?: string;
  created_at: string;
}

interface AccountInfo {
  total_seats: number;
  used_seats: number;
  subscription_tier?: string;
  subscription_end?: string;
  stripe_customer_id?: string;
}

export function UserManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState<ActiveUser[]>([]);
  const [accountInfo, setAccountInfo] = useState<AccountInfo>({ total_seats: 0, used_seats: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "" });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load active subscribers
      const { data: subscribers, error: subscribersError } = await supabase
        .from("subscribers")
        .select("*")
        .eq("subscribed", true)
        .order("created_at", { ascending: false });

      if (subscribersError) throw subscribersError;

      setUsers(subscribers || []);

      // Calculate account info
      const totalSeats = subscribers?.length ? 
        Math.max(...subscribers.map(s => parseInt(s.subscription_tier?.match(/\d+/)?.[0] || "1"))) : 0;
      
      setAccountInfo({
        total_seats: totalSeats,
        used_seats: subscribers?.length || 0,
        subscription_tier: subscribers?.[0]?.subscription_tier,
        subscription_end: subscribers?.[0]?.subscription_end,
        stripe_customer_id: subscribers?.[0]?.stripe_customer_id
      });

    } catch (error) {
      console.error('Error loading user data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados dos usuários",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.name) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    // Validate email format
    const emailValidation = InputValidation.validateEmail(newUser.email);
    if (!emailValidation.isValid) {
      toast({
        title: "Erro de validação",
        description: emailValidation.error,
        variant: "destructive",
      });
      return;
    }

    // Sanitize inputs
    const sanitizedName = InputValidation.sanitizeText(newUser.name, { maxLength: 100 });
    const sanitizedEmail = InputValidation.sanitizeText(newUser.email, { maxLength: 254 });

    // Check for suspicious patterns
    if (InputValidation.checkSQLInjection(sanitizedName) || 
        InputValidation.checkSQLInjection(sanitizedEmail)) {
      toast({
        title: "Erro de segurança",
        description: "Dados contêm caracteres não permitidos",
        variant: "destructive",
      });
      return;
    }

    if (accountInfo.used_seats >= accountInfo.total_seats) {
      toast({
        title: "Limite Atingido",
        description: "Você atingiu o limite de usuários do seu plano. Faça upgrade para adicionar mais usuários.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("subscribers")
        .insert({
          email: sanitizedEmail,
          display_name: sanitizedName,
          subscribed: true,
          subscription_tier: accountInfo.subscription_tier,
          subscription_end: accountInfo.subscription_end,
          source: "admin_added"
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Usuário adicionado com sucesso",
      });

      setNewUser({ name: "", email: "" });
      setShowAddModal(false);
      loadData();
    } catch (error) {
      console.error('Error adding user:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar usuário",
        variant: "destructive",
      });
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (users.length <= 1) {
      toast({
        title: "Erro",
        description: "Não é possível remover o último usuário ativo",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("subscribers")
        .update({ subscribed: false })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Usuário removido com sucesso",
      });

      loadData();
    } catch (error) {
      console.error('Error removing user:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover usuário",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (user: ActiveUser) => {
    if (!user.subscription_end) return <Badge variant="secondary">Ativo</Badge>;
    
    const now = new Date();
    const endDate = new Date(user.subscription_end);
    
    if (endDate > now) {
      return <Badge variant="default">Ativo</Badge>;
    } else {
      return <Badge variant="destructive">Expirado</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Carregando usuários...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Account Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Crown className="w-5 h-5" />
            <span>Resumo da Conta</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{accountInfo.used_seats}</div>
              <div className="text-sm text-muted-foreground">Usuários Ativos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{accountInfo.total_seats}</div>
              <div className="text-sm text-muted-foreground">Limite do Plano</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{accountInfo.subscription_tier || "N/A"}</div>
              <div className="text-sm text-muted-foreground">Plano Atual</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{formatDate(accountInfo.subscription_end)}</div>
              <div className="text-sm text-muted-foreground">Renovação</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Usuários Ativos</span>
            </CardTitle>
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
              <DialogTrigger asChild>
                <Button disabled={accountInfo.used_seats >= accountInfo.total_seats}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Adicionar Usuário
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Usuário</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input
                      id="name"
                      placeholder="Nome do usuário"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="usuario@empresa.com"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <Button variant="outline" onClick={() => setShowAddModal(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleAddUser}>
                      Adicionar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="flex items-center space-x-2 mb-4">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuários..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {/* Users Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último Login</TableHead>
                <TableHead>Adicionado em</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.display_name || "N/A"}</div>
                      {user.source === "admin_added" && (
                        <Badge variant="outline" className="mt-1">Adicionado pelo Admin</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{getStatusBadge(user)}</TableCell>
                  <TableCell>{formatDate(user.last_login_at)}</TableCell>
                  <TableCell>{formatDate(user.created_at)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveUser(user.id)}
                      disabled={users.length <= 1}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "Nenhum usuário encontrado" : "Nenhum usuário ativo"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}