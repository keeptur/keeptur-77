-- Inserir templates finais restantes
INSERT INTO email_templates (type, subject, html) VALUES 
(
  'subscription_welcome',
  '🎉 Bem-vindo como assinante do {{nome_sistema}}!',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 8px; margin-bottom: 30px; }
    .content { padding: 20px 0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; margin-top: 30px; font-size: 14px; color: #666; }
    .button { display: inline-block; background: #007bff; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
    .subscription-info { background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .features { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎉 Parabéns!</h1>
    <p>Você agora é um assinante premium do {{nome_sistema}}</p>
  </div>
  
  <div class="content">
    <p>Olá <strong>{{nome_usuario}}</strong>,</p>
    
    <p>É com grande satisfação que confirmamos sua assinatura do <strong>{{nome_plano}}</strong>!</p>
    
    <div class="subscription-info">
      <h3>📋 Detalhes da sua assinatura:</h3>
      <p><strong>Plano:</strong> {{nome_plano}}</p>
      <p><strong>Valor:</strong> {{valor_plano}}/mês</p>
      <p><strong>Próxima cobrança:</strong> {{data_vencimento}}</p>
      <p><strong>Status:</strong> Ativa ✅</p>
    </div>
    
    <div class="features">
      <h3>🚀 Agora você tem acesso a:</h3>
      <ul>
        <li>✅ Todas as funcionalidades premium</li>
        <li>✅ Suporte técnico prioritário</li>
        <li>✅ Atualizações automáticas</li>
        <li>✅ Recursos exclusivos</li>
        <li>✅ Sem limitações de uso</li>
      </ul>
    </div>
    
    <p style="text-align: center;">
      <a href="{{link_acesso}}" class="button">Acessar Plataforma</a>
    </p>
    
    <p>Obrigado por confiar no {{nome_sistema}}! Estamos aqui para ajudar você a alcançar seus objetivos.</p>
    
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
  'subscription_renewal',
  'Renovação próxima - {{nome_sistema}} em {{dias_restantes}} dias',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ffc107 0%, #ff8c00 100%); color: #333; padding: 30px; text-align: center; border-radius: 8px; margin-bottom: 30px; }
    .content { padding: 20px 0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; margin-top: 30px; font-size: 14px; color: #666; }
    .button { display: inline-block; background: #28a745; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
    .renewal-info { background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .payment { background: #d1ecf1; border: 1px solid #b8daff; padding: 20px; border-radius: 8px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔄 Renovação Automática</h1>
    <p>Sua assinatura será renovada em {{dias_restantes}} dias</p>
  </div>
  
  <div class="content">
    <p>Olá <strong>{{nome_usuario}}</strong>,</p>
    
    <p>Este é um lembrete amigável sobre a renovação da sua assinatura do <strong>{{nome_sistema}}</strong>.</p>
    
    <div class="renewal-info">
      <h3>📅 Informações da renovação:</h3>
      <p><strong>Plano atual:</strong> {{nome_plano}}</p>
      <p><strong>Data da renovação:</strong> {{data_vencimento}}</p>
      <p><strong>Valor:</strong> {{valor_plano}}</p>
      <p><strong>Dias restantes:</strong> {{dias_restantes}} dias</p>
    </div>
    
    <div class="payment">
      <h3>💳 Método de pagamento:</h3>
      <p>Sua assinatura será renovada automaticamente usando o método de pagamento cadastrado.</p>
      <p>Você pode atualizar suas informações de pagamento a qualquer momento.</p>
    </div>
    
    <p style="text-align: center;">
      <a href="{{link_pagamento}}" class="button">Gerenciar Assinatura</a>
    </p>
    
    <p><strong>Continue aproveitando:</strong></p>
    <ul>
      <li>Acesso completo a todas as funcionalidades</li>
      <li>Suporte técnico prioritário</li>
      <li>Atualizações e novos recursos</li>
      <li>Segurança e confiabilidade</li>
    </ul>
    
    <p>Obrigado por continuar conosco!</p>
    
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
  'subscription_cancelled',
  'Assinatura cancelada - {{nome_sistema}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #6c757d; color: white; padding: 30px; text-align: center; border-radius: 8px; margin-bottom: 30px; }
    .content { padding: 20px 0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; margin-top: 30px; font-size: 14px; color: #666; }
    .button { display: inline-block; background: #007bff; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
    .cancellation { background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .access-info { background: #d1ecf1; border: 1px solid #b8daff; padding: 20px; border-radius: 8px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>😔 Assinatura Cancelada</h1>
    <p>Sentiremos sua falta no {{nome_sistema}}</p>
  </div>
  
  <div class="content">
    <p>Olá <strong>{{nome_usuario}}</strong>,</p>
    
    <p>Confirmamos o cancelamento da sua assinatura do <strong>{{nome_sistema}}</strong>.</p>
    
    <div class="cancellation">
      <h3>📋 Detalhes do cancelamento:</h3>
      <p><strong>Plano cancelado:</strong> {{nome_plano}}</p>
      <p><strong>Data do cancelamento:</strong> ' || to_char(now(), 'DD/MM/YYYY') || '</p>
      <p><strong>Acesso até:</strong> {{data_vencimento}}</p>
      <p><strong>Status:</strong> Cancelada</p>
    </div>
    
    <div class="access-info">
      <h3>ℹ️ Informações importantes:</h3>
      <p><strong>Seus dados:</strong> Mantidos seguros por 90 dias</p>
      <p><strong>Acesso atual:</strong> Limitado às funcionalidades básicas</p>
      <p><strong>Reativação:</strong> Disponível a qualquer momento</p>
    </div>
    
    <p>Sentimos muito por você ter decidido cancelar. Gostaríamos de saber o que podemos melhorar para servi-lo melhor no futuro.</p>
    
    <p style="text-align: center;">
      <a href="{{link_pagamento}}" class="button">Reativar Assinatura</a>
    </p>
    
    <p><strong>Você sempre pode voltar:</strong></p>
    <ul>
      <li>Seus dados estarão preservados</li>
      <li>Reativação instantânea</li>
      <li>Mesmas funcionalidades premium</li>
      <li>Suporte completo</li>
    </ul>
    
    <p>Obrigado por ter sido parte da família {{nome_sistema}}!</p>
    
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