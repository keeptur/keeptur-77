-- Inserir templates padrão completos para todos os tipos de email
INSERT INTO email_templates (type, subject, html) VALUES 
(
  'welcome'::email_type,
  'Bem-vindo ao {{nome_sistema}}! Sua conta foi criada',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f8f9fa; padding: 30px; text-align: center; border-radius: 8px; margin-bottom: 30px; }
    .content { padding: 20px 0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; margin-top: 30px; font-size: 14px; color: #666; }
    .button { display: inline-block; background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .highlight { background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎉 Bem-vindo ao {{nome_sistema}}!</h1>
    <p>Sua conta foi criada com sucesso</p>
  </div>
  
  <div class="content">
    <p>Olá <strong>{{nome_usuario}}</strong>,</p>
    
    <p>É com grande prazer que damos as boas-vindas ao <strong>{{nome_sistema}}</strong>! Sua conta foi criada com sucesso e você já pode começar a usar nossa plataforma.</p>
    
    <div class="highlight">
      <h3>📧 Dados da sua conta:</h3>
      <p><strong>Email:</strong> {{email}}</p>
      <p><strong>Data de cadastro:</strong> ' || to_char(now(), 'DD/MM/YYYY à\s HH24:MI') || '</p>
    </div>
    
    <p>Para começar a usar o {{nome_sistema}}, clique no botão abaixo:</p>
    
    <p style="text-align: center;">
      <a href="{{link_acesso}}" class="button">Acessar Plataforma</a>
    </p>
    
    <p>Se você tiver alguma dúvida ou precisar de ajuda, nossa equipe de suporte está sempre disponível para auxiliá-lo.</p>
    
    <p>Mais uma vez, seja bem-vindo!</p>
    
    <p>Atenciosamente,<br>
    Equipe {{nome_sistema}}</p>
  </div>
  
  <div class="footer">
    <p>Este é um email automático. Não responda a esta mensagem.</p>
    <p>© ' || extract(year from now()) || ' {{nome_sistema}}. Todos os direitos reservados.</p>
  </div>
</body>
</html>'
)
ON CONFLICT (type) DO UPDATE SET 
  subject = EXCLUDED.subject,
  html = EXCLUDED.html,
  updated_at = now();

INSERT INTO email_templates (type, subject, html) VALUES 
(
  'email_confirmation'::email_type,
  'Confirme seu email - {{nome_sistema}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f8f9fa; padding: 30px; text-align: center; border-radius: 8px; margin-bottom: 30px; }
    .content { padding: 20px 0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; margin-top: 30px; font-size: 14px; color: #666; }
    .button { display: inline-block; background: #28a745; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
    .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📧 Confirme seu Email</h1>
    <p>Para ativar sua conta no {{nome_sistema}}</p>
  </div>
  
  <div class="content">
    <p>Olá <strong>{{nome_usuario}}</strong>,</p>
    
    <p>Para finalizar o cadastro da sua conta no <strong>{{nome_sistema}}</strong>, você precisa confirmar seu endereço de email.</p>
    
    <p>Clique no botão abaixo para confirmar:</p>
    
    <p style="text-align: center;">
      <a href="{{link_acesso}}" class="button">Confirmar Email</a>
    </p>
    
    <div class="warning">
      <p><strong>⚠️ Importante:</strong> Este link expira em 24 horas. Se não conseguir confirmar dentro deste prazo, solicite um novo link de confirmação.</p>
    </div>
    
    <p>Se você não se cadastrou no {{nome_sistema}}, pode ignorar este email com segurança.</p>
    
    <p>Atenciosamente,<br>
    Equipe {{nome_sistema}}</p>
  </div>
  
  <div class="footer">
    <p>Este é um email automático. Não responda a esta mensagem.</p>
    <p>© ' || extract(year from now()) || ' {{nome_sistema}}. Todos os direitos reservados.</p>
  </div>
</body>
</html>'
)
ON CONFLICT (type) DO UPDATE SET 
  subject = EXCLUDED.subject,
  html = EXCLUDED.html,
  updated_at = now();

INSERT INTO email_templates (type, subject, html) VALUES 
(
  'password_reset'::email_type,
  'Redefinição de senha - {{nome_sistema}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f8f9fa; padding: 30px; text-align: center; border-radius: 8px; margin-bottom: 30px; }
    .content { padding: 20px 0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; margin-top: 30px; font-size: 14px; color: #666; }
    .button { display: inline-block; background: #dc3545; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
    .security { background: #d1ecf1; border: 1px solid #b8daff; padding: 15px; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔐 Redefinição de Senha</h1>
    <p>{{nome_sistema}}</p>
  </div>
  
  <div class="content">
    <p>Olá <strong>{{nome_usuario}}</strong>,</p>
    
    <p>Recebemos uma solicitação para redefinir a senha da sua conta no <strong>{{nome_sistema}}</strong>.</p>
    
    <p>Para criar uma nova senha, clique no botão abaixo:</p>
    
    <p style="text-align: center;">
      <a href="{{link_acesso}}" class="button">Redefinir Senha</a>
    </p>
    
    <div class="security">
      <p><strong>🛡️ Segurança:</strong></p>
      <ul>
        <li>Este link expira em 1 hora por segurança</li>
        <li>Só pode ser usado uma vez</li>
        <li>Se você não solicitou esta alteração, ignore este email</li>
      </ul>
    </div>
    
    <p>Se você não conseguir clicar no botão, copie e cole o link abaixo no seu navegador:</p>
    <p style="word-break: break-all; color: #666; font-size: 12px;">{{link_acesso}}</p>
    
    <p>Atenciosamente,<br>
    Equipe {{nome_sistema}}</p>
  </div>
  
  <div class="footer">
    <p>Este é um email automático. Não responda a esta mensagem.</p>
    <p>© ' || extract(year from now()) || ' {{nome_sistema}}. Todos os direitos reservados.</p>
  </div>
</body>
</html>'
)
ON CONFLICT (type) DO UPDATE SET 
  subject = EXCLUDED.subject,
  html = EXCLUDED.html,
  updated_at = now();