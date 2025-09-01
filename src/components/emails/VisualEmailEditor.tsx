import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Plus, Edit, Eye } from "lucide-react";

interface EmailTemplate {
  id: string;
  type: string;
  subject: string;
  html: string;
  created_at: string;
  updated_at: string;
}

export const VisualEmailEditor = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Fetch email templates
  const { data: templates, isLoading, refetch } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as EmailTemplate[];
    },
  });

  const saveTemplate = async (templateData: { type: string; subject: string; html: string }) => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .upsert([{
          ...templateData,
          type: templateData.type as any,
          updated_by: (await supabase.auth.getUser()).data.user?.id,
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Template salvo",
        description: "Template de email foi salvo com sucesso",
      });

      refetch();
      setIsEditing(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const templateTypes = [
    { value: 'welcome', label: 'Boas-vindas' },
    { value: 'trial_reminder', label: 'Lembrete de Trial' },
    { value: 'trial_ending', label: 'Trial Expirando' },
    { value: 'subscription_welcome', label: 'Boas-vindas Premium' },
  ];

  const defaultTemplates = {
    welcome: {
      subject: 'Bem-vindo ao {{nome_sistema}}!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Olá {{nome_usuario}}!</h1>
          <p>Bem-vindo ao <strong>{{nome_sistema}}</strong>!</p>
          <p>Seu trial de {{dias_trial}} dias já começou. Aproveite todos os recursos disponíveis.</p>
          <p>
            <a href="{{link_acesso}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Acessar Sistema
            </a>
          </p>
          <p>Se precisar de ajuda, estamos aqui para apoiá-lo!</p>
        </div>
      `
    },
    trial_reminder: {
      subject: 'Seu trial expira em {{dias_restantes}} dias',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Olá {{nome_usuario}}!</h1>
          <p>Seu trial do {{nome_sistema}} expira em {{dias_restantes}} dias.</p>
          <p>Para continuar aproveitando todos os recursos, considere assinar um de nossos planos.</p>
          <p>
            <a href="{{link_pagamento}}" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Ver Planos
            </a>
          </p>
        </div>
      `
    }
  } as const;

  const currentTemplate = templates?.find(t => t.type === selectedTemplate);

  if (isLoading) {
    return <div className="p-4">Carregando templates...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Label htmlFor="template-select">Selecionar Template</Label>
          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha um template para editar" />
            </SelectTrigger>
            <SelectContent>
              {templateTypes.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                  {templates?.find(t => t.type === type.value) && (
                    <Badge variant="secondary" className="ml-2">Configurado</Badge>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {selectedTemplate && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPreviewMode(!previewMode)}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              {previewMode ? "Editor" : "Preview"}
            </Button>
            <Button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              {isEditing ? "Cancelar" : "Editar"}
            </Button>
          </div>
        )}
      </div>

      {selectedTemplate && (
        <Card>
          <CardHeader>
            <CardTitle>
              Template: {templateTypes.find(t => t.value === selectedTemplate)?.label}
            </CardTitle>
            <CardDescription>
              {currentTemplate ? "Última atualização: " + new Date(currentTemplate.updated_at).toLocaleString('pt-BR') : "Template não configurado"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {previewMode ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Assunto:</h4>
                  <div className="p-3 bg-muted rounded">
                    {currentTemplate?.subject || defaultTemplates[selectedTemplate as keyof typeof defaultTemplates]?.subject || "Sem assunto"}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Conteúdo:</h4>
                  <div 
                    className="p-4 bg-white border rounded"
                    dangerouslySetInnerHTML={{
                      __html: currentTemplate?.html || defaultTemplates[selectedTemplate as keyof typeof defaultTemplates]?.html || "Sem conteúdo"
                    }}
                  />
                </div>
              </div>
            ) : isEditing ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  saveTemplate({
                    type: selectedTemplate as string,
                    subject: formData.get('subject') as string,
                    html: formData.get('html') as string,
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="subject">Assunto do Email</Label>
                  <Input
                    id="subject"
                    name="subject"
                    defaultValue={currentTemplate?.subject || defaultTemplates[selectedTemplate as keyof typeof defaultTemplates]?.subject}
                    placeholder="Assunto do email"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="html">Conteúdo HTML</Label>
                  <Textarea
                    id="html"
                    name="html"
                    defaultValue={currentTemplate?.html || defaultTemplates[selectedTemplate as keyof typeof defaultTemplates]?.html}
                    placeholder="Conteúdo HTML do email"
                    rows={15}
                    className="font-mono text-sm"
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit">Salvar Template</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Assunto:</h4>
                  <div className="p-3 bg-muted rounded">
                    {currentTemplate?.subject || "Template não configurado"}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Variáveis disponíveis:</h4>
                  <div className="flex flex-wrap gap-2">
                    {['nome_usuario', 'email', 'nome_sistema', 'empresa', 'link_acesso', 'dias_trial', 'link_pagamento'].map(variable => (
                      <Badge key={variable} variant="outline">
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {!currentTemplate && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm text-yellow-800">
                      Este template ainda não foi configurado. Clique em "Editar" para criar o template.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedTemplate && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              Selecione um template acima para começar a editar
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};