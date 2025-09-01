import DOMPurify from 'dompurify';

// Input validation and sanitization utilities
export const InputValidation = {
  // Email validation with enhanced security
  validateEmail: (email: string): { isValid: boolean; error?: string } => {
    if (!email || typeof email !== 'string') {
      return { isValid: false, error: 'Email é obrigatório' };
    }

    // Sanitize input
    const sanitizedEmail = DOMPurify.sanitize(email.trim(), { ALLOWED_TAGS: [] });
    
    // Check for suspicious patterns
    if (sanitizedEmail !== email.trim()) {
      return { isValid: false, error: 'Email contém caracteres inválidos' };
    }

    // Enhanced email regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(sanitizedEmail)) {
      return { isValid: false, error: 'Formato de email inválido' };
    }

    // Check for length limits
    if (sanitizedEmail.length > 254) {
      return { isValid: false, error: 'Email muito longo' };
    }

    return { isValid: true };
  },

  // Password strength validation
  validatePassword: (password: string): { isValid: boolean; error?: string; strength: number } => {
    if (!password || typeof password !== 'string') {
      return { isValid: false, error: 'Senha é obrigatória', strength: 0 };
    }

    let strength = 0;
    const checks = [
      { test: /.{8,}/, points: 1 }, // At least 8 characters
      { test: /[a-z]/, points: 1 }, // Lowercase letter
      { test: /[A-Z]/, points: 1 }, // Uppercase letter
      { test: /[0-9]/, points: 1 }, // Number
      { test: /[^A-Za-z0-9]/, points: 1 }, // Special character
      { test: /.{12,}/, points: 1 } // Bonus for 12+ characters
    ];

    checks.forEach(check => {
      if (check.test.test(password)) {
        strength += check.points;
      }
    });

    if (strength < 3) {
      return { 
        isValid: false, 
        error: 'Senha deve ter ao menos 8 caracteres, incluindo letras, números e símbolos',
        strength 
      };
    }

    return { isValid: true, strength };
  },

  // Sanitize text input
  sanitizeText: (input: string, options: { maxLength?: number; allowHtml?: boolean } = {}): string => {
    if (!input || typeof input !== 'string') return '';

    const { maxLength = 1000, allowHtml = false } = options;
    
    let sanitized = allowHtml 
      ? DOMPurify.sanitize(input, { 
          ALLOWED_TAGS: ['p', 'br', 'strong', 'em'], 
          ALLOWED_ATTR: [] 
        })
      : DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });

    return sanitized.slice(0, maxLength);
  },

  // Validate role changes (admin operations)
  validateRoleChange: (currentUserRole: string, targetRole: string): { isValid: boolean; error?: string } => {
    const allowedRoles = ['user', 'admin'];
    
    if (!allowedRoles.includes(targetRole)) {
      return { isValid: false, error: 'Função inválida' };
    }

    // Only admins can change roles
    if (currentUserRole !== 'admin') {
      return { isValid: false, error: 'Permissão insuficiente para alterar funções' };
    }

    return { isValid: true };
  },

  // Check for SQL injection patterns
  checkSQLInjection: (input: string): boolean => {
    const sqlPatterns = [
      /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bDELETE\b|\bDROP\b|\bUPDATE\b)/i,
      /(-{2,}|\/\*|\*\/)/,
      /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/i,
      /['";].*['"]/
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }
};