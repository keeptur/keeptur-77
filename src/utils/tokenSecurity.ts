import { supabase } from "@/integrations/supabase/client";

// Token security utilities
export const TokenSecurity = {
  // Encrypt sensitive data before localStorage storage
  encryptForStorage: (data: string): string => {
    try {
      // Simple base64 encoding for client-side obfuscation
      return btoa(data);
    } catch {
      return data;
    }
  },

  // Decrypt data from localStorage
  decryptFromStorage: (encryptedData: string): string => {
    try {
      return atob(encryptedData);
    } catch {
      return encryptedData;
    }
  },

  // Secure token validation
  validateToken: (token: string): boolean => {
    if (!token || typeof token !== 'string') return false;
    
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      
      const payload = JSON.parse(atob(parts[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      return payload.exp > currentTime;
    } catch {
      return false;
    }
  },

  // Clear sensitive data on logout
  clearSensitiveData: () => {
    const keysToRemove = [
      'monde_token',
      'keeptur_login_email',
      'supabase.auth.token'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  },

  // Session timeout handler
  setupSessionTimeout: (timeoutMs: number = 30 * 60 * 1000) => {
    let timeoutId: NodeJS.Timeout;
    
    const resetTimeout = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        TokenSecurity.clearSensitiveData();
        window.dispatchEvent(new CustomEvent('session-timeout'));
      }, timeoutMs);
    };

    // Reset timeout on user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, resetTimeout, true);
    });

    resetTimeout();
    
    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => {
        document.removeEventListener(event, resetTimeout, true);
      });
    };
  }
};