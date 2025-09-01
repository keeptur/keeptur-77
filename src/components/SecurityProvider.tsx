import { useEffect } from 'react';
import { TokenSecurity } from '@/utils/tokenSecurity';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Set up session timeout handler
    const cleanupTimeout = TokenSecurity.setupSessionTimeout(30 * 60 * 1000); // 30 minutes

    // Listen for session timeout events
    const handleSessionTimeout = () => {
      toast({
        title: "Sessão expirada",
        description: "Sua sessão expirou por inatividade. Faça login novamente.",
        variant: "destructive"
      });
      navigate('/login');
    };

    // Listen for security events
    const handleSecurityEvent = (event: CustomEvent) => {
      console.warn('Security event detected:', event.detail);
      toast({
        title: "Evento de segurança",
        description: "Atividade suspeita detectada. Sessão encerrada por segurança.",
        variant: "destructive"
      });
      TokenSecurity.clearSensitiveData();
      navigate('/login');
    };

    window.addEventListener('session-timeout', handleSessionTimeout);
    window.addEventListener('security-event', handleSecurityEvent as EventListener);

    // Add basic CSRF protection headers
    const originalFetch = window.fetch;
    window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
      const headers = new Headers(init?.headers);
      
      // Add CSRF token for state-changing operations
      if (init?.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(init.method)) {
        headers.set('X-Requested-With', 'XMLHttpRequest');
        
        // Add timestamp to prevent replay attacks
        headers.set('X-Request-Time', Date.now().toString());
      }

      return originalFetch(input, {
        ...init,
        headers
      });
    };

    return () => {
      cleanupTimeout();
      window.removeEventListener('session-timeout', handleSessionTimeout);
      window.removeEventListener('security-event', handleSecurityEvent as EventListener);
      window.fetch = originalFetch;
    };
  }, [navigate, toast]);

  return <>{children}</>;
}