import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TokenSecurity } from '@/utils/tokenSecurity';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Enhanced session security manager component (must be inside Router context)
export function SessionSecurity() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [sessionData, setSessionData] = useState<{
    deviceFingerprint: string;
    clientIP: string;
    sessionStartTime: number;
  } | null>(null);

  useEffect(() => {
    // Initialize session security data
    const initializeSession = async () => {
      const deviceFingerprint = TokenSecurity.getDeviceFingerprint();
      const clientIP = await TokenSecurity.getClientIP();
      const sessionStartTime = Date.now();
      
      const newSessionData = { deviceFingerprint, clientIP, sessionStartTime };
      setSessionData(newSessionData);
      
      // Store session data for validation
      localStorage.setItem('session_security', JSON.stringify(newSessionData));
    };

    initializeSession();

    // Session validation function
    const validateSession = async () => {
      if (!sessionData) return;

      const currentFingerprint = TokenSecurity.getDeviceFingerprint();
      const currentIP = await TokenSecurity.getClientIP();
      
      // Check for device fingerprint mismatch
      if (currentFingerprint !== sessionData.deviceFingerprint) {
        window.dispatchEvent(new CustomEvent('security-event', {
          detail: { type: 'suspicious_activity', details: 'Device fingerprint mismatch' }
        }));
        return;
      }

      // Check for IP change (warn but don't logout for mobile users)
      if (currentIP !== sessionData.clientIP && currentIP !== 'unknown') {
        toast({
          title: "Mudança de IP Detectada",
          description: "Sua sessão está sendo monitorada por segurança",
          variant: "default"
        });
      }

      // Check for session age (max 24 hours)
      const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours
      if (Date.now() - sessionData.sessionStartTime > maxSessionAge) {
        window.dispatchEvent(new CustomEvent('session-timeout'));
      }
    };

    // Setup enhanced session timeout
    const cleanup = TokenSecurity.setupSessionTimeout(30 * 60 * 1000); // 30 minutes

    // Session validation every 5 minutes
    const validationInterval = setInterval(() => {
      validateSession();
    }, 5 * 60 * 1000);

    // Validate session on focus
    const handleFocus = () => validateSession();
    window.addEventListener('focus', handleFocus);

    // Listen for session timeout events
    const handleSessionTimeout = () => {
      toast({
        title: "Sessão Expirada",
        description: "Por segurança, sua sessão foi encerrada devido à inatividade",
        variant: "destructive"
      });
      
      // Redirect to login using navigate
      setTimeout(() => {
        navigate('/login');
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
          navigate('/login');
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
      clearInterval(validationInterval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('session-timeout', handleSessionTimeout);
      window.removeEventListener('security-event', handleSecurityEvent as EventListener);
    };
  }, [toast, navigate, sessionData]);

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