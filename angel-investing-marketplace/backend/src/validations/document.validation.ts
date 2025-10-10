import { z } from 'zod';

// Base schemas
export const documentIdSchema = z.string().min(1, 'Document ID is required');
export const pitchIdSchema = z.string().min(1, 'Pitch ID is required');
export const startupIdSchema = z.string().min(1, 'Startup ID is required');
export const investmentIdSchema = z.string().min(1, 'Investment ID is required');

// Document type enum
export const documentTypeSchema = z.enum([
  // Pitch documents
  'PITCH_DECK',
  'BUSINESS_PLAN',
  'FINANCIAL_PROJECTIONS',
  'MARKET_RESEARCH',
  'COMPETITIVE_ANALYSIS',
  'PRODUCT_DEMO',
  'TECHNICAL_SPECIFICATIONS',

  // Legal documents
  'TERM_SHEET',
  'INVESTMENT_AGREEMENT',
  'SHAREHOLDERS_AGREEMENT',
  'INCORPORATION_CERTIFICATE',
  'BUSINESS_LICENSE',
  'TAX_DOCUMENTS',
  'LEGAL_OPINION',

  // Financial documents
  'FINANCIAL_STATEMENTS',
  'TAX_RETURNS',
  'AUDIT_REPORTS',
  'VALUATION_REPORT',
  'DUE_DILIGENCE_REPORT',

  // KYC documents
  'PASSPORT',
  'DRIVERS_LICENSE',
  'NATIONAL_ID',
  'UTILITY_BILL',
  'BANK_STATEMENT',

  // Investment documents
  'SUBSCRIPTION_AGREEMENT',
  'SHARE_CERTIFICATE',
  'CAPITALIZATION_TABLE',
  'EXIT_AGREEMENT',
  'SALE_CONFIRMATION',

  // Other
  'OTHER'
]);

// Document visibility enum
export const documentVisibilitySchema = z.enum([
  'PRIVATE',
  'INVESTORS_ONLY',
  'PUBLIC'
]);

// Upload document schema
export const uploadDocumentSchema = z.object({
  fileName: z.string().min(1, 'File name is required').max(200, 'File name must be less than 200 characters'),
  fileSize: z.number().min(1, 'File size must be positive').max(104857600, 'File size cannot exceed 100MB'), // 100MB limit
  mimeType: z.string().min(1, 'MIME type is required'),
  documentType: documentTypeSchema,
  visibility: documentVisibilitySchema.default('PRIVATE'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  tags: z.array(z.string().max(50, 'Tag must be less than 50 characters')).max(20, 'Maximum 20 tags allowed').optional(),
  relatedEntity: z.object({
    type: z.enum(['PITCH', 'STARTUP', 'INVESTMENT', 'USER']),
    id: z.string().min(1, 'Related entity ID is required'),
  }),
  isPublic: z.boolean().default(false),
  requiresSignature: z.boolean().default(false),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
});

// Update document schema
export const updateDocumentSchema = z.object({
  fileName: z.string().min(1, 'File name is required').max(200, 'File name must be less than 200 characters').optional(),
  documentType: documentTypeSchema.optional(),
  visibility: documentVisibilitySchema.optional(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  tags: z.array(z.string().max(50, 'Tag must be less than 50 characters')).max(20, 'Maximum 20 tags allowed').optional(),
  isPublic: z.boolean().optional(),
  requiresSignature: z.boolean().optional(),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
});

// Document access schema
export const documentAccessSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  permission: z.enum(['VIEW', 'DOWNLOAD', 'EDIT', 'DELETE']),
  grantedBy: z.string().min(1, 'Granted by user ID is required'),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

// Document list query schema
export const documentListQuerySchema = z.object({
  documentType: documentTypeSchema.optional(),
  visibility: documentVisibilitySchema.optional(),
  relatedEntity: z.object({
    type: z.enum(['PITCH', 'STARTUP', 'INVESTMENT', 'USER']),
    id: z.string().min(1, 'Related entity ID is required'),
  }).optional(),
  uploaderId: z.string().optional(),
  isPublic: z.boolean().optional(),
  requiresSignature: z.boolean().optional(),
  hasExpiry: z.boolean().optional(),
  search: z.string().max(100, 'Search term too long').optional(),
  tags: z.array(z.string()).optional(),
  uploadedAfter: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  uploadedBefore: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  page: z.number().min(1, 'Page must be positive').default(1),
  limit: z.number().min(1, 'Limit must be positive').max(100, 'Limit cannot exceed 100').default(20),
  sortBy: z.enum(['uploadedAt', 'fileName', 'fileSize', 'documentType', 'downloadCount']).default('uploadedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Document version schema
export const documentVersionSchema = z.object({
  version: z.string().min(1, 'Version is required').max(50, 'Version must be less than 50 characters'),
  changelog: z.string().max(1000, 'Changelog must be less than 1000 characters').optional(),
  isMajorVersion: z.boolean().default(false),
});

// Bulk document operation schema
export const bulkDocumentOperationSchema = z.object({
  documentIds: z.array(documentIdSchema).min(1, 'At least one document ID is required'),
  operation: z.enum(['DELETE', 'UPDATE_VISIBILITY', 'ADD_TAGS', 'REMOVE_TAGS']),
  visibility: documentVisibilitySchema.optional(),
  tagsToAdd: z.array(z.string().max(50, 'Tag must be less than 50 characters')).optional(),
  tagsToRemove: z.array(z.string().max(50, 'Tag must be less than 50 characters')).optional(),
});

// Document download tracking schema
export const documentDownloadSchema = z.object({
  userAgent: z.string().max(500, 'User agent must be less than 500 characters').optional(),
  ipAddress: z.string().max(45, 'IP address must be less than 45 characters').optional(),
  referrer: z.string().max(500, 'Referrer must be less than 500 characters').optional(),
  downloadReason: z.enum(['VIEW', 'PRINT', 'SAVE', 'SHARE']).optional(),
});

// Document signature schema
export const documentSignatureSchema = z.object({
  signatureData: z.string().min(1, 'Signature data is required'),
  signatureType: z.enum(['ELECTRONIC', 'DIGITAL']),
  signerName: z.string().min(1, 'Signer name is required').max(100, 'Signer name must be less than 100 characters'),
  signerTitle: z.string().max(100, 'Signer title must be less than 100 characters').optional(),
  signatureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  ipAddress: z.string().max(45, 'IP address must be less than 45 characters').optional(),
  location: z.string().max(100, 'Location must be less than 100 characters').optional(),
});

// Document sharing schema
export const documentSharingSchema = z.object({
  shareWith: z.array(z.object({
    userId: z.string().min(1, 'User ID is required'),
    permission: z.enum(['VIEW', 'DOWNLOAD']),
  })).min(1, 'At least one user must be specified'),
  message: z.string().max(1000, 'Message must be less than 1000 characters').optional(),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  requireAcceptance: z.boolean().default(false),
});

// Document template schema
export const documentTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  documentType: documentTypeSchema,
  category: z.enum(['PITCH', 'LEGAL', 'FINANCIAL', 'KYC', 'INVESTMENT', 'OTHER']),
  fileUrl: z.string().url('Invalid template file URL'),
  fields: z.array(z.object({
    fieldName: z.string().min(1, 'Field name is required'),
    fieldType: z.enum(['TEXT', 'NUMBER', 'DATE', 'SELECT', 'MULTISELECT', 'BOOLEAN']),
    label: z.string().min(1, 'Field label is required'),
    required: z.boolean().default(false),
    options: z.array(z.string()).optional(), // For select fields
    placeholder: z.string().max(200, 'Placeholder must be less than 200 characters').optional(),
  })).max(50, 'Maximum 50 fields allowed'),
  isPublic: z.boolean().default(false),
});

// Generate document from template schema
export const generateDocumentFromTemplateSchema = z.object({
  templateId: z.string().min(1, 'Template ID is required'),
  fieldValues: z.record(z.string(), z.any()), // Field name -> value mapping
  outputFileName: z.string().min(1, 'Output file name is required').max(200, 'File name must be less than 200 characters'),
  format: z.enum(['PDF', 'DOCX', 'HTML']).default('PDF'),
});

// Type exports
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type DocumentAccessInput = z.infer<typeof documentAccessSchema>;
export type DocumentListQueryInput = z.infer<typeof documentListQuerySchema>;
export type DocumentVersionInput = z.infer<typeof documentVersionSchema>;
export type BulkDocumentOperationInput = z.infer<typeof bulkDocumentOperationSchema>;
export type DocumentDownloadInput = z.infer<typeof documentDownloadSchema>;
export type DocumentSignatureInput = z.infer<typeof documentSignatureSchema>;
export type DocumentSharingInput = z.infer<typeof documentSharingSchema>;
export type DocumentTemplateInput = z.infer<typeof documentTemplateSchema>;
export type GenerateDocumentFromTemplateInput = z.infer<typeof generateDocumentFromTemplateSchema>;

export default {
  uploadDocument: uploadDocumentSchema,
  updateDocument: updateDocumentSchema,
  documentAccess: documentAccessSchema,
  documentListQuery: documentListQuerySchema,
  documentVersion: documentVersionSchema,
  bulkDocumentOperation: bulkDocumentOperationSchema,
  documentDownload: documentDownloadSchema,
  documentSignature: documentSignatureSchema,
  documentSharing: documentSharingSchema,
  documentTemplate: documentTemplateSchema,
  generateDocumentFromTemplate: generateDocumentFromTemplateSchema,
};