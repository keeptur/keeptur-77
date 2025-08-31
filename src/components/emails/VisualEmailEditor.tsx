import { useState, useRef, useEffect } from "react";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ColorPicker } from 'react-color';
import { 
  Palette, 
  Type, 
  Image, 
  Link, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Plus,
  Trash2,
  Copy,
  Eye,
  Save,
  Undo,
  Redo,
  Monitor,
  Smartphone,
  Tablet
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface EmailTemplate {
  id?: string;
  type: string;
  subject: string;
  html: string;
}

interface VisualEmailEditorProps {
  template?: EmailTemplate;
  onSave: (template: EmailTemplate) => void;
  onPreview: (template: EmailTemplate) => void;
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
  { key: '{{nome_usuario}}', description: 'Nome do usuário', category: 'user' },
  { key: '{{email}}', description: 'E-mail do usuário', category: 'user' },
  { key: '{{nome_sistema}}', description: 'Nome do sistema (Keeptur)', category: 'system' },
  { key: '{{data_vencimento}}', description: 'Data de vencimento', category: 'subscription' },
  { key: '{{dias_restantes}}', description: 'Dias restantes do trial', category: 'subscription' },
  { key: '{{valor_plano}}', description: 'Valor do plano', category: 'subscription' },
  { key: '{{nome_plano}}', description: 'Nome do plano', category: 'subscription' },
  { key: '{{link_pagamento}}', description: 'Link de pagamento', category: 'system' },
  { key: '{{link_acesso}}', description: 'Link de acesso ao sistema', category: 'system' },
  { key: '{{empresa}}', description: 'Nome da empresa', category: 'user' },
  { key: '{{subdominio}}', description: 'Subdomínio do usuário', category: 'user' }
];

const PREDEFINED_STYLES = {
  colors: {
    primary: '#007bff',
    secondary: '#6c757d', 
    success: '#28a745',
    danger: '#dc3545',
    warning: '#ffc107',
    info: '#17a2b8',
    light: '#f8f9fa',
    dark: '#343a40'
  },
  fonts: [
    'Arial, sans-serif',
    'Georgia, serif',
    'Times New Roman, serif',
    'Helvetica, sans-serif',
    'Verdana, sans-serif',
    'Courier New, monospace'
  ],
  templates: [
    {
      name: 'Moderno Azul',
      html: `<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; padding: 40px 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">{{nome_sistema}}</h1>
          <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Sua plataforma de gestão</p>
        </div>
        <div style="padding: 40px 30px; background: white;">
          <h2 style="color: #333; margin-bottom: 20px;">Olá {{nome_usuario}},</h2>
          <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">Conteúdo do email aqui...</p>
          <a href="{{link_acesso}}" style="display: inline-block; background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Acessar Sistema</a>
        </div>
        <div style="background: #f8f9fa; padding: 20px 30px; text-align: center; color: #666; font-size: 14px;">
          <p>© 2025 {{nome_sistema}}. Todos os direitos reservados.</p>
        </div>
      </div>`
    },
    {
      name: 'Elegante Verde',
      html: `<div style="max-width: 600px; margin: 0 auto; font-family: Georgia, serif;">
        <div style="background: #28a745; color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0;">{{nome_sistema}}</h1>
        </div>
        <div style="padding: 30px; background: white; border-left: 4px solid #28a745;">
          <h2 style="color: #28a745;">Prezado {{nome_usuario}},</h2>
          <p style="line-height: 1.8;">Conteúdo do email...</p>
        </div>
      </div>`
    },
    {
      name: 'Minimalista',
      html: `<div style="max-width: 500px; margin: 0 auto; font-family: Helvetica, sans-serif; padding: 40px 20px;">
        <div style="border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px;">
          <h1 style="color: #333; font-weight: 300; margin: 0;">{{nome_sistema}}</h1>
        </div>
        <div>
          <p style="color: #333; line-height: 1.6;">Olá {{nome_usuario}},</p>
          <p style="color: #666; line-height: 1.6;">Conteúdo do email...</p>
        </div>
      </div>`
    }
  ]
};

const QUILL_MODULES = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'font': [] }],
    [{ 'align': [] }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['link', 'image'],
    ['clean']
  ]
};

export default function VisualEmailEditor({ template, onSave, onPreview }: VisualEmailEditorProps) {
  const [subject, setSubject] = useState(template?.subject || '');
  const [type, setType] = useState(template?.type || '');
  const [htmlContent, setHtmlContent] = useState(template?.html || '');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [currentColor, setCurrentColor] = useState('#007bff');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const quillRef = useRef<ReactQuill>(null);

  useEffect(() => {
    if (template) {
      setSubject(template.subject);
      setType(template.type);
      setHtmlContent(template.html);
    }
  }, [template]);

  const addToHistory = (content: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(content);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setHtmlContent(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setHtmlContent(history[historyIndex + 1]);
    }
  };

  const insertVariable = (variable: string) => {
    const quill = quillRef.current?.getEditor();
    if (quill) {
      const range = quill.getSelection();
      if (range) {
        quill.insertText(range.index, variable);
      }
    }
  };

  const applyTemplate = (templateHtml: string) => {
    setHtmlContent(templateHtml);
    addToHistory(templateHtml);
    toast({
      title: "Template aplicado",
      description: "O template foi aplicado com sucesso ao editor."
    });
  };

  const handleSave = () => {
    if (!type || !subject || !htmlContent) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha tipo, assunto e conteúdo do email.",
        variant: "destructive"
      });
      return;
    }

    onSave({
      id: template?.id,
      type,
      subject,
      html: htmlContent
    });
  };

  const handlePreview = () => {
    onPreview({
      id: template?.id,
      type,
      subject,
      html: htmlContent
    });
  };

  const getPreviewWidth = () => {
    switch (previewMode) {
      case 'mobile': return '375px';
      case 'tablet': return '768px';
      default: return '100%';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
      {/* Painel de Ferramentas */}
      <div className="lg:col-span-1 space-y-4 overflow-y-auto">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Type className="h-4 w-4" />
              Configurações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="type">Tipo do Template</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {EMAIL_TEMPLATE_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subject">Assunto</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Assunto do email"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Variáveis Dinâmicas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {DYNAMIC_VARIABLES.map((variable) => (
                <div key={variable.key} className="flex items-center justify-between">
                  <div className="flex-1">
                    <Badge 
                      variant="outline" 
                      className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => insertVariable(variable.key)}
                    >
                      {variable.key}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">{variable.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Templates Prontos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {PREDEFINED_STYLES.templates.map((tmpl, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => applyTemplate(tmpl.html)}
                >
                  {tmpl.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Image className="h-4 w-4" />
              Ações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={undo}
                disabled={historyIndex <= 0}
              >
                <Undo className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
              >
                <Redo className="h-3 w-3" />
              </Button>
            </div>
            
            <Separator />
            
            <Button onClick={handlePreview} variant="outline" size="sm" className="w-full">
              <Eye className="h-3 w-3 mr-2" />
              Visualizar
            </Button>
            
            <Button onClick={handleSave} size="sm" className="w-full">
              <Save className="h-3 w-3 mr-2" />
              Salvar Template
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Editor Principal */}
      <div className="lg:col-span-3 space-y-4">
        <Card className="flex-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Editor Visual</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={previewMode === 'desktop' ? 'default' : 'outline'}
                  onClick={() => setPreviewMode('desktop')}
                >
                  <Monitor className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant={previewMode === 'tablet' ? 'default' : 'outline'}
                  onClick={() => setPreviewMode('tablet')}
                >
                  <Tablet className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant={previewMode === 'mobile' ? 'default' : 'outline'}
                  onClick={() => setPreviewMode('mobile')}
                >
                  <Smartphone className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="visual" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="visual">Editor Visual</TabsTrigger>
                <TabsTrigger value="code">Código HTML</TabsTrigger>
              </TabsList>
              
              <TabsContent value="visual" className="mt-0">
                <div className="h-[500px] overflow-auto">
                  <ReactQuill
                    ref={quillRef}
                    theme="snow"
                    value={htmlContent}
                    onChange={(content) => {
                      setHtmlContent(content);
                      addToHistory(content);
                    }}
                    modules={QUILL_MODULES}
                    style={{ height: '450px' }}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="code" className="mt-0">
                <textarea
                  className="w-full h-[500px] p-4 font-mono text-sm border rounded-md resize-none"
                  value={htmlContent}
                  onChange={(e) => {
                    setHtmlContent(e.target.value);
                    addToHistory(e.target.value);
                  }}
                  placeholder="Cole aqui o código HTML do seu email..."
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Pré-visualização ({previewMode})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md p-4 bg-gray-50 min-h-[200px] overflow-auto">
              <div 
                style={{ 
                  width: getPreviewWidth(), 
                  margin: '0 auto',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              >
                <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}