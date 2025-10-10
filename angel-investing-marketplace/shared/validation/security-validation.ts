import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// Input sanitization schemas
export const sanitizedStringSchema = z.string().transform((val) => {
  if (typeof val !== 'string') return val;

  return val
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+=/gi, '') // Remove event handlers
    .slice(0, 1000); // Limit length
});

export const sanitizedHtmlSchema = z.string().transform((val) => {
  if (typeof val !== 'string') return val;

  // Use DOMPurify for HTML sanitization
  const sanitized = DOMPurify.sanitize(val, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: [],
  });

  return sanitized.slice(0, 50000); // Limit length for HTML content
});

export const sanitizedEmailSchema = z.string().transform((val) => {
  if (typeof val !== 'string') return val;

  return val
    .toLowerCase()
    .trim()
    .replace(/[<>\s]/g, ''); // Remove spaces, angle brackets
});

// Security validation schemas
export const securePasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password cannot exceed 128 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
  .refine(password => !/\s/.test(password), 'Password cannot contain spaces')
  .refine(password => {
    // Check against common passwords
    const commonPasswords = [
      'password', 'password123', '123456', '123456789', 'qwerty',
      'abc123', 'password1', 'admin', 'letmein', 'welcome',
      'monkey', 'dragon', 'password12', 'password123!', 'Password1'
    ];
    return !commonPasswords.includes(password.toLowerCase());
  }, 'Password is too common, please choose a stronger password')
  .refine(password => {
    // Check for patterns
    const hasRepeatingChars = /(.)\1{2,}/.test(password); // 3+ repeating characters
    const hasSequential = /(?:012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(password);
    return !hasRepeatingChars && !hasSequential;
  }, 'Password contains predictable patterns');

export const secureFileNameSchema = z.string().refine((fileName) => {
  // Check for malicious file names
  const dangerousPatterns = [
    /\.\./, // Directory traversal
    /^[.-]/, // Hidden files or files starting with dash/period
    /[<>:"/\\|?*]/, // Invalid characters for file systems
    /\.(exe|bat|cmd|com|scr|pif|jar|js|jse|vbs|vbe|wsf|wsh|ps1|py|rb|pl|sh)$/i, // Dangerous extensions
  ];

  return !dangerousPatterns.some(pattern => pattern.test(fileName));
}, 'Invalid or potentially dangerous file name');

// SQL injection prevention
export const sqlInjectionSafeSchema = z.string().refine((value) => {
  const sqlPatterns = [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/i,
    /(--|#|\/\*|\*\/)/,
    /(\bor\b\s+\d+\s*=\s*\d+)/i,
    /(\band\b\s+\d+\s*=\s*\d+)/i,
    /('|(\\')|(;)|(\|\|)/,
  ];

  return !sqlPatterns.some(pattern => pattern.test(value));
}, 'Input contains potentially dangerous SQL patterns');

// XSS prevention
export const xssSafeSchema = z.string().refine((value) => {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
    /<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi,
    /<meta\b[^<]*(?:(?!<\/meta>)<[^<]*)*<\/meta>/gi,
  ];

  return !xssPatterns.some(pattern => pattern.test(value));
}, 'Input contains potentially dangerous script patterns');

// File upload security validation
export const secureFileUploadSchema = z.object({
  file: z.instanceof(File)
    .refine((file) => file.size <= 50 * 1024 * 1024, 'File size must be less than 50MB')
    .refine((file) => file.size >= 1024, 'File size must be at least 1KB')
    .refine((file) => {
      const allowedTypes = [
        'application/pdf',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'text/plain',
      ];
      return allowedTypes.includes(file.type);
    }, 'File type not allowed')
    .refine((file) => {
      // Check file extension matches MIME type
      const extension = file.name.split('.').pop()?.toLowerCase();
      const mimeToExtension: Record<string, string[]> = {
        'application/pdf': ['pdf'],
        'application/vnd.ms-powerpoint': ['ppt'],
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx'],
        'application/vnd.ms-excel': ['xls'],
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
        'application/msword': ['doc'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
        'image/jpeg': ['jpg', 'jpeg'],
        'image/png': ['png'],
        'image/gif': ['gif'],
        'image/webp': ['webp'],
        'text/plain': ['txt'],
      };

      const expectedExtensions = mimeToExtension[file.type];
      return expectedExtensions?.includes(extension || '') || false;
    }, 'File extension does not match file type'),
});

// URL security validation
export const secureUrlSchema = z.string().refine((url) => {
  try {
    const parsedUrl = new URL(url);

    // Only allow HTTP and HTTPS
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return false;
    }

    // Block localhost and private IPs in production
    if (process.env.NODE_ENV === 'production') {
      const hostname = parsedUrl.hostname.toLowerCase();
      const privatePatterns = [
        /^localhost$/,
        /^127\./,
        /^10\./,
        /^192\.168\./,
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
        /^\[::1\]$/,
        /^::1$/,
      ];

      if (privatePatterns.some(pattern => pattern.test(hostname))) {
        return false;
      }
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /file:/i,
    ];

    return !suspiciousPatterns.some(pattern => pattern.test(url));
  } catch {
    return false;
  }
}, 'Invalid or potentially dangerous URL');

// Content Security Policy validation
export const cspSafeContentSchema = z.string().refine((content) => {
  // Remove potentially dangerous CSP directives
  const dangerousDirectives = [
    'unsafe-inline',
    'unsafe-eval',
    'unsafe-hashes',
  ];

  return !dangerousDirectives.some(directive =>
    content.toLowerCase().includes(directive)
  );
}, 'Content contains unsafe CSP directives');

// Rate limiting validation
export const rateLimitValidationSchema = z.object({
  identifier: z.string().min(1, 'Identifier is required'),
  action: z.string().min(1, 'Action is required'),
  maxRequests: z.number().min(1, 'Max requests must be positive'),
  windowMs: z.number().min(1000, 'Window must be at least 1 second'),
}).refine((data) => {
  // Validate rate limit parameters make sense
  const requestsPerSecond = data.maxRequests / (data.windowMs / 1000);
  return requestsPerSecond <= 1000; // Max 1000 requests per second
}, 'Rate limit parameters are unrealistic');

// Session security validation
export const secureSessionSchema = z.object({
  userId: z.string().uuid(),
  sessionId: z.string().min(32, 'Session ID too short'),
  ipAddress: z.string().regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, 'Invalid IP address'),
  userAgent: z.string().max(500, 'User agent too long'),
  expiresAt: z.date(),
}).refine((data) => {
  // Session shouldn't be valid for more than 30 days
  const maxSessionDuration = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
  const sessionDuration = data.expiresAt.getTime() - Date.now();
  return sessionDuration <= maxSessionDuration;
}, 'Session duration is too long');

// API key validation
export const apiKeySchema = z.string().refine((key) => {
  // API keys should follow a specific pattern
  return /^[a-zA-Z0-9_-]{32,128}$/.test(key);
}, 'Invalid API key format');

// Webhook signature validation
export const webhookSignatureSchema = z.string().refine((signature) => {
  // HMAC signatures should be hex strings of specific length
  return /^[a-f0-9]{64}$/i.test(signature);
}, 'Invalid webhook signature format');

// Encrypted data validation
export const encryptedDataSchema = z.string().refine((data) => {
  // Basic check for encrypted data format (base64-like with specific patterns)
  return /^[A-Za-z0-9+/]*={0,2}$/.test(data) && data.length >= 16;
}, 'Invalid encrypted data format');

// Audit log validation
export const auditLogSchema = z.object({
  userId: z.string().uuid(),
  action: z.string().min(1, 'Action is required'),
  resource: z.string().min(1, 'Resource is required'),
  resourceId: z.string().min(1, 'Resource ID is required'),
  oldValues: z.record(z.any()).optional(),
  newValues: z.record(z.any()).optional(),
  ipAddress: z.string().regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, 'Invalid IP address'),
  userAgent: z.string().max(500, 'User agent too long'),
  timestamp: z.date(),
}).refine((data) => {
  // Ensure audit log is not for future events
  return data.timestamp <= new Date();
}, 'Audit log timestamp cannot be in the future');

// Type exports
export type SanitizedStringInput = z.infer<typeof sanitizedStringSchema>;
export type SanitizedHtmlInput = z.infer<typeof sanitizedHtmlSchema>;
export type SanitizedEmailInput = z.infer<typeof sanitizedEmailSchema>;
export type SecurePasswordInput = z.infer<typeof securePasswordSchema>;
export type SecureFileNameInput = z.infer<typeof secureFileNameSchema>;
export type SecureFileUploadInput = z.infer<typeof secureFileUploadSchema>;
export type SecureUrlInput = z.infer<typeof secureUrlSchema>;
export type RateLimitValidationInput = z.infer<typeof rateLimitValidationSchema>;
export type SecureSessionInput = z.infer<typeof secureSessionSchema>;
export type ApiKeyInput = z.infer<typeof apiKeySchema>;
export type WebhookSignatureInput = z.infer<typeof webhookSignatureSchema>;
export type EncryptedDataInput = z.infer<typeof encryptedDataSchema>;
export type AuditLogInput = z.infer<typeof auditLogSchema>;

// Export all security schemas
export default {
  sanitizedString: sanitizedStringSchema,
  sanitizedHtml: sanitizedHtmlSchema,
  sanitizedEmail: sanitizedEmailSchema,
  securePassword: securePasswordSchema,
  secureFileName: secureFileNameSchema,
  sqlInjectionSafe: sqlInjectionSafeSchema,
  xssSafe: xssSafeSchema,
  secureFileUpload: secureFileUploadSchema,
  secureUrl: secureUrlSchema,
  cspSafeContent: cspSafeContentSchema,
  rateLimitValidation: rateLimitValidationSchema,
  secureSession: secureSessionSchema,
  apiKey: apiKeySchema,
  webhookSignature: webhookSignatureSchema,
  encryptedData: encryptedDataSchema,
  auditLog: auditLogSchema,
};