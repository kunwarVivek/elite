import { z } from 'zod';

/**
 * Social Card Validation Schemas
 * FR-4.2: Social Card Generation for company updates
 */

// Template type enum - FR-4.2.2: Multiple card templates
export const socialCardTemplateTypeSchema = z.enum([
  'MILESTONE',     // Achievement/milestone cards
  'GROWTH',        // Growth metrics cards (users, revenue, etc.)
  'FUNDING',       // Funding announcement cards
  'PRODUCT',       // Product launch cards
  'TEAM',          // Team update cards
  'GENERAL',       // Generic update cards
]);

// Social platform enum - FR-4.2.4: One-click sharing to social platforms
export const socialPlatformSchema = z.enum([
  'TWITTER',
  'LINKEDIN',
  'FACEBOOK',
  'INSTAGRAM',
  'WHATSAPP',
]);

// Card size enum for different platforms
export const cardSizeSchema = z.enum([
  'TWITTER',        // 1200x630
  'INSTAGRAM',      // 1200x1200
  'LINKEDIN',       // 1200x627
  'FACEBOOK',       // 1200x630
  'CUSTOM',         // Custom dimensions
]);

// Language enum - FR-4.2.6: Generate cards in multiple languages
export const cardLanguageSchema = z.enum([
  'en',    // English
  'es',    // Spanish
  'fr',    // French
  'de',    // German
  'it',    // Italian
  'pt',    // Portuguese
  'zh',    // Chinese
  'ja',    // Japanese
  'ko',    // Korean
  'ar',    // Arabic (RTL)
  'he',    // Hebrew (RTL)
]);

// Card customization schema - FR-4.2.3: Custom branding
export const cardCustomizationSchema = z.object({
  // Brand colors
  primaryColor: z.string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color')
    .optional(),
  secondaryColor: z.string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color')
    .optional(),
  backgroundColor: z.string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color')
    .optional(),
  textColor: z.string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color')
    .optional(),

  // Typography
  fontFamily: z.enum([
    'Inter',
    'Roboto',
    'Open Sans',
    'Montserrat',
    'Poppins',
    'Lato',
    'Arial',
    'Helvetica',
  ]).optional(),
  fontSize: z.enum(['small', 'medium', 'large']).optional(),

  // Layout
  layout: z.enum(['centered', 'left', 'right', 'split']).optional(),

  // Logo
  logoUrl: z.string().url().optional(),
  logoPosition: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center']).optional(),
  showLogo: z.boolean().optional(),

  // Background
  backgroundImage: z.string().url().optional(),
  useGradient: z.boolean().optional(),
  gradientDirection: z.enum(['horizontal', 'vertical', 'diagonal']).optional(),
});

// Growth metrics schema for growth cards
export const growthMetricsSchema = z.object({
  metricName: z.string().min(1).max(50),
  currentValue: z.number(),
  previousValue: z.number().optional(),
  unit: z.string().max(20).optional(),  // %, $, users, etc.
  trend: z.enum(['up', 'down', 'neutral']).optional(),
  changePercentage: z.number().optional(),
});

// Generate social card schema - FR-4.2.1: Auto-generate cards from update content
export const generateSocialCardSchema = z.object({
  body: z.object({
    updateId: z.string().min(1, 'Update ID is required'),
    template: socialCardTemplateTypeSchema.optional(),
    size: cardSizeSchema.default('TWITTER'),
    language: cardLanguageSchema.default('en'),
    customization: cardCustomizationSchema.optional(),

    // For growth cards - specific metrics
    metrics: z.array(growthMetricsSchema).max(4, 'Maximum 4 metrics allowed').optional(),

    // Custom text overrides
    titleOverride: z.string().max(100, 'Title must be less than 100 characters').optional(),
    contentOverride: z.string().max(200, 'Content must be less than 200 characters').optional(),

    // Advanced options
    includeCompanyName: z.boolean().default(true),
    includeDate: z.boolean().default(true),
    includeCTA: z.boolean().default(false),
    ctaText: z.string().max(30, 'CTA text must be less than 30 characters').optional(),

    // Image generation options
    format: z.enum(['PNG', 'JPEG', 'WEBP']).default('PNG'),
    quality: z.number().min(1).max(100).default(90),
  }),
});

// Preview social card schema
export const previewSocialCardSchema = z.object({
  body: z.object({
    template: socialCardTemplateTypeSchema,
    size: cardSizeSchema.default('TWITTER'),
    language: cardLanguageSchema.default('en'),
    customization: cardCustomizationSchema.optional(),

    // Preview content
    title: z.string().min(1).max(100),
    content: z.string().min(1).max(200),
    companyName: z.string().min(1).max(50),
    logoUrl: z.string().url().optional(),
    metrics: z.array(growthMetricsSchema).max(4).optional(),
  }),
});

// Custom template creation schema
export const createCustomTemplateSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(50),
    description: z.string().max(200).optional(),
    baseTemplate: socialCardTemplateTypeSchema,
    customization: cardCustomizationSchema.required(),
    isDefault: z.boolean().default(false),
    isPublic: z.boolean().default(false),
  }),
});

// Update template schema
export const updateTemplateSchema = z.object({
  params: z.object({
    templateId: z.string().min(1, 'Template ID is required'),
  }),
  body: z.object({
    name: z.string().min(1).max(50).optional(),
    description: z.string().max(200).optional(),
    customization: cardCustomizationSchema.optional(),
    isDefault: z.boolean().optional(),
    isPublic: z.boolean().optional(),
  }),
});

// Track social share schema - FR-4.2.5: Track social engagement metrics
export const trackSocialShareSchema = z.object({
  body: z.object({
    updateId: z.string().min(1, 'Update ID is required'),
    platform: socialPlatformSchema,
    shareUrl: z.string().url().optional(),
    metadata: z.record(z.any()).optional(),
  }),
});

// Get share stats schema
export const getShareStatsSchema = z.object({
  params: z.object({
    updateId: z.string().min(1, 'Update ID is required'),
  }),
  query: z.object({
    platform: socialPlatformSchema.optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  }).optional(),
});

// Get templates schema
export const getTemplatesSchema = z.object({
  query: z.object({
    type: socialCardTemplateTypeSchema.optional(),
    isPublic: z.boolean().optional(),
    limit: z.number().min(1).max(100).default(20),
    offset: z.number().min(0).default(0),
  }).optional(),
});

// Delete template schema
export const deleteTemplateSchema = z.object({
  params: z.object({
    templateId: z.string().min(1, 'Template ID is required'),
  }),
});

// Get social card schema
export const getSocialCardSchema = z.object({
  params: z.object({
    updateId: z.string().min(1, 'Update ID is required'),
  }),
  query: z.object({
    size: cardSizeSchema.optional(),
    language: cardLanguageSchema.optional(),
  }).optional(),
});

// Regenerate social card schema
export const regenerateSocialCardSchema = z.object({
  params: z.object({
    updateId: z.string().min(1, 'Update ID is required'),
  }),
  body: z.object({
    template: socialCardTemplateTypeSchema.optional(),
    size: cardSizeSchema.optional(),
    language: cardLanguageSchema.optional(),
    customization: cardCustomizationSchema.optional(),
  }).optional(),
});

// Type exports
export type SocialCardTemplateType = z.infer<typeof socialCardTemplateTypeSchema>;
export type SocialPlatform = z.infer<typeof socialPlatformSchema>;
export type CardSize = z.infer<typeof cardSizeSchema>;
export type CardLanguage = z.infer<typeof cardLanguageSchema>;
export type CardCustomization = z.infer<typeof cardCustomizationSchema>;
export type GrowthMetrics = z.infer<typeof growthMetricsSchema>;
export type GenerateSocialCardInput = z.infer<typeof generateSocialCardSchema>;
export type PreviewSocialCardInput = z.infer<typeof previewSocialCardSchema>;
export type CreateCustomTemplateInput = z.infer<typeof createCustomTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type TrackSocialShareInput = z.infer<typeof trackSocialShareSchema>;
export type GetShareStatsInput = z.infer<typeof getShareStatsSchema>;

// Default export with all schemas
export default {
  generateSocialCard: generateSocialCardSchema,
  previewSocialCard: previewSocialCardSchema,
  createCustomTemplate: createCustomTemplateSchema,
  updateTemplate: updateTemplateSchema,
  trackSocialShare: trackSocialShareSchema,
  getShareStats: getShareStatsSchema,
  getTemplates: getTemplatesSchema,
  deleteTemplate: deleteTemplateSchema,
  getSocialCard: getSocialCardSchema,
  regenerateSocialCard: regenerateSocialCardSchema,
};
