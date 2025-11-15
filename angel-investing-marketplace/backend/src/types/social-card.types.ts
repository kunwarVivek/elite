/**
 * Social Card Types and Interfaces
 * FR-4.2: Social Card Generation for company updates
 */

import {
  SocialCardTemplateType,
  SocialPlatform,
  CardSize,
  CardLanguage,
  CardCustomization,
  GrowthMetrics,
} from '../validations/social-card.validation.js';

/**
 * Card dimensions for different platforms
 */
export interface CardDimensions {
  width: number;
  height: number;
}

/**
 * Card dimension presets for social platforms
 */
export const CARD_DIMENSIONS: Record<CardSize, CardDimensions> = {
  TWITTER: { width: 1200, height: 630 },
  INSTAGRAM: { width: 1200, height: 1200 },
  LINKEDIN: { width: 1200, height: 627 },
  FACEBOOK: { width: 1200, height: 630 },
  CUSTOM: { width: 1200, height: 630 }, // Default to Twitter size
};

/**
 * Template configuration
 */
export interface TemplateConfig {
  type: SocialCardTemplateType;
  name: string;
  description?: string;
  defaultCustomization: Partial<CardCustomization>;
  supportsMetrics: boolean;
  requiredFields: string[];
}

/**
 * Built-in template configurations - FR-4.2.2: Multiple card templates
 */
export const BUILTIN_TEMPLATES: Record<SocialCardTemplateType, TemplateConfig> = {
  MILESTONE: {
    type: 'MILESTONE',
    name: 'Milestone Achievement',
    description: 'Celebrate company milestones and achievements',
    defaultCustomization: {
      layout: 'centered',
      useGradient: true,
      gradientDirection: 'diagonal',
      showLogo: true,
      logoPosition: 'top-left',
    },
    supportsMetrics: false,
    requiredFields: ['title', 'content'],
  },
  GROWTH: {
    type: 'GROWTH',
    name: 'Growth Metrics',
    description: 'Showcase growth metrics and KPIs',
    defaultCustomization: {
      layout: 'split',
      useGradient: true,
      gradientDirection: 'vertical',
      showLogo: true,
      logoPosition: 'top-left',
    },
    supportsMetrics: true,
    requiredFields: ['title', 'metrics'],
  },
  FUNDING: {
    type: 'FUNDING',
    name: 'Funding Announcement',
    description: 'Announce funding rounds and investments',
    defaultCustomization: {
      layout: 'centered',
      useGradient: false,
      showLogo: true,
      logoPosition: 'center',
    },
    supportsMetrics: true,
    requiredFields: ['title', 'content'],
  },
  PRODUCT: {
    type: 'PRODUCT',
    name: 'Product Launch',
    description: 'Announce new product launches and features',
    defaultCustomization: {
      layout: 'left',
      useGradient: true,
      gradientDirection: 'horizontal',
      showLogo: true,
      logoPosition: 'top-right',
    },
    supportsMetrics: false,
    requiredFields: ['title', 'content'],
  },
  TEAM: {
    type: 'TEAM',
    name: 'Team Update',
    description: 'Share team updates and announcements',
    defaultCustomization: {
      layout: 'centered',
      useGradient: true,
      gradientDirection: 'diagonal',
      showLogo: true,
      logoPosition: 'top-left',
    },
    supportsMetrics: false,
    requiredFields: ['title', 'content'],
  },
  GENERAL: {
    type: 'GENERAL',
    name: 'General Update',
    description: 'Generic update card for any content',
    defaultCustomization: {
      layout: 'centered',
      useGradient: true,
      gradientDirection: 'vertical',
      showLogo: true,
      logoPosition: 'top-left',
    },
    supportsMetrics: false,
    requiredFields: ['title', 'content'],
  },
};

/**
 * Social card content
 */
export interface SocialCardContent {
  title: string;
  content?: string;
  companyName: string;
  logoUrl?: string;
  metrics?: GrowthMetrics[];
  date?: Date;
  ctaText?: string;
}

/**
 * Social card generation options
 */
export interface SocialCardGenerationOptions {
  template: SocialCardTemplateType;
  size: CardSize;
  language: CardLanguage;
  customization?: Partial<CardCustomization>;
  content: SocialCardContent;
  format?: 'PNG' | 'JPEG' | 'WEBP';
  quality?: number;
}

/**
 * Generated social card result
 */
export interface GeneratedSocialCard {
  id: string;
  updateId: string;
  imageUrl: string;
  imageKey: string;
  template: SocialCardTemplateType;
  size: CardSize;
  language: CardLanguage;
  dimensions: CardDimensions;
  metadata: SocialCardMetadata;
  createdAt: Date;
}

/**
 * Social card metadata
 */
export interface SocialCardMetadata {
  template: SocialCardTemplateType;
  size: CardSize;
  language: CardLanguage;
  customization?: Partial<CardCustomization>;
  format: string;
  quality: number;
  fileSize?: number;
  generationTimeMs?: number;
}

/**
 * Social share tracking
 */
export interface SocialShareTracking {
  id: string;
  updateId: string;
  platform: SocialPlatform;
  shareUrl?: string;
  sharedBy?: string;
  sharedAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Social engagement stats - FR-4.2.5: Track social engagement metrics
 */
export interface SocialEngagementStats {
  updateId: string;
  totalShares: number;
  sharesByPlatform: Record<SocialPlatform, number>;
  uniqueSharers: number;
  clickThrough?: number;
  impressions?: number;
  engagement?: number;
  topPlatform?: SocialPlatform;
  recentShares: SocialShareTracking[];
}

/**
 * Custom template
 */
export interface CustomTemplate {
  id: string;
  userId: string;
  name: string;
  description?: string;
  baseTemplate: SocialCardTemplateType;
  customization: CardCustomization;
  isDefault: boolean;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Social platform share URLs - FR-4.2.4: One-click sharing to social platforms
 */
export interface SocialShareUrls {
  twitter: string;
  linkedin: string;
  facebook: string;
  instagram?: string; // Instagram requires different approach
  whatsapp: string;
  copyLink: string;
}

/**
 * Font configuration for different languages - FR-4.2.6: Multi-language support
 */
export interface LanguageFontConfig {
  fontFamily: string;
  isRTL: boolean;
  fallbackFonts: string[];
}

/**
 * Language-specific font configurations
 */
export const LANGUAGE_FONTS: Record<CardLanguage, LanguageFontConfig> = {
  en: { fontFamily: 'Inter', isRTL: false, fallbackFonts: ['Arial', 'Helvetica'] },
  es: { fontFamily: 'Inter', isRTL: false, fallbackFonts: ['Arial', 'Helvetica'] },
  fr: { fontFamily: 'Inter', isRTL: false, fallbackFonts: ['Arial', 'Helvetica'] },
  de: { fontFamily: 'Inter', isRTL: false, fallbackFonts: ['Arial', 'Helvetica'] },
  it: { fontFamily: 'Inter', isRTL: false, fallbackFonts: ['Arial', 'Helvetica'] },
  pt: { fontFamily: 'Inter', isRTL: false, fallbackFonts: ['Arial', 'Helvetica'] },
  zh: { fontFamily: 'Noto Sans SC', isRTL: false, fallbackFonts: ['SimSun', 'Microsoft YaHei'] },
  ja: { fontFamily: 'Noto Sans JP', isRTL: false, fallbackFonts: ['MS PGothic', 'Hiragino Sans'] },
  ko: { fontFamily: 'Noto Sans KR', isRTL: false, fallbackFonts: ['Malgun Gothic', 'Dotum'] },
  ar: { fontFamily: 'Noto Sans Arabic', isRTL: true, fallbackFonts: ['Arial', 'Tahoma'] },
  he: { fontFamily: 'Noto Sans Hebrew', isRTL: true, fallbackFonts: ['Arial', 'David'] },
};

/**
 * Default brand colors for different update types
 */
export const DEFAULT_BRAND_COLORS: Record<SocialCardTemplateType, { primary: string; secondary: string }> = {
  MILESTONE: { primary: '#10B981', secondary: '#059669' },  // Green
  GROWTH: { primary: '#3B82F6', secondary: '#2563EB' },     // Blue
  FUNDING: { primary: '#8B5CF6', secondary: '#7C3AED' },    // Purple
  PRODUCT: { primary: '#F59E0B', secondary: '#D97706' },    // Amber
  TEAM: { primary: '#EC4899', secondary: '#DB2777' },       // Pink
  GENERAL: { primary: '#6366F1', secondary: '#4F46E5' },    // Indigo
};

/**
 * Image generation service interface
 */
export interface ImageGenerationService {
  generateCard(options: SocialCardGenerationOptions): Promise<Buffer>;
  generatePreview(options: SocialCardGenerationOptions): Promise<Buffer>;
}

/**
 * Text processing utilities
 */
export interface TextProcessingOptions {
  maxLength: number;
  fontSize: number;
  fontFamily: string;
  maxWidth: number;
  language: CardLanguage;
}

/**
 * Color utilities
 */
export interface ColorPalette {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  accent?: string;
}

/**
 * Template render context
 */
export interface TemplateRenderContext {
  content: SocialCardContent;
  customization: CardCustomization;
  dimensions: CardDimensions;
  colors: ColorPalette;
  language: CardLanguage;
  template: SocialCardTemplateType;
}

export default {
  CARD_DIMENSIONS,
  BUILTIN_TEMPLATES,
  LANGUAGE_FONTS,
  DEFAULT_BRAND_COLORS,
};
