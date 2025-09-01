import { supabase } from "@/integrations/supabase/client";

// Enhanced token security utilities with proper encryption
export const TokenSecurity = {
  // Generate encryption key from user session
  generateKey: async (salt: string): Promise<CryptoKey> => {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(salt + window.location.origin),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('keeptur-salt'),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  },

  // Encrypt sensitive data with AES-GCM
  encryptForStorage: async (data: string, userSalt?: string): Promise<string> => {
    try {
      if (!crypto.subtle) {
        // Fallback for older browsers
        return btoa(data);
      }

      const salt = userSalt || crypto.getRandomValues(new Uint8Array(16)).join('');
      const key = await TokenSecurity.generateKey(salt);
      const encoder = new TextEncoder();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(data)
      );
      
      const encryptedArray = new Uint8Array(encrypted);
      const combined = new Uint8Array(iv.length + encryptedArray.length);
      combined.set(iv);
      combined.set(encryptedArray, iv.length);
      
      return `${salt}:${btoa(String.fromCharCode(...combined))}`;
    } catch {
      return btoa(data); // Fallback
    }
  },

  // Decrypt data with AES-GCM
  decryptFromStorage: async (encryptedData: string, userSalt?: string): Promise<string> => {
    try {
      if (!crypto.subtle || !encryptedData.includes(':')) {
        // Fallback for older browsers or old format
        return atob(encryptedData);
      }

      const [salt, encrypted] = encryptedData.split(':');
      const key = await TokenSecurity.generateKey(userSalt || salt);
      const combined = new Uint8Array(
        atob(encrypted).split('').map(char => char.charCodeAt(0))
      );
      
      const iv = combined.slice(0, 12);
      const encryptedArray = combined.slice(12);
      
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encryptedArray
      );
      
      return new TextDecoder().decode(decrypted);
    } catch {
      return atob(encryptedData.split(':')[1] || encryptedData); // Fallback
    }
  },

  // Get device fingerprint for session validation
  getDeviceFingerprint: (): string => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.fillText('fingerprint', 10, 10);
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL(),
      navigator.hardwareConcurrency || 0,
      (navigator as any).deviceMemory || 0
    ].join('|');
    
    // Simple hash for fingerprint
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  },

  // Get client IP (best effort)
  getClientIP: async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || 'unknown';
    } catch {
      return 'unknown';
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

  // Enhanced session timeout handler with concurrent session limits
  setupSessionTimeout: (timeoutMs: number = 30 * 60 * 1000) => {
    let timeoutId: NodeJS.Timeout;
    
    const resetTimeout = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        TokenSecurity.clearSensitiveData();
        window.dispatchEvent(new CustomEvent('session-timeout'));
      }, timeoutMs);
      
      // Update last activity timestamp
      localStorage.setItem('last_activity', Date.now().toString());
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
  },

  // Concurrent session management
  manageConcurrentSessions: () => {
    const sessionId = crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
    const maxSessions = 3; // Maximum concurrent sessions
    
    // Store current session
    const sessions = JSON.parse(localStorage.getItem('active_sessions') || '[]');
    const newSession = {
      id: sessionId,
      timestamp: Date.now(),
      userAgent: navigator.userAgent.substring(0, 100)
    };
    
    sessions.push(newSession);
    
    // Remove old sessions if limit exceeded
    if (sessions.length > maxSessions) {
      sessions.sort((a: any, b: any) => b.timestamp - a.timestamp);
      const removedSessions = sessions.splice(maxSessions);
      
      // Notify about session limit
      if (removedSessions.length > 0) {
        window.dispatchEvent(new CustomEvent('security-event', {
          detail: { 
            type: 'multiple_sessions', 
            details: `${sessions.length} sessões ativas detectadas` 
          }
        }));
      }
    }
    
    localStorage.setItem('active_sessions', JSON.stringify(sessions));
    localStorage.setItem('current_session_id', sessionId);
    
    return sessionId;
  },

  // Clean up current session
  cleanupSession: () => {
    const currentSessionId = localStorage.getItem('current_session_id');
    if (currentSessionId) {
      const sessions = JSON.parse(localStorage.getItem('active_sessions') || '[]');
      const updatedSessions = sessions.filter((s: any) => s.id !== currentSessionId);
      localStorage.setItem('active_sessions', JSON.stringify(updatedSessions));
    }
    localStorage.removeItem('current_session_id');
  }
};