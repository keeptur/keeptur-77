
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import DOMPurify from 'dompurify';
import { 
  Bold, 
  Italic, 
  Underline, 
  Link, 
  Image, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  List,
  ListOrdered,
  Palette,
  Type,
  Smartphone,
  Tablet,
  Monitor,
  Code,
  Eye,
  Save
} from 'lucide-react';

interface VisualEmailEditorProps {
  template: any;
  onSave: (template: any) => void;
  onClose: () => void;
}

const EMAIL_VARIABLES = [
  { variable: '{{nome_usuario}}', description: 'Nome do usuário' },
  { variable: '{{email}}', description: 'Email do usuário' },
  { variable: '{{nome_sistema}}', description: 'Nome do sistema' },
  { variable: '{{empresa}}', description: 'Nome da empresa' },
  { variable: '{{subdominio}}', description: 'Subdomínio da empresa' },
  { variable: '{{dias_trial}}', description: 'Dias de trial' },
  { variable: '{{data_vencimento}}', description: 'Data de vencimento' },
  { variable: '{{dias_restantes}}', description: 'Dias restantes do trial' },
  { variable: '{{valor_plano}}', description: 'Valor do plano' },
  { variable: '{{nome_plano}}', description: 'Nome do plano' },
  { variable: '{{link_acesso}}', description: 'Link de acesso ao sistema' },
  { variable: '{{link_pagamento}}', description: 'Link para pagamento' }
];

const DEVICE_SIZES = [
  { key: 'desktop', label: 'Desktop', icon: Monitor, width: '100%' },
  { key: 'tablet', label: 'Tablet', icon: Tablet, width: '768px' },
  { key: 'mobile', label: 'Mobile', icon: Smartphone, width: '375px' }
];

export default function VisualEmailEditor({ template, onSave, onClose }: VisualEmailEditorProps) {
  const [subject, setSubject] = useState(template?.subject || '');
  const [htmlContent, setHtmlContent] = useState(template?.html || '');
  const [activeTab, setActiveTab] = useState('visual');
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [rawHtml, setRawHtml] = useState(template?.html || '');

  // Configuração do Quill para não reformatar demais
  const quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ 'header': [1, 2, 3, false] }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      ['link', 'image'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['clean']
    ],
  };

  const quillFormats = [
    'header', 'bold', 'italic', 'underline',
    'color', 'background', 'align',
    'link', 'image', 'list', 'bullet'
  ];

  const insertVariable = (variable: string) => {
    if (activeTab === 'visual') {
      setHtmlContent(prev => prev + ` ${variable} `);
    } else {
      setRawHtml(prev => prev + ` ${variable} `);
    }
  };

  const handleSave = () => {
    const finalHtml = activeTab === 'visual' ? htmlContent : rawHtml;
    
    // Sanitize HTML content to prevent XSS
    const sanitizedHtml = DOMPurify.sanitize(finalHtml, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'a', 'img', 'ul', 'ol', 'li', 'span', 'div'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'style', 'class', 'target'],
      ALLOW_DATA_ATTR: false
    });
    
    onSave({
      ...template,
      subject: DOMPurify.sanitize(subject, { ALLOWED_TAGS: [] }),
      html: sanitizedHtml
    });
  };

  const getPreviewHtml = () => {
    const content = activeTab === 'visual' ? htmlContent : rawHtml;
    
    // Substituir variáveis para preview
    let previewContent = content;
    EMAIL_VARIABLES.forEach(({ variable }) => {
      previewContent = previewContent.replace(
        new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'),
        `<span style="background: #fef3c7; padding: 2px 4px; border-radius: 3px; font-size: 0.8em;">${variable}</span>`
      );
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              line-height: 1.6; 
              margin: 0; 
              padding: 20px;
              background-color: #f5f5f5;
            }
            .email-container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            img { max-width: 100%; height: auto; }
            a { color: #0066cc; }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background: #0066cc;
              color: white;
              text-decoration: none;
              border-radius: 4px;
              margin: 10px 0;
            }
            @media (max-width: 480px) {
              .email-container { padding: 10px; }
              .button { display: block; text-align: center; }
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            ${previewContent}
          </div>
        </body>
      </html>
    `;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-7xl h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold">Editor Visual de Email</h2>
            <p className="text-gray-600">Template: {template?.type}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Painel Esquerdo - Editor */}
          <div className="w-1/2 flex flex-col border-r">
            <div className="p-4 border-b bg-gray-50">
              <Label htmlFor="subject" className="text-sm font-medium">
                Assunto do Email
              </Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Digite o assunto do email..."
                className="mt-1"
              />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-2 m-4 mb-0">
                <TabsTrigger value="visual" className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Visual
                </TabsTrigger>
                <TabsTrigger value="html" className="flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  HTML
                </TabsTrigger>
              </TabsList>

              <TabsContent value="visual" className="flex-1 p-4 pt-2">
                <div className="h-full">
                  <ReactQuill
                    value={htmlContent}
                    onChange={setHtmlContent}
                    modules={quillModules}
                    formats={quillFormats}
                    style={{ height: 'calc(100% - 42px)' }}
                    className="bg-white"
                  />
                </div>
              </TabsContent>

              <TabsContent value="html" className="flex-1 p-4 pt-2">
                <Textarea
                  value={rawHtml}
                  onChange={(e) => setRawHtml(e.target.value)}
                  placeholder="Cole ou edite o HTML do email aqui..."
                  className="h-full resize-none font-mono text-sm"
                />
              </TabsContent>
            </Tabs>

            {/* Variáveis */}
            <div className="p-4 border-t bg-gray-50">
              <Label className="text-sm font-medium mb-2 block">
                Variáveis Disponíveis
              </Label>
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                {EMAIL_VARIABLES.map(({ variable, description }) => (
                  <Button
                    key={variable}
                    size="sm"
                    variant="outline"
                    onClick={() => insertVariable(variable)}
                    className="text-xs h-7"
                    title={description}
                  >
                    {variable}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Painel Direito - Preview */}
          <div className="w-1/2 flex flex-col">
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
              <Label className="text-sm font-medium">Preview do Email</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Visualizar em:</span>
                <Select value={previewDevice} onValueChange={setPreviewDevice}>
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEVICE_SIZES.map(device => {
                      const Icon = device.icon;
                      return (
                        <SelectItem key={device.key} value={device.key}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-3 h-3" />
                            {device.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex-1 p-4 bg-gray-100 overflow-auto">
              <div 
                className="mx-auto transition-all duration-300"
                style={{ 
                  width: DEVICE_SIZES.find(d => d.key === previewDevice)?.width,
                  maxWidth: '100%'
                }}
              >
                <iframe
                  srcDoc={getPreviewHtml()}
                  className="w-full h-full border rounded-lg bg-white shadow-lg"
                  style={{ 
                    minHeight: '500px',
                    height: previewDevice === 'mobile' ? '700px' : '600px'
                  }}
                  title="Email Preview"
                />
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50">
              <div className="text-xs text-gray-600 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    Assunto
                  </Badge>
                  <span>{subject || 'Sem assunto'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    Caracteres
                  </Badge>
                  <span>{(activeTab === 'visual' ? htmlContent : rawHtml).length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    Variáveis
                  </Badge>
                  <span>
                    {EMAIL_VARIABLES.filter(v => 
                      (activeTab === 'visual' ? htmlContent : rawHtml).includes(v.variable)
                    ).length} de {EMAIL_VARIABLES.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
