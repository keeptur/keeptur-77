
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { 
  Zap, 
  Clock, 
  Users, 
  Mail, 
  Settings, 
  Play, 
  Pause, 
  RefreshCw,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Edit,
  Trash2
} from "lucide-react";

interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  template_type: string;
  delay_hours: number;
  active: boolean;
  conditions?: Record<string, any>;
  created_at: string;
}

interface EmailLog {
  id: string;
  user_email: string;
  template_type: string;
  status: 'sent' | 'failed' | 'pending';
  sent_at: string;
  error_message?: string;
}

interface PlanSettings {
  trial_days: number;
  auto_trial: boolean;
  auto_billing: boolean;
}

const AUTOMATION_TRIGGERS = [
  { 
    value: 'user_signup', 
    label: 'Novo usuário cadastrado', 
    description: 'Dispara quando um novo usuário faz login pela primeira vez',
    icon: Users,
    color: 'bg-blue-500'
  },
  { 
    value: 'trial_start', 
    label: 'Início do trial', 
    description: 'Dispara quando o período de trial é iniciado',
    icon: Play,
    color: 'bg-green-500'
  },
  { 
    value: 'trial_ending', 
    label: 'Trial próximo ao fim', 
    description: 'Dispara X dias antes do trial expirar',
    icon: Clock,
    color: 'bg-yellow-500'
  },
  { 
    value: 'trial_expired', 
    label: 'Trial expirado', 
    description: 'Dispara quando o trial expira',
    icon: XCircle,
    color: 'bg-red-500'
  },
  { 
    value: 'subscription_active', 
    label: 'Assinatura ativada', 
    description: 'Dispara quando o usuário assina um plano',
    icon: CheckCircle,
    color: 'bg-emerald-500'
  },
  { 
    value: 'payment_failed', 
    label: 'Falha no pagamento', 
    description: 'Dispara quando há falha na cobrança',
    icon: AlertCircle,
    color: 'bg-orange-500'
  }
];

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

export default function EmailAutomationManager() {
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [planSettings, setPlanSettings] = useState<PlanSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [newRule, setNewRule] = useState({
    name: '',
    trigger: '',
    template_type: '',
    delay_hours: 0,
    active: true,
    conditions: {}
  });
  const [showNewRuleForm, setShowNewRuleForm] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadPlanSettings(),
        loadAutomationRules(),
        loadEmailLogs()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados de automação",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPlanSettings = async () => {
    const { data } = await supabase
      .from('plan_settings')
      .select('trial_days, auto_trial, auto_billing')
      .limit(1)
      .maybeSingle();

    if (data) {
      setPlanSettings(data);
    }
  };

  const loadAutomationRules = async () => {
    const { data } = await supabase
      .from('automation_rules')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setAutomationRules(data);
    }
  };

  const loadEmailLogs = async () => {
    const { data } = await supabase
      .from('email_logs')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(50);

    if (data) {
      setEmailLogs(data);
    }
  };

  const createAutomationRule = async () => {
    if (!newRule.name || !newRule.trigger || !newRule.template_type) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome, trigger e tipo de template",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('automation_rules')
        .insert([{
          name: newRule.name,
          trigger: newRule.trigger,
          template_type: newRule.template_type,
          delay_hours: newRule.delay_hours,
          active: newRule.active,
          conditions: newRule.conditions,
          updated_by: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();

      if (error) throw error;

      setAutomationRules([data, ...automationRules]);
      setNewRule({
        name: '',
        trigger: '',
        template_type: '',
        delay_hours: 0,
        active: true,
        conditions: {}
      });
      setShowNewRuleForm(false);

      toast({
        title: "Sucesso",
        description: "Regra de automação criada com sucesso!"
      });
    } catch (error) {
      console.error('Erro ao criar regra:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar regra de automação",
        variant: "destructive"
      });
    }
  };

  const updateAutomationRule = async () => {
    if (!editingRule) return;

    try {
      const { error } = await supabase
        .from('automation_rules')
        .update({
          name: newRule.name,
          trigger: newRule.trigger,
          template_type: newRule.template_type,
          delay_hours: newRule.delay_hours,
          active: newRule.active,
          conditions: newRule.conditions,
          updated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', editingRule.id);

      if (error) throw error;

      await loadAutomationRules();
      setEditingRule(null);
      setNewRule({
        name: '',
        trigger: '',
        template_type: '',
        delay_hours: 0,
        active: true,
        conditions: {}
      });
      setShowNewRuleForm(false);

      toast({
        title: "Sucesso",
        description: "Regra atualizada com sucesso!"
      });
    } catch (error) {
      console.error('Erro ao atualizar regra:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar regra",
        variant: "destructive"
      });
    }
  };

  const deleteAutomationRule = async (ruleId: string) => {
    try {
      const { error } = await supabase
        .from('automation_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;

      setAutomationRules(rules => rules.filter(rule => rule.id !== ruleId));
      
      toast({
        title: "Sucesso",
        description: "Regra deletada com sucesso!"
      });
    } catch (error) {
      console.error('Erro ao deletar regra:', error);
      toast({
        title: "Erro",
        description: "Erro ao deletar regra",
        variant: "destructive"
      });
    }
  };

  const toggleRuleStatus = async (ruleId: string) => {
    try {
      const rule = automationRules.find(r => r.id === ruleId);
      if (!rule) return;

      const { error } = await supabase
        .from('automation_rules')
        .update({ 
          active: !rule.active,
          updated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', ruleId);

      if (error) throw error;

      setAutomationRules(rules => 
        rules.map(r => 
          r.id === ruleId 
            ? { ...r, active: !r.active }
            : r
        )
      );

      toast({
        title: "Status atualizado",
        description: "Regra de automação atualizada com sucesso!"
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status da regra",
        variant: "destructive"
      });
    }
  };

  const editRule = (rule: AutomationRule) => {
    setEditingRule(rule);
    setNewRule({
      name: rule.name,
      trigger: rule.trigger,
      template_type: rule.template_type,
      delay_hours: rule.delay_hours,
      active: rule.active,
      conditions: rule.conditions || {}
    });
    setShowNewRuleForm(true);
  };

  const testAutomation = async (trigger: string) => {
    try {
      // Buscar um usuário real para teste usando o email correto do subscribers
      const { data: subscriber } = await supabase
        .from('subscribers')
        .select('email, display_name')
        .limit(1)
        .maybeSingle();

      if (!subscriber) {
        toast({
          title: "Aviso",
          description: "Nenhum usuário encontrado para teste",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase.functions.invoke('send-automated-email', {
        body: {
          to_email: subscriber.email,
          template_type: 'welcome', // Template padrão para teste
          variables: {
            nome_usuario: subscriber.display_name || 'Usuário',
            email: subscriber.email,
            nome_sistema: 'Keeptur',
            empresa: subscriber.email.split('@')[1]?.split('.')[0] || '',
            subdominio: subscriber.email.split('@')[1]?.split('.')[0] || '',
            dias_trial: planSettings?.trial_days?.toString() || '14',
            data_vencimento: new Date(Date.now() + (planSettings?.trial_days || 14) * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')
          }
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
          title: "Teste enviado",
          description: `Email de teste enviado para ${subscriber.email}`
        });
        
        // Recarregar logs
        await loadEmailLogs();
      }
    } catch (error: any) {
      console.error('Erro ao testar automação:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar email de teste",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getTriggerConfig = (trigger: string) => {
    return AUTOMATION_TRIGGERS.find(t => t.value === trigger);
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Automação de Emails</h2>
          <p className="text-muted-foreground">
            Configure disparos automáticos baseados em eventos do sistema
          </p>
        </div>
        <Button onClick={() => {
          setEditingRule(null);
          setNewRule({
            name: '',
            trigger: '',
            template_type: '',
            delay_hours: 0,
            active: true,
            conditions: {}
          });
          setShowNewRuleForm(true);
        }}>
          <Zap className="h-4 w-4 mr-2" />
          Nova Regra
        </Button>
      </div>

      {/* Configurações Gerais */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configurações do Trial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Dias de trial:</span>
                <Badge variant="outline">{planSettings?.trial_days || 14} dias</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Auto trial:</span>
                <Badge variant={planSettings?.auto_trial ? "default" : "secondary"}>
                  {planSettings?.auto_trial ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Auto billing:</span>
                <Badge variant={planSettings?.auto_billing ? "default" : "secondary"}>
                  {planSettings?.auto_billing ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Estatísticas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Regras ativas:</span>
                <Badge>{automationRules.filter(r => r.active).length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Emails enviados hoje:</span>
                <Badge variant="outline">{emailLogs.filter(log => 
                  new Date(log.sent_at).toDateString() === new Date().toDateString()
                ).length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Taxa de sucesso:</span>
                <Badge variant="outline">
                  {emailLogs.length > 0 
                    ? Math.round((emailLogs.filter(log => log.status === 'sent').length / emailLogs.length) * 100)
                    : 0}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Ações Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button size="sm" variant="outline" onClick={() => testAutomation('user_signup')} className="w-full">
              Testar Boas-vindas
            </Button>
            <Button size="sm" variant="outline" onClick={() => testAutomation('trial_ending')} className="w-full">
              Testar Trial Ending
            </Button>
            <Button size="sm" variant="outline" onClick={loadData} className="w-full">
              <RefreshCw className="h-3 w-3 mr-2" />
              Atualizar Dados
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Formulário Nova Regra */}
      {showNewRuleForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingRule ? 'Editar Regra' : 'Nova Regra de Automação'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="rule-name">Nome da Regra</Label>
                <Input
                  id="rule-name"
                  value={newRule.name}
                  onChange={(e) => setNewRule({...newRule, name: e.target.value})}
                  placeholder="Ex: Boas-vindas para novos usuários"
                />
              </div>

              <div>
                <Label htmlFor="rule-trigger">Trigger</Label>
                <Select value={newRule.trigger} onValueChange={(value) => setNewRule({...newRule, trigger: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o evento" />
                  </SelectTrigger>
                  <SelectContent>
                    {AUTOMATION_TRIGGERS.map(trigger => (
                      <SelectItem key={trigger.value} value={trigger.value}>
                        {trigger.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="rule-template">Template de Email</Label>
                <Select value={newRule.template_type} onValueChange={(value) => setNewRule({...newRule, template_type: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o template" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMAIL_TEMPLATE_TYPES.map(template => (
                      <SelectItem key={template.value} value={template.value}>
                        {template.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="rule-delay">Delay (horas)</Label>
                <Input
                  id="rule-delay"
                  type="number"
                  value={newRule.delay_hours}
                  onChange={(e) => setNewRule({...newRule, delay_hours: parseInt(e.target.value) || 0})}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              {editingRule ? (
                <Button onClick={updateAutomationRule}>
                  Atualizar Regra
                </Button>
              ) : (
                <Button onClick={createAutomationRule}>
                  Criar Regra
                </Button>
              )}
              <Button variant="outline" onClick={() => {
                setShowNewRuleForm(false);
                setEditingRule(null);
              }}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Regras Existentes */}
      <Card>
        <CardHeader>
          <CardTitle>Regras de Automação ({automationRules.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {automationRules.length > 0 ? (
            <div className="space-y-4">
              {automationRules.map((rule) => {
                const triggerConfig = getTriggerConfig(rule.trigger);
                const TriggerIcon = triggerConfig?.icon || Zap;
                
                return (
                  <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${triggerConfig?.color || 'bg-gray-500'}`}>
                        <TriggerIcon className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h3 className="font-medium">{rule.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {triggerConfig?.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {EMAIL_TEMPLATE_TYPES.find(t => t.value === rule.template_type)?.label}
                          </Badge>
                          {rule.delay_hours > 0 && (
                            <Badge variant="outline" className="text-xs">
                              Delay: {rule.delay_hours}h
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.active}
                        onCheckedChange={() => toggleRuleStatus(rule.id)}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => editRule(rule)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testAutomation(rule.trigger)}
                      >
                        Testar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteAutomationRule(rule.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma regra configurada</h3>
              <p className="text-muted-foreground mb-4">
                Configure regras de automação para enviar emails baseados em eventos do sistema
              </p>
              <Button onClick={() => setShowNewRuleForm(true)}>
                Criar Primeira Regra
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs de Email */}
      <Card>
        <CardHeader>
          <CardTitle>Logs de Emails Enviados ({emailLogs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Enviado em</TableHead>
                <TableHead>Erro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emailLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{log.user_email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {EMAIL_TEMPLATE_TYPES.find(t => t.value === log.template_type)?.label || log.template_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(log.status)}`} />
                      {log.status}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(log.sent_at).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    {log.error_message && (
                      <span className="text-red-500 text-xs">{log.error_message}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
