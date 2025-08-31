-- Inserir os últimos templates
INSERT INTO email_templates (type, subject, html) VALUES 
(
  'payment_failed',
  '⚠️ Falha no pagamento - Ação necessária - {{nome_sistema}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc3545; color: white; padding: 30px; text-align: center; border-radius: 8px; margin-bottom: 30px; }
    .content { padding: 20px 0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; margin-top: 30px; font-size: 14px; color: #666; }
    .button { display: inline-block; background: #28a745; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
    .alert { background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .payment-info { background: #d1ecf1; border: 1px solid #b8daff; padding: 20px; border-radius: 8px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>⚠️ Falha no Pagamento</h1>
    <p>Sua assinatura do {{nome_sistema}} precisa de atenção</p>
  </div>
  
  <div class="content">
    <p>Olá <strong>{{nome_usuario}}</strong>,</p>
    
    <p>Infelizmente, não conseguimos processar o pagamento da sua assinatura do <strong>{{nome_sistema}}</strong>.</p>
    
    <div class="alert">
      <h3>🚨 Ação necessária:</h3>
      <p><strong>Plano:</strong> {{nome_plano}}</p>
      <p><strong>Valor:</strong> {{valor_plano}}</p>
      <p><strong>Tentativa de cobrança:</strong> {{data_vencimento}}</p>
      <p><strong>Status:</strong> Falha no pagamento</p>
    </div>
    
    <p><strong>Possíveis motivos:</strong></p>
    <ul>
      <li>Cartão de crédito expirado</li>
      <li>Saldo insuficiente</li>
      <li>Cartão bloqueado pelo banco</li>
      <li>Dados de pagamento desatualizados</li>
    </ul>
    
    <div class="payment-info">
      <h3>💳 Como resolver:</h3>
      <p>1. Verifique os dados do seu cartão</p>
      <p>2. Confirme se há saldo suficiente</p>
      <p>3. Entre em contato com seu banco se necessário</p>
      <p>4. Atualize suas informações de pagamento</p>
    </div>
    
    <p style="text-align: center;">
      <a href="{{link_pagamento}}" class="button">Atualizar Pagamento</a>
    </p>
    
    <p><strong>⏰ Importante:</strong> Você tem até {{dias_restantes}} dias para regularizar o pagamento antes que o acesso seja suspenso.</p>
    
    <p>Se precisar de ajuda, nossa equipe de suporte está disponível para auxiliá-lo.</p>
    
    <p>Atenciosamente,<br>
    Equipe {{nome_sistema}}</p>
  </div>
  
  <div class="footer">
    <p>Este é um email automático. Não responda a esta mensagem.</p>
    <p>© ' || extract(year from now()) || ' {{nome_sistema}}. Todos os direitos reservados.</p>
  </div>
</body>
</html>'
),
(
  'tutorial_inicial',
  'Como usar o {{nome_sistema}} - Tutorial inicial',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; padding: 30px; text-align: center; border-radius: 8px; margin-bottom: 30px; }
    .content { padding: 20px 0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; margin-top: 30px; font-size: 14px; color: #666; }
    .button { display: inline-block; background: #28a745; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
    .tutorial-step { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #007bff; }
    .tip { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 8px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚀 Tutorial Inicial</h1>
    <p>Aprenda a usar o {{nome_sistema}} em poucos passos</p>
  </div>
  
  <div class="content">
    <p>Olá <strong>{{nome_usuario}}</strong>,</p>
    
    <p>Bem-vindo ao <strong>{{nome_sistema}}</strong>! Este tutorial vai ajudá-lo a dar os primeiros passos na nossa plataforma.</p>
    
    <div class="tutorial-step">
      <h3>📱 Passo 1: Faça login</h3>
      <p>Acesse a plataforma usando seu email <strong>{{email}}</strong> e a senha que você criou durante o cadastro.</p>
    </div>
    
    <div class="tutorial-step">
      <h3>⚙️ Passo 2: Configure seu perfil</h3>
      <p>Complete suas informações pessoais e ajuste as configurações do sistema conforme suas preferências.</p>
    </div>
    
    <div class="tutorial-step">
      <h3>📊 Passo 3: Explore o dashboard</h3>
      <p>Familiarize-se com a interface principal e descubra todas as funcionalidades disponíveis.</p>
    </div>
    
    <div class="tutorial-step">
      <h3>📝 Passo 4: Crie seu primeiro projeto</h3>
      <p>Comece criando um projeto de teste para entender melhor como tudo funciona.</p>
    </div>
    
    <div class="tutorial-step">
      <h3>👥 Passo 5: Gerencie sua equipe</h3>
      <p>Se necessário, convide outros usuários para colaborar em seus projetos.</p>
    </div>
    
    <div class="tip">
      <h3>💡 Dicas importantes:</h3>
      <ul>
        <li>Explore os tooltips e ajudas contextuais</li>
        <li>Use os atalhos de teclado para maior produtividade</li>
        <li>Não hesite em entrar em contato com o suporte</li>
        <li>Participe da nossa comunidade de usuários</li>
      </ul>
    </div>
    
    <p style="text-align: center;">
      <a href="{{link_acesso}}" class="button">Começar Tutorial</a>
    </p>
    
    <p>Se tiver dúvidas durante o processo, nossa documentação completa e equipe de suporte estão disponíveis para ajudá-lo.</p>
    
    <p>Boa jornada com o {{nome_sistema}}!</p>
    
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