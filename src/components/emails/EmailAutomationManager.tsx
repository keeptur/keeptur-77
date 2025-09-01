import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Plus, Edit, Trash2 } from "lucide-react";

interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  template_type: string;
  delay_hours: number;
  conditions: Record<string, any>;
  active: boolean;
  created_at: string;
}

export const EmailAutomationManager = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);

  // Fetch automation rules
  const { data: rules, isLoading, refetch } = useQuery({
    queryKey: ['automation-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AutomationRule[];
    },
  });

  // Fetch email templates dinamicamente
  const { data: emailTemplates } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('type, subject')
        .order('type');

      if (error) throw error;
      return data;
    },
  });

  const createRule = async (ruleData: { name: string; trigger: string; template_type: string; delay_hours: number; conditions: Record<string, any>; active: boolean }) => {
    try {
      const { data, error } = await supabase
        .from('automation_rules')
        .insert([ruleData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Regra criada",
        description: "Nova regra de automação foi criada com sucesso",
      });

      refetch();
      setIsCreating(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateRule = async (id: string, ruleData: { name: string; trigger: string; template_type: string; delay_hours: number; conditions: Record<string, any>; active: boolean }) => {
    try {
      const { error } = await supabase
        .from('automation_rules')
        .update(ruleData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Regra atualizada",
        description: "Regra de automação foi atualizada com sucesso",
      });

      refetch();
      setEditingRule(null);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteRule = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta regra de automação?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('automation_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Regra excluída",
        description: "Regra de automação foi excluída com sucesso",
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleRule = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('automation_rules')
        .update({ active })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: active ? "Regra ativada" : "Regra desativada",
        description: `A regra foi ${active ? 'ativada' : 'desativada'} com sucesso`,
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const triggers = [
    { value: 'user_signup', label: 'Usuário se cadastrou', description: 'Quando um novo usuário cria conta no sistema' },
    { value: 'trial_start', label: 'Início do período trial', description: 'Quando o trial do usuário é iniciado' },
    { value: 'trial_reminder_7days', label: 'Trial expira em 7 dias', description: 'Lembrete 7 dias antes do trial expirar' },
    { value: 'trial_reminder_3days', label: 'Trial expira em 3 dias', description: 'Lembrete 3 dias antes do trial expirar' },
    { value: 'trial_reminder_1day', label: 'Trial expira em 1 dia', description: 'Lembrete 1 dia antes do trial expirar' },
    { value: 'trial_ending', label: 'Trial expirando hoje', description: 'No dia que o trial expira' },
    { value: 'trial_ended', label: 'Trial expirado', description: 'Após o trial ter expirado' },
    { value: 'subscription_welcome', label: 'Boas-vindas assinante', description: 'Quando usuário se torna assinante' },
    { value: 'subscription_renewed', label: 'Assinatura renovada', description: 'Quando assinatura é renovada' },
    { value: 'subscription_expiring', label: 'Assinatura expirando', description: 'Quando assinatura está próxima do vencimento' },
    { value: 'subscription_cancelled', label: 'Assinatura cancelada', description: 'Quando assinatura é cancelada' },
    { value: 'payment_successful', label: 'Pagamento realizado', description: 'Quando pagamento é processado com sucesso' },
    { value: 'payment_failed', label: 'Falha no pagamento', description: 'Quando pagamento falha' },
    { value: 'password_reset', label: 'Redefinição de senha', description: 'Quando usuário solicita reset de senha' },
    { value: 'email_confirmation', label: 'Confirmação de email', description: 'Para confirmar endereço de email' },
  ];

  // Mapeamento de tipos de template para labels amigáveis
  const templateLabels: Record<string, string> = {
    'welcome': 'Boas-vindas ao sistema',
    'trial_start': 'Início do período trial',
    'trial_reminder': 'Lembrete de trial',
    'trial_ending': 'Trial expirando',
    'trial_ended': 'Fim do período trial',
    'subscription_welcome': 'Bem-vindo assinante',
    'subscription_renewed': 'Assinatura renovada',
    'subscription_cancelled': 'Assinatura cancelada',
    'subscription_expiring': 'Renovação próxima ao vencimento',
    'payment_failed': 'Falha no pagamento',
    'payment_successful': 'Pagamento realizado',
    'password_reset': 'Redefinição de senha',
    'email_confirmation': 'Confirmação de email',
    'tutorial': 'Tutorial inicial',
  };

  // Templates dinâmicos baseados no banco de dados
  const templates = emailTemplates?.map(template => ({
    value: template.type,
    label: templateLabels[template.type] || template.type,
    subject: template.subject
  })) || [];

  if (isLoading) {
    return <div className="p-4">Carregando regras...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Regras de Automação</h3>
          <p className="text-sm text-muted-foreground">
            Configure quando e quais emails devem ser enviados automaticamente
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nova Regra
        </Button>
      </div>

      {/* Lista de regras */}
      <div className="space-y-3">
        {rules?.map((rule) => (
          <Card key={rule.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{rule.name}</h4>
                    <Badge variant={rule.active ? "default" : "secondary"}>
                      {rule.active ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Trigger: {triggers.find(t => t.value === rule.trigger)?.label} • 
                    Template: {templates.find(t => t.value === rule.template_type)?.label} • 
                    Delay: {rule.delay_hours}h
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={rule.active}
                    onCheckedChange={(active) => toggleRule(rule.id, active)}
                  />
                  <Button variant="ghost" size="sm" onClick={() => setEditingRule(rule)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteRule(rule.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {(!rules || rules.length === 0) && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                Nenhuma regra de automação configurada
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de criação */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Nova Regra de Automação</CardTitle>
            <CardDescription>
              Configure uma nova regra para envio automático de emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                createRule({
                  name: formData.get('name') as string,
                  trigger: formData.get('trigger') as string,
                  template_type: formData.get('template_type') as string,
                  delay_hours: parseInt(formData.get('delay_hours') as string) || 0,
                  conditions: {},
                  active: true,
                });
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="name">Nome da Regra</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Ex: Boas-vindas Trial"
                  required
                />
              </div>

              <div>
                <Label htmlFor="trigger">Evento Disparador</Label>
                <Select name="trigger" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o evento" />
                  </SelectTrigger>
                  <SelectContent>
                    {triggers.map(trigger => (
                      <SelectItem key={trigger.value} value={trigger.value}>
                        {trigger.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="template_type">Template de Email</Label>
                <Select name="template_type" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(template => (
                      <SelectItem key={template.value} value={template.value}>
                        {template.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="delay_hours">Delay (horas)</Label>
                <Input
                  id="delay_hours"
                  name="delay_hours"
                  type="number"
                  min="0"
                  defaultValue="0"
                  placeholder="0"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit">Criar Regra</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreating(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Modal de edição */}
      {editingRule && (
        <Card>
          <CardHeader>
            <CardTitle>Editar Regra de Automação</CardTitle>
            <CardDescription>
              Altere as configurações da regra de automação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                updateRule(editingRule.id, {
                  name: formData.get('name') as string,
                  trigger: formData.get('trigger') as string,
                  template_type: formData.get('template_type') as string,
                  delay_hours: parseInt(formData.get('delay_hours') as string) || 0,
                  conditions: editingRule.conditions,
                  active: editingRule.active,
                });
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="edit-name">Nome da Regra</Label>
                <Input
                  id="edit-name"
                  name="name"
                  defaultValue={editingRule.name}
                  placeholder="Ex: Boas-vindas Trial"
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-trigger">Evento Disparador</Label>
                <Select name="trigger" defaultValue={editingRule.trigger} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o evento" />
                  </SelectTrigger>
                  <SelectContent>
                    {triggers.map(trigger => (
                      <SelectItem key={trigger.value} value={trigger.value}>
                        {trigger.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-template_type">Template de Email</Label>
                <Select name="template_type" defaultValue={editingRule.template_type} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(template => (
                      <SelectItem key={template.value} value={template.value}>
                        {template.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-delay_hours">Delay (horas)</Label>
                <Input
                  id="edit-delay_hours"
                  name="delay_hours"
                  type="number"
                  min="0"
                  defaultValue={editingRule.delay_hours}
                  placeholder="0"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit">Atualizar Regra</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingRule(null)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};