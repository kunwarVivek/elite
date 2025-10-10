import { S3Client } from '@aws-sdk/client-s3';
import { CloudflareR2 } from '../services/cloudflareR2.js';
import { env } from './environment.js';
import { logger } from './logger.js';

// Storage provider enum
export enum StorageProvider {
  AWS_S3 = 'aws_s3',
  CLOUDFLARE_R2 = 'cloudflare_r2',
  LOCAL = 'local',
}

// File type categories
export enum FileCategory {
  AVATAR = 'avatar',
  DOCUMENT = 'document',
  PITCH_DECK = 'pitch_deck',
  FINANCIAL = 'financial',
  LEGAL = 'legal',
  IMAGE = 'image',
  OTHER = 'other',
}

// File configuration
export const fileConfig = {
  // File size limits (in bytes)
  limits: {
    avatar: 2 * 1024 * 1024, // 2MB
    document: 10 * 1024 * 1024, // 10MB
    pitchDeck: 50 * 1024 * 1024, // 50MB
    financial: 25 * 1024 * 1024, // 25MB
    legal: 25 * 1024 * 1024, // 25MB
    image: 5 * 1024 * 1024, // 5MB
    other: 10 * 1024 * 1024, // 10MB
  },

  // Allowed MIME types by category
  allowedTypes: {
    avatar: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ],
    document: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ],
    pitchDeck: [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    financial: [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ],
    legal: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    image: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ],
    other: [
      'application/pdf',
      'application/zip',
      'application/x-rar-compressed',
      'text/plain',
    ],
  },

  // Image processing options
  imageProcessing: {
    avatar: {
      width: 200,
      height: 200,
      quality: 85,
      format: 'jpeg',
    },
    thumbnail: {
      width: 300,
      height: 300,
      quality: 80,
      format: 'jpeg',
    },
  },
};

// Storage provider instances
let s3Client: S3Client | null = null;
let cloudflareR2: CloudflareR2 | null = null;

// Initialize AWS S3 client
if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.AWS_S3_BUCKET) {
  s3Client = new S3Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });
  logger.info('AWS S3 client initialized');
}

// Initialize Cloudflare R2 client
if (env.CLOUDFLARE_R2_ACCESS_KEY_ID && env.CLOUDFLARE_R2_SECRET_ACCESS_KEY) {
  cloudflareR2 = new CloudflareR2({
    accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    bucket: env.AWS_S3_BUCKET || 'angel-investing-files', // Use same bucket name if not specified
  });
  logger.info('Cloudflare R2 client initialized');
}

// Determine primary storage provider
export const getStorageProvider = (): StorageProvider => {
  if (cloudflareR2) {
    return StorageProvider.CLOUDFLARE_R2;
  } else if (s3Client) {
    return StorageProvider.AWS_S3;
  } else {
    return StorageProvider.LOCAL;
  }
};

// Get storage client
export const getStorageClient = () => {
  const provider = getStorageProvider();

  switch (provider) {
    case StorageProvider.CLOUDFLARE_R2:
      return cloudflareR2;
    case StorageProvider.AWS_S3:
      return s3Client;
    default:
      return null;
  }
};

// File upload utilities
export const getFileCategory = (mimetype: string, filename: string): FileCategory => {
  // Check by MIME type first
  for (const [category, types] of Object.entries(fileConfig.allowedTypes)) {
    if (types.includes(mimetype)) {
      return category as FileCategory;
    }
  }

  // Fallback to filename extension
  const ext = filename.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
      return FileCategory.IMAGE;
    case 'pdf':
      return FileCategory.DOCUMENT;
    case 'doc':
    case 'docx':
      return FileCategory.DOCUMENT;
    case 'ppt':
    case 'pptx':
      return FileCategory.PITCH_DECK;
    case 'xls':
    case 'xlsx':
    case 'csv':
      return FileCategory.FINANCIAL;
    default:
      return FileCategory.OTHER;
  }
};

export const validateFile = (file: Express.Multer.File, category?: FileCategory): { valid: boolean; error?: string } => {
  const fileCategory = category || getFileCategory(file.mimetype, file.originalname);

  // Check file size
  const maxSize = fileConfig.limits[fileCategory as keyof typeof fileConfig.limits];
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${Math.round(maxSize / 1024 / 1024)}MB`,
    };
  }

  // Check MIME type
  const allowedTypes = fileConfig.allowedTypes[fileCategory as keyof typeof fileConfig.allowedTypes];
  if (!allowedTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: `File type ${file.mimetype} is not allowed for ${fileCategory} files`,
    };
  }

  return { valid: true };
};

export const generateFileKey = (userId: string, category: FileCategory, originalName: string): string => {
  const timestamp = Date.now();
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');

  return `${category}/${userId}/${timestamp}_${sanitizedName}`;
};

export const getFileUrl = async (key: string, expires?: number): Promise<string> => {
  const provider = getStorageProvider();

  switch (provider) {
    case StorageProvider.CLOUDFLARE_R2:
      if (cloudflareR2) {
        return await cloudflareR2.getSignedUrl(key, expires || 3600);
      }
      return `/api/files/${key}`;
    case StorageProvider.AWS_S3:
      // TODO: Generate signed URL for S3
      return `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
    default:
      return `/api/files/${key}`;
  }
};

// File processing utilities
export const processImage = async (filePath: string, options: any): Promise<string> => {
  // TODO: Implement image processing with Sharp
  // This would resize, compress, and optimize images
  logger.info('Image processing', { filePath, options });
  return filePath;
};

export const extractDocumentText = async (filePath: string): Promise<string> => {
  // TODO: Implement document text extraction
  // This could use libraries like pdf-parse, mammoth, etc.
  logger.info('Document text extraction', { filePath });
  return '';
};

export const scanForViruses = async (filePath: string): Promise<boolean> => {
  // TODO: Implement virus scanning
  // This could integrate with services like ClamAV or VirusTotal
  logger.info('Virus scanning', { filePath });
  return true;
};

export default {
  provider: getStorageProvider(),
  client: getStorageClient(),
  config: fileConfig,
  utils: {
    getFileCategory,
    validateFile,
    generateFileKey,
    getFileUrl,
    processImage,
    extractDocumentText,
    scanForViruses,
  },
};