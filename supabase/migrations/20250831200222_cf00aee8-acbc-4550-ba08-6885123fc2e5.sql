-- Inserir templates restantes completos
INSERT INTO email_templates (type, subject, html) VALUES 
(
  'trial_start',
  'Seu período trial começou! - {{nome_sistema}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px; margin-bottom: 30px; }
    .content { padding: 20px 0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; margin-top: 30px; font-size: 14px; color: #666; }
    .button { display: inline-block; background: #28a745; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
    .trial-info { background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .benefits { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .benefit-item { margin: 10px 0; display: flex; align-items: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚀 Seu Trial Começou!</h1>
    <p>Explore todas as funcionalidades do {{nome_sistema}}</p>
  </div>
  
  <div class="content">
    <p>Olá <strong>{{nome_usuario}}</strong>,</p>
    
    <p>Parabéns! Seu período trial de <strong>{{dias_restantes}} dias</strong> no {{nome_sistema}} começou agora!</p>
    
    <div class="trial-info">
      <h3>📅 Informações do seu Trial:</h3>
      <p><strong>Início:</strong> ' || to_char(now(), 'DD/MM/YYYY') || '</p>
      <p><strong>Término:</strong> {{data_vencimento}}</p>
      <p><strong>Dias restantes:</strong> {{dias_restantes}} dias</p>
      <p><strong>Plano:</strong> {{nome_plano}}</p>
    </div>
    
    <div class="benefits">
      <h3>✨ O que você pode fazer durante o trial:</h3>
      <div class="benefit-item">✅ Acesso completo a todas as funcionalidades</div>
      <div class="benefit-item">✅ Suporte técnico prioritário</div>
      <div class="benefit-item">✅ Tutoriais e treinamentos</div>
      <div class="benefit-item">✅ Sem limitações de uso</div>
    </div>
    
    <p style="text-align: center;">
      <a href="{{link_acesso}}" class="button">Começar a Usar Agora</a>
    </p>
    
    <p>Aproveite ao máximo seu período trial e descubra como o {{nome_sistema}} pode transformar seu trabalho!</p>
    
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
  'trial_ending',
  '⏰ Seu trial expira em {{dias_restantes}} dias - {{nome_sistema}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%); color: #333; padding: 30px; text-align: center; border-radius: 8px; margin-bottom: 30px; }
    .content { padding: 20px 0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; margin-top: 30px; font-size: 14px; color: #666; }
    .button { display: inline-block; background: #dc3545; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
    .urgency { background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .pricing { background: #d1ecf1; border: 1px solid #b8daff; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>⏰ Seu Trial Está Acabando!</h1>
    <p>Apenas {{dias_restantes}} dias restantes</p>
  </div>
  
  <div class="content">
    <p>Olá <strong>{{nome_usuario}}</strong>,</p>
    
    <p>Esperamos que esteja aproveitando sua experiência com o <strong>{{nome_sistema}}</strong>!</p>
    
    <div class="urgency">
      <h3>⚠️ Ação necessária:</h3>
      <p>Seu período trial expira em <strong>{{dias_restantes}} dias</strong> ({{data_vencimento}})</p>
      <p>Para continuar usando todas as funcionalidades, você precisa assinar um de nossos planos.</p>
    </div>
    
    <div class="pricing">
      <h3>💎 Continue com o {{nome_plano}}</h3>
      <p style="font-size: 24px; font-weight: bold; color: #28a745;">{{valor_plano}}/mês</p>
      <p>Todas as funcionalidades • Suporte prioritário • Sem limitações</p>
    </div>
    
    <p style="text-align: center;">
      <a href="{{link_pagamento}}" class="button">Assinar Agora</a>
    </p>
    
    <p><strong>Por que escolher o {{nome_sistema}}?</strong></p>
    <ul>
      <li>Interface intuitiva e fácil de usar</li>
      <li>Suporte técnico especializado</li>
      <li>Atualizações constantes</li>
      <li>Segurança e confiabilidade</li>
    </ul>
    
    <p>Não perca o acesso às suas funcionalidades favoritas!</p>
    
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
  'trial_ended',
  'Seu trial expirou - Continue usando {{nome_sistema}}',
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
    .expired { background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .offer { background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>⏰ Seu Trial Expirou</h1>
    <p>Continue aproveitando o {{nome_sistema}}</p>
  </div>
  
  <div class="content">
    <p>Olá <strong>{{nome_usuario}}</strong>,</p>
    
    <p>Seu período trial do <strong>{{nome_sistema}}</strong> expirou em {{data_vencimento}}.</p>
    
    <div class="expired">
      <h3>📋 Status da sua conta:</h3>
      <p><strong>Trial expirado em:</strong> {{data_vencimento}}</p>
      <p><strong>Acesso limitado:</strong> Funcionalidades básicas disponíveis</p>
      <p><strong>Para acesso completo:</strong> Assine um plano</p>
    </div>
    
    <p>Não queremos que você perca o progresso que fez! Seus dados estão seguros e você pode reativar o acesso completo a qualquer momento.</p>
    
    <div class="offer">
      <h3>🎯 Oferta Especial para Você!</h3>
      <p style="font-size: 18px; font-weight: bold;">{{nome_plano}} por {{valor_plano}}/mês</p>
      <p>Reactive agora e continue de onde parou!</p>
    </div>
    
    <p style="text-align: center;">
      <a href="{{link_pagamento}}" class="button">Reativar Acesso Completo</a>
    </p>
    
    <p><strong>Benefícios de continuar conosco:</strong></p>
    <ul>
      <li>Todos os seus dados preservados</li>
      <li>Acesso imediato a todas as funcionalidades</li>
      <li>Suporte técnico dedicado</li>
      <li>Atualizações automáticas</li>
    </ul>
    
    <p>Estamos aqui para ajudar! Se tiver dúvidas, entre em contato conosco.</p>
    
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