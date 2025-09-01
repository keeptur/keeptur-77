import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, CheckCircle } from 'lucide-react';

interface AdminSession {
  id: string;
  started_at: string;
  last_activity: string;
  ip_address: string;
  device_info: string;
  is_current: boolean;
}

// Admin security panel component
export function AdminSecurityPanel() {
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [isPasswordProtectionEnabled, setIsPasswordProtectionEnabled] = useState<boolean | null>(null);
  const [managementToken, setManagementToken] = useState("");

  // Check admin status and password protection status
  useEffect(() => {
    const checkStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin');
        
        setIsAdmin(!!roles?.length);
      }
    };

    checkStatus();
  }, []);

  const enablePasswordProtection = async () => {
    if (!isAdmin) return;

    setIsEnabling(true);
    try {
      const { data, error } = await supabase.functions.invoke('enable-password-protection', {
        body: managementToken ? { managementToken } : undefined,
      });
      
      if (error) {
        throw error;
      }

      if (data.success) {
        setIsPasswordProtectionEnabled(true);
        toast({
          title: "Proteção Ativada",
          description: "Proteção contra senhas vazadas foi ativada com sucesso",
        });
      } else {
        throw new Error(data.error || 'Failed to enable password protection');
      }
    } catch (error) {
      console.error('Error enabling password protection:', error);
      toast({
        title: "Erro",
        description: "Falha ao ativar proteção de senhas. Verifique o token de gerenciamento.",
        variant: "destructive"
      });
    } finally {
      setIsEnabling(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="p-6 border rounded-lg bg-card">
      <div className="flex items-center gap-3 mb-4">
        <Shield className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Configurações de Segurança</h3>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-md">
          <div className="flex-1">
            <h4 className="font-medium">Proteção contra Senhas Vazadas</h4>
            <p className="text-sm text-muted-foreground">
              Impede que usuários usem senhas comprometidas em vazamentos de dados
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              {isPasswordProtectionEnabled === true && (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Ativo</span>
                </div>
              )}

              <Input
                placeholder="Token de gerenciamento (PAT) — opcional"
                value={managementToken}
                onChange={(e) => setManagementToken(e.target.value)}
                className="w-64"
              />
              
              <Button
                onClick={enablePasswordProtection}
                disabled={isEnabling || isPasswordProtectionEnabled === true}
                variant={isPasswordProtectionEnabled === true ? "outline" : "default"}
                size="sm"
              >
                {isEnabling ? "Ativando..." : 
                 isPasswordProtectionEnabled === true ? "Ativado" : "Ativar"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced admin security monitoring (background component)
export function AdminSecurity() {
  const { toast } = useToast();
  const [activeSessions, setActiveSessions] = useState<AdminSession[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if user is admin
    const checkAdminStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin');
        
        setIsAdmin(!!roles?.length);
      }
    };

    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    // Monitor admin activity every 30 seconds
    const monitorActivity = async () => {
      try {
        // Record current admin activity
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const deviceInfo = navigator.userAgent;
          const currentIP = await getCurrentIP();
          
          // This would typically be stored in a sessions table
          // For now, we'll use localStorage for demo purposes
          const sessionKey = `admin_session_${user.id}`;
          const sessionData = {
            id: user.id,
            started_at: new Date().toISOString(),
            last_activity: new Date().toISOString(),
            ip_address: currentIP,
            device_info: deviceInfo,
            is_current: true
          };
          
          localStorage.setItem(sessionKey, JSON.stringify(sessionData));
        }
      } catch (error) {
        console.warn('Admin monitoring error:', error);
      }
    };

    // Check for suspicious admin activity
    const checkSuspiciousActivity = () => {
      const failedAttempts = parseInt(localStorage.getItem('admin_failed_attempts') || '0');
      const lastFailedAttempt = localStorage.getItem('admin_last_failed_attempt');
      
      if (failedAttempts >= 3 && lastFailedAttempt) {
        const timeSinceLastAttempt = Date.now() - parseInt(lastFailedAttempt);
        const lockoutPeriod = 15 * 60 * 1000; // 15 minutes
        
        if (timeSinceLastAttempt < lockoutPeriod) {
          toast({
            title: "Conta Temporariamente Bloqueada",
            description: "Muitas tentativas de acesso falharam. Tente novamente em alguns minutos.",
            variant: "destructive"
          });
        }
      }
    };

    // Monitor admin session every 30 seconds
    const activityInterval = setInterval(monitorActivity, 30000);
    
    // Check for suspicious activity every minute
    const securityInterval = setInterval(checkSuspiciousActivity, 60000);

    // Initial monitoring
    monitorActivity();
    checkSuspiciousActivity();

    return () => {
      clearInterval(activityInterval);
      clearInterval(securityInterval);
    };
  }, [isAdmin, toast]);

  // Helper function to get current IP
  const getCurrentIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || 'unknown';
    } catch {
      return 'unknown';
    }
  };

  // Admin security event handlers
  useEffect(() => {
    if (!isAdmin) return;

    const handleAdminSecurityEvent = (event: CustomEvent) => {
      const { type, details } = event.detail;
      
      switch (type) {
        case 'failed_admin_login':
          const currentFailedAttempts = parseInt(localStorage.getItem('admin_failed_attempts') || '0') + 1;
          localStorage.setItem('admin_failed_attempts', currentFailedAttempts.toString());
          localStorage.setItem('admin_last_failed_attempt', Date.now().toString());
          
          if (currentFailedAttempts >= 3) {
            toast({
              title: "Tentativas de Login Suspeitas",
              description: "Múltiplas tentativas de login de admin falharam",
              variant: "destructive"
            });
          }
          break;
          
        case 'successful_admin_login':
          // Reset failed attempts on successful login
          localStorage.removeItem('admin_failed_attempts');
          localStorage.removeItem('admin_last_failed_attempt');
          
          toast({
            title: "Login de Admin Detectado",
            description: "Acesso administrativo realizado com sucesso",
            variant: "default"
          });
          break;
          
        case 'admin_permission_escalation':
          toast({
            title: "Escalação de Privilégios Detectada",
            description: "Alteração de permissões administrativas detectada",
            variant: "destructive"
          });
          break;
      }
    };

    window.addEventListener('admin-security-event', handleAdminSecurityEvent as EventListener);

    return () => {
      window.removeEventListener('admin-security-event', handleAdminSecurityEvent as EventListener);
    };
  }, [isAdmin, toast]);

  return null; // This component doesn't render anything
}

// Admin security utilities
export const AdminSecurityUtils = {
  // Log admin action for audit trail
  logAdminAction: async (action: string, targetTable?: string, targetId?: string, details?: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user is admin
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin');
      
      if (!roles?.length) return;

      // Log to admin audit log (assuming this function exists)
      await supabase.rpc('log_admin_action', {
        action_type: action,
        table_name: targetTable,
        record_id: targetId,
        new_data: details
      });
      
    } catch (error) {
      console.warn('Failed to log admin action:', error);
    }
  },

  // Validate admin session
  validateAdminSession: async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin');
      
      return !!roles?.length;
    } catch {
      return false;
    }
  },

  // Check if admin action requires additional verification
  requiresAdditionalVerification: (action: string): boolean => {
    const sensitiveActions = [
      'delete_user',
      'change_user_role',
      'export_data',
      'modify_billing',
      'system_settings'
    ];
    
    return sensitiveActions.includes(action);
  }
};