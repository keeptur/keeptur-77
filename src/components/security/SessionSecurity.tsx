import { useEffect } from 'react';
import { TokenSecurity } from '@/utils/tokenSecurity';
import { useToast } from '@/hooks/use-toast';

// Session security manager component
export function SessionSecurity() {
  const { toast } = useToast();

  useEffect(() => {
    // Setup session timeout
    const cleanup = TokenSecurity.setupSessionTimeout(30 * 60 * 1000); // 30 minutes

    // Listen for session timeout events
    const handleSessionTimeout = () => {
      toast({
        title: "Sessão Expirada",
        description: "Por segurança, sua sessão foi encerrada devido à inatividade",
        variant: "destructive"
      });
      
      // Redirect to login
      setTimeout(() => {
        window.location.href = '/login';
      }, 3000);
    };

    // Listen for security events
    const handleSecurityEvent = (event: CustomEvent) => {
      const { type, details } = event.detail;
      
      switch (type) {
        case 'suspicious_activity':
          toast({
            title: "Atividade Suspeita Detectada",
            description: "Por segurança, faça login novamente",
            variant: "destructive"
          });
          TokenSecurity.clearSensitiveData();
          window.location.href = '/login';
          break;
          
        case 'multiple_sessions':
          toast({
            title: "Múltiplas Sessões Detectadas",
            description: "Sua conta está sendo usada em outro local",
            variant: "destructive"
          });
          break;
      }
    };

    window.addEventListener('session-timeout', handleSessionTimeout);
    window.addEventListener('security-event', handleSecurityEvent as EventListener);

    return () => {
      cleanup();
      window.removeEventListener('session-timeout', handleSessionTimeout);
      window.removeEventListener('security-event', handleSecurityEvent as EventListener);
    };
  }, [toast]);

  return null; // This component doesn't render anything
}

// CSP (Content Security Policy) utilities
export const CSPHeaders = {
  // Generate secure CSP header
  generateCSP: () => {
    const policies = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://lquuoriatdcspbcvgsbg.supabase.co https://web.monde.com.br",
      "frame-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ];
    
    return policies.join('; ');
  },

  // Apply CSP via meta tag
  applyCSP: () => {
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = CSPHeaders.generateCSP();
    document.head.appendChild(meta);
  }
};