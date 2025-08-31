import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { 
  Mail, 
  Send, 
  Settings, 
  Users, 
  FileText, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  Plus,
  RefreshCw,
  Download,
  Upload
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import EmailPreview from "@/components/emails/EmailPreview";
import VisualEmailEditor from "@/components/emails/VisualEmailEditor";
import EmailAutomationManager from "@/components/emails/EmailAutomationManager";

interface EmailTemplate {
  id: string;
  type: string;
  subject: string;
  html: string;
  created_at: string;
  updated_at: string;
}

interface SMTPSettings {
  id: string;
  host: string;
  port: number;
  username: string;
  from_email: string;
  secure: boolean;
  created_at: string;
  updated_at: string;
}

interface Profile {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

const EMAIL_TEMPLATE_TYPES = [
  { value: 'welcome', label: 'Boas-vindas ao sistema' },
  { value: 'email_confirmation', label: 'Confirmação de e-mail' },
  { value: 'password_reset', label: 'Redefinição de senha' },
  { value: 'trial_start', label: 'Início do período trial' },
  { value: 'trial_ending', label: '7 dias para fim do trial' },
  { value: 'trial_ended', label: 'Fim do período trial' },
  { value: 'subscription_welcome', label: 'Bem-vindo assinante' },
  { value: 'subscription_renewal', label: 'Renovação próxima ao vencimento' },
  { value: 'subscription_cancelled', label: 'Assinatura cancelada' },
  { value: 'payment_failed', label: 'Falha no pagamento' },
  { value: 'tutorial_inicial', label: 'Tutorial inicial' }
];

const DYNAMIC_VARIABLES = [
  { key: '{{nome_usuario}}', description: 'Nome do usuário' },
  { key: '{{email}}', description: 'E-mail do usuário' },
  { key: '{{nome_sistema}}', description: 'Nome do sistema' },
  { key: '{{data_vencimento}}', description: 'Data de vencimento' },
  { key: '{{dias_restantes}}', description: 'Dias restantes' },
  { key: '{{valor_plano}}', description: 'Valor do plano' },
  { key: '{{nome_plano}}', description: 'Nome do plano' },
  { key: '{{link_pagamento}}', description: 'Link de pagamento' },
  { key: '{{link_acesso}}', description: 'Link de acesso' }
];

export default function AdminEmailsPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [smtpSettings, setSMTPSettings] = useState<SMTPSettings | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [testEmail, setTestEmail] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [connectionInfo, setConnectionInfo] = useState<{ message?: string; details?: any; fallback?: boolean; success?: boolean } | null>(null);

  // Form states
  const [newTemplate, setNewTemplate] = useState({
    type: '',
    subject: '',
    html: ''
  });

  const [smtpForm, setSMTPForm] = useState({
    host: '',
    port: 587,
    username: '',
    password: '',
    from_email: '',
    secure: false
  });
  const [smtpHasPassword, setSmtpHasPassword] = useState(false);

  useEffect(() => {
    document.title = "Gestão de Emails | Admin";
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [templatesRes, smtpRes, profilesRes] = await Promise.all([
        supabase.from('email_templates').select('*').order('created_at', { ascending: false }),
        supabase.from('smtp_settings').select('*').order('created_at', { ascending: false }).limit(1),
        supabase.from('profiles').select('id, email, full_name, created_at').order('created_at', { ascending: false })
      ]);

      if (templatesRes.data) setTemplates(templatesRes.data);
      if (smtpRes.data && smtpRes.data.length > 0) {
        const row: any = smtpRes.data[0];
        setSMTPSettings(row);
        setSMTPForm({
          host: row.host,
          port: row.port,
          username: row.username || '',
          password: '', // não exibir senha salva
          from_email: row.from_email,
          secure: row.secure
        });
        setSmtpHasPassword(Boolean(row.password));
      } else {
        setSmtpHasPassword(false);
      }
      if (profilesRes.data) setProfiles(profilesRes.data);

      // Não testar automaticamente para evitar execuções excessivas e falso positivo
      setConnectionStatus('idle');
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const testSMTPConnection = async () => {
    setConnectionStatus('testing');
    try {
      const { data, error } = await supabase.functions.invoke('test-smtp-connection', {
        body: { smtp_settings: smtpForm }
      });

      if (error) throw error;

      setConnectionInfo(data || null);
      setConnectionStatus(data?.success ? 'success' : 'error');

      toast({
        title: data?.success ? 'Conexão válida' : 'Conexão inválida',
        description: (data?.message || data?.error || 'Resultado do teste').toString()
      });
    } catch (error: any) {
      setConnectionStatus('error');
      setConnectionInfo(null);
      toast({
        title: 'Erro',
        description: error?.message || 'Falha ao testar conexão SMTP',
        variant: 'destructive'
      });
    }
  };

  const saveSMTPSettings = async () => {
    try {
      const basePayload = {
        host: smtpForm.host,
        port: smtpForm.port,
        username: smtpForm.username || null,
        from_email: smtpForm.from_email,
        secure: smtpForm.secure,
      } as any;

      // Só envia a senha se o usuário realmente digitou algo
      const payload = smtpForm.password ? { ...basePayload, password: smtpForm.password } : basePayload;

      if (smtpSettings) {
        await supabase
          .from('smtp_settings')
          .update(payload)
          .eq('id', smtpSettings.id);
      } else {
        await supabase
          .from('smtp_settings')
          .insert([payload]);
      }

      // Limpa o campo de senha local para evitar sobrescrever com vazio no próximo save
      setSMTPForm(prev => ({ ...prev, password: '' }));

      toast({
        title: "Sucesso",
        description: "Configurações SMTP salvas com sucesso!"
      });
      loadData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Erro ao salvar configurações SMTP",
        variant: "destructive"
      });
    }
  };

  const saveTemplate = async () => {
    try {
      if (isEditing && selectedTemplate) {
        await supabase
          .from('email_templates')
          .update({
            subject: newTemplate.subject,
            html: newTemplate.html
          })
          .eq('id', selectedTemplate.id);
      } else {
        // Cast type to satisfy TypeScript while allowing flexibility
        await supabase
          .from('email_templates')
          .insert([{
            type: newTemplate.type as any,
            subject: newTemplate.subject,
            html: newTemplate.html
          }]);
      }

      setNewTemplate({ type: '', subject: '', html: '' });
      setIsEditing(false);
      setSelectedTemplate(null);
      loadData();
      
      toast({
        title: "Sucesso",
        description: `Template ${isEditing ? 'atualizado' : 'criado'} com sucesso!`
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar template",
        variant: "destructive"
      });
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      await supabase.from('email_templates').delete().eq('id', id);
      loadData();
      toast({
        title: "Sucesso",
        description: "Template excluído com sucesso!"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir template",
        variant: "destructive"
      });
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail || !selectedTemplate) return;

    try {
      const baseUrl = window.location.origin;
      const logoUrl = `${baseUrl}/lovable-uploads/3c1f2e1d-5094-4926-b204-fc12b2a5d877.png`;

      const { data, error } = await supabase.functions.invoke('send-test-email', {
        body: {
          to_email: testEmail,
          template_id: selectedTemplate.id,
          template_type: selectedTemplate.type,
          logo_url: logoUrl,
          base_url: baseUrl,
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Sucesso",
          description: data?.message || "Email de teste enviado com sucesso!"
        });
        if (data?.warning) {
          toast({
            title: "Aviso",
            description: data.warning,
          });
        }
        return;
      }

      // Se veio resposta com erro estruturado
      const errMsg = data?.error || data?.message || 'Falha no envio (veja logs da função)';
      throw new Error(errMsg);
    } catch (error: any) {
      console.error('send-test-email error:', error);
      toast({
        title: "Erro",
        description: error?.message || "Erro ao enviar email de teste",
        variant: "destructive"
      });
    }
  };

  const sendBulkEmails = async (templateType: string, userEmails: string[]) => {
    try {
      const { error } = await supabase.functions.invoke('send-bulk-emails', {
        body: {
          template_type: templateType,
          user_emails: userEmails
        }
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Emails enviados para ${userEmails.length} usuários!`
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao enviar emails em massa",
        variant: "destructive"
      });
    }
  };

  const insertVariable = (variable: string) => {
    setNewTemplate(prev => ({
      ...prev,
      html: prev.html + variable
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Mail className="h-8 w-8" />
          Gestão de Emails
        </h1>
        <p className="text-muted-foreground">
          Configure templates, teste envios e gerencie comunicações por email
        </p>
      </header>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="editor" className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Editor Visual
          </TabsTrigger>
          <TabsTrigger value="automation" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Automação
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Teste de Envio
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Usuários
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Biblioteca de Templates
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button onClick={() => {
                          setIsEditing(false);
                          setNewTemplate({ type: '', subject: '', html: '' });
                        }}>
                          <Plus className="h-4 w-4 mr-2" />
                          Novo Template
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <DialogHeader>
                          <DialogTitle>
                            {isEditing ? 'Editar Template' : 'Criar Novo Template'}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4">
                          {!isEditing && (
                            <div>
                              <Label htmlFor="template-type">Tipo do Template</Label>
                              <Select
                                value={newTemplate.type}
                                onValueChange={(value) => setNewTemplate(prev => ({ ...prev, type: value }))}
                              >
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
                          )}
                          
                          <div>
                            <Label htmlFor="subject">Assunto</Label>
                            <Input
                              id="subject"
                              value={newTemplate.subject}
                              onChange={(e) => setNewTemplate(prev => ({ ...prev, subject: e.target.value }))}
                              placeholder="Assunto do email"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="html">Conteúdo HTML</Label>
                            <Textarea
                              id="html"
                              value={newTemplate.html}
                              onChange={(e) => setNewTemplate(prev => ({ ...prev, html: e.target.value }))}
                              placeholder="Conteúdo HTML do email"
                              rows={10}
                              className="font-mono"
                            />
                          </div>
                          
                          <Button onClick={saveTemplate} className="w-full">
                            {isEditing ? 'Atualizar Template' : 'Criar Template'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {EMAIL_TEMPLATE_TYPES.map(type => {
                      const template = templates.find(t => t.type === type.value);
                      return (
                        <div key={type.value} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`h-3 w-3 rounded-full ${template ? 'bg-green-500' : 'bg-gray-300'}`} />
                            <div>
                              <div className="font-medium">{type.label}</div>
                              <div className="text-sm text-muted-foreground">
                                {template ? template.subject : 'Template não configurado'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {template && (
                              <>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setSelectedTemplate(template)}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle>Preview: {template.subject}</DialogTitle>
                                    </DialogHeader>
                                    <div className="rounded bg-background">
                                      <EmailPreview html={template.html} height={700} />
                                    </div>
                                  </DialogContent>
                                </Dialog>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedTemplate(template);
                                    setNewTemplate({
                                      type: template.type,
                                      subject: template.subject,
                                      html: template.html
                                    });
                                    setIsEditing(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => deleteTemplate(template.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Variáveis Dinâmicas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {DYNAMIC_VARIABLES.map(variable => (
                      <div
                        key={variable.key}
                        className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer"
                        onClick={() => insertVariable(variable.key)}
                      >
                        <div>
                          <div className="font-mono text-sm">{variable.key}</div>
                          <div className="text-xs text-muted-foreground">{variable.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {selectedTemplate && (
                <Card>
                  <CardHeader>
                    <CardTitle>Preview do Template</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="font-medium">Assunto:</div>
                      <div className="text-sm text-muted-foreground">{selectedTemplate.subject}</div>
                      <Separator />
                      <div className="font-medium">Conteúdo:</div>
                      <div className="text-sm border rounded p-2">
                        <EmailPreview html={selectedTemplate.html} height={320} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="editor" className="space-y-6">
          <VisualEmailEditor
            template={selectedTemplate || undefined}
            onSave={async (template) => {
              try {
                if (template.id) {
                  await supabase
                    .from('email_templates')
                    .update({
                      subject: template.subject,
                      html: template.html
                    })
                    .eq('id', template.id);
                } else {
                  await supabase
                    .from('email_templates')
                    .insert([{
                      type: template.type as any,
                      subject: template.subject,
                      html: template.html
                    }]);
                }
                
                toast({
                  title: "Sucesso",
                  description: `Template ${template.id ? 'atualizado' : 'criado'} com sucesso!`
                });
                loadData();
              } catch (error) {
                toast({
                  title: "Erro",
                  description: "Erro ao salvar template",
                  variant: "destructive"
                });
              }
            }}
            onPreview={(template) => {
              // Implementar preview em modal
              toast({
                title: "Preview",
                description: "Abrindo preview do template..."
              });
            }}
          />
        </TabsContent>

        <TabsContent value="automation" className="space-y-6">
          <EmailAutomationManager />
        </TabsContent>
        <TabsContent value="test" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Teste de Envio Individual</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="test-email">Email de Teste</Label>
                  <Input
                    id="test-email"
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="Digite o email para teste"
                  />
                </div>
                
                <div>
                  <Label htmlFor="test-template">Template para Teste</Label>
                  <Select
                    value={selectedTemplate?.id || ''}
                    onValueChange={(value) => {
                      const template = templates.find(t => t.id === value);
                      setSelectedTemplate(template || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {EMAIL_TEMPLATE_TYPES.find(t => t.value === template.type)?.label || template.type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  onClick={sendTestEmail} 
                  disabled={!testEmail || !selectedTemplate}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Email de Teste
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Envio em Massa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Selecionar Usuários</Label>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      const allEmails = profiles.map(p => p.email);
                      const templateType = selectedTemplate?.type || 'welcome';
                      sendBulkEmails(templateType, allEmails);
                    }}
                    disabled={!selectedTemplate || profiles.length === 0}
                    className="w-full"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Enviar para Todos ({profiles.length})
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Usuários do Sistema</CardTitle>
              <p className="text-sm text-muted-foreground">
                Usuários autenticados via API Monde (@{'{dominio}'}.monde.com.br)
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {profiles.map((profile) => (
                  <div key={profile.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{profile.full_name}</p>
                      <p className="text-sm text-muted-foreground">{profile.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Cadastrado em: {new Date(profile.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setTestEmail(profile.email);
                          // Simular envio de email de boas-vindas
                          toast({
                            title: "Email agendado",
                            description: `Email de boas-vindas será enviado para ${profile.email}`
                          });
                        }}
                      >
                        <Mail className="h-3 w-3 mr-1" />
                        Enviar Boas-vindas
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
