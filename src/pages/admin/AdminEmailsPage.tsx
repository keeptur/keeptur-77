
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { 
  Mail, 
  Send, 
  Settings, 
  Eye, 
  Edit, 
  Trash2, 
  Plus,
  RefreshCw,
  Users,
  Zap
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import VisualEmailEditor from "@/components/emails/VisualEmailEditor";
import EmailAutomationManager from "@/components/emails/EmailAutomationManager";
import { useRealTimeData } from "@/components/emails/RealTimeDataManager";

const EMAIL_TEMPLATE_TYPES = [
  { value: 'welcome', label: 'Boas-vindas ao sistema' },
  { value: 'trial_start', label: 'Início do período trial' },
  { value: 'trial_ending', label: '7 dias para fim do trial' },
  { value: 'trial_ended', label: 'Fim do período trial' },
  { value: 'subscription_welcome', label: 'Bem-vindo assinante' },
  { value: 'subscription_renewal', label: 'Renovação próxima ao vencimento' },
  { value: 'payment_failed', label: 'Falha no pagamento' },
  { value: 'tutorial_inicial', label: 'Tutorial inicial' }
];

export default function AdminEmailsPage() {
  const [newTemplate, setNewTemplate] = useState({
    type: '',
    subject: '',
    html: ''
  });
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [showVisualEditor, setShowVisualEditor] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testTemplate, setTestTemplate] = useState('');
  const [loading, setLoading] = useState(false);

  const queryClient = useQueryClient();
  const { users, getRealTimeVariables } = useRealTimeData();

  // Carregar templates
  const { data: templates = [], refetch: refetchTemplates } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const { data } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });
      return data || [];
    }
  });

  // Carregar configurações SMTP
  const { data: smtpSettings, refetch: refetchSmtp } = useQuery({
    queryKey: ['smtp-settings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('smtp_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    }
  });

  const createTemplate = async () => {
    if (!newTemplate.type || !newTemplate.subject || !newTemplate.html) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos do template",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('email_templates')
        .upsert([{
          type: newTemplate.type as any,
          subject: newTemplate.subject,
          html: newTemplate.html,
          updated_by: (await supabase.auth.getUser()).data.user?.id
        }], { 
          onConflict: 'type'
        });

      if (error) throw error;

      setNewTemplate({ type: '', subject: '', html: '' });
      refetchTemplates();
      
      toast({
        title: "Sucesso",
        description: "Template salvo com sucesso!"
      });
    } catch (error: any) {
      console.error('Erro ao salvar template:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar template",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      refetchTemplates();
      toast({
        title: "Sucesso",
        description: "Template deletado com sucesso!"
      });
    } catch (error: any) {
      console.error('Erro ao deletar template:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao deletar template",
        variant: "destructive"
      });
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail || !testTemplate) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione um template e digite um email",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      // Buscar um usuário real para variáveis de teste
      const sampleUser = users.length > 0 ? users[0] : null;
      const variables = sampleUser ? getRealTimeVariables(sampleUser) : {
        nome_usuario: 'Usuário Teste',
        email: testEmail,
        nome_sistema: 'Keeptur',
        empresa: 'Empresa Teste',
        subdominio: 'teste',
        dias_trial: '14',
        data_vencimento: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')
      };

      const { error } = await supabase.functions.invoke('send-automated-email', {
        body: {
          to_email: testEmail,
          template_type: testTemplate,
          variables
        }
      });

      if (error) {
        console.error('Erro no teste:', error);
        toast({
          title: "Erro no teste",
          description: error.message || "Erro desconhecido",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Email enviado",
          description: `Email de teste enviado para ${testEmail}`
        });
      }
    } catch (error: any) {
      console.error('Erro ao enviar teste:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar email de teste",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const editTemplate = (template: any) => {
    setEditingTemplate(template);
    setShowVisualEditor(true);
  };

  const saveEditedTemplate = async (template: any) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({
          subject: template.subject,
          html: template.html,
          updated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', template.id);

      if (error) throw error;

      setShowVisualEditor(false);
      setEditingTemplate(null);
      refetchTemplates();
      
      toast({
        title: "Sucesso",
        description: "Template atualizado com sucesso!"
      });
    } catch (error: any) {
      console.error('Erro ao atualizar template:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar template",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Emails</h1>
          <p className="text-muted-foreground">
            Configure templates, automações e envie emails para usuários
          </p>
        </div>
        <Button onClick={() => queryClient.invalidateQueries()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="automation" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Automação
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Teste
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Usuários ({users.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          {/* Novo Template */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Novo Template de Email
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="template-type">Tipo do Template</Label>
                  <Select value={newTemplate.type} onValueChange={(value) => setNewTemplate({...newTemplate, type: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {EMAIL_TEMPLATE_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="template-subject">Assunto</Label>
                  <Input
                    id="template-subject"
                    value={newTemplate.subject}
                    onChange={(e) => setNewTemplate({...newTemplate, subject: e.target.value})}
                    placeholder="Digite o assunto do email..."
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="template-html">Conteúdo HTML</Label>
                <Textarea
                  id="template-html"
                  value={newTemplate.html}
                  onChange={(e) => setNewTemplate({...newTemplate, html: e.target.value})}
                  placeholder="Cole o HTML do template aqui..."
                  className="h-32"
                />
              </div>
              <Button onClick={createTemplate} disabled={loading}>
                {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Salvar Template
              </Button>
            </CardContent>
          </Card>

          {/* Lista de Templates */}
          <Card>
            <CardHeader>
              <CardTitle>Templates Existentes ({templates.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Assunto</TableHead>
                    <TableHead>Atualizado</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {EMAIL_TEMPLATE_TYPES.find(t => t.value === template.type)?.label || template.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{template.subject}</TableCell>
                      <TableCell>
                        {new Date(template.updated_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => editTemplate(template)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteTemplate(template.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation">
          <EmailAutomationManager />
        </TabsContent>

        <TabsContent value="test" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Enviar Email de Teste</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="test-email">Email de Destino</Label>
                  <Input
                    id="test-email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="Digite o email para teste..."
                  />
                </div>
                <div>
                  <Label htmlFor="test-template">Template</Label>
                  <Select value={testTemplate} onValueChange={setTestTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(template => (
                        <SelectItem key={template.id} value={template.type}>
                          {EMAIL_TEMPLATE_TYPES.find(t => t.value === template.type)?.label || template.type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={sendTestEmail} disabled={loading}>
                {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Enviar Email de Teste
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Usuários do Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Trial</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.empresa}</TableCell>
                      <TableCell>
                        <Badge variant={user.subscription_status === 'active' ? 'default' : 'secondary'}>
                          {user.subscription_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.trial_end ? new Date(user.trial_end).toLocaleDateString('pt-BR') : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Editor Visual Modal */}
      {showVisualEditor && editingTemplate && (
        <VisualEmailEditor
          template={editingTemplate}
          onSave={saveEditedTemplate}
          onClose={() => {
            setShowVisualEditor(false);
            setEditingTemplate(null);
          }}
        />
      )}
    </div>
  );
}
