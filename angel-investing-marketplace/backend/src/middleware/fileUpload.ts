import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.js';
import { logger } from '../config/logger.js';
import storageConfig, {
  FileCategory,
  getFileCategory,
  validateFile,
  generateFileKey,
  getFileUrl,
  processImage,
  scanForViruses,
} from '../config/storage.js';

// Extend Request interface for file uploads
declare global {
  namespace Express {
    interface Request {
      files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
      file?: Express.Multer.File;
      fileUrls?: string[];
      processedFiles?: Array<{
        key: string;
        url: string;
        category: FileCategory;
        originalName: string;
        size: number;
        mimetype: string;
      }>;
    }
  }
}

// Memory storage for multer (files will be processed and uploaded to cloud storage)
const memoryStorage = multer.memoryStorage();

// File filter function
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  try {
    // Basic validation
    if (!file.originalname || !file.mimetype) {
      return cb(new Error('Invalid file'));
    }

    // Get file category
    const category = getFileCategory(file.mimetype, file.originalname);

    // Validate file
    const validation = validateFile(file, category);
    if (!validation.valid) {
      return cb(new Error(validation.error));
    }

    // Add category to file object for later use
    (file as any).category = category;

    cb(null, true);
  } catch (error) {
    logger.error('File filter error', { error, file: file.originalname });
    cb(new Error('File validation failed'));
  }
};

// Multer configuration
export const createMulterConfig = (category?: FileCategory) => {
  return multer({
    storage: memoryStorage,
    fileFilter,
    limits: {
      fileSize: category ? (storageConfig.config.limits as any)[category] : storageConfig.config.limits.other,
      files: category === FileCategory.IMAGE ? 10 : 5, // Max 10 images, 5 other files
    },
  });
};

// Default upload instance for routes
export const upload = createMulterConfig();

// Single file upload middleware
export const uploadSingle = (fieldName: string, category?: FileCategory) => {
  const multerConfig = createMulterConfig(category);

  return [
    multerConfig.single(fieldName),
    handleFileUpload,
  ];
};

// Multiple files upload middleware
export const uploadMultiple = (fieldName: string, category?: FileCategory, maxCount?: number) => {
  const multerConfig = createMulterConfig(category);

  return [
    multerConfig.array(fieldName, maxCount || 5),
    handleFileUpload,
  ];
};

// Mixed files upload middleware
export const uploadFields = (fields: Array<{ name: string; maxCount?: number; category?: FileCategory }>) => {
  const multerConfig = createMulterConfig();

  return [
    multerConfig.fields(fields.map(field => ({
      name: field.name,
      maxCount: field.maxCount || 1,
    }))),
    handleFileUpload,
  ];
};

// File upload handler middleware
export const handleFileUpload = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file && (!req.files || req.files.length === 0)) {
      return next();
    }

    const files = req.file ? [req.file] : (req.files as Express.Multer.File[]);
    const storageClient = storageConfig.client;

    if (!storageClient) {
      throw new AppError('File storage not configured', 500, 'STORAGE_NOT_CONFIGURED');
    }

    const uploadedFiles: Array<{
      key: string;
      url: string;
      category: FileCategory;
      originalName: string;
      size: number;
      mimetype: string;
    }> = [];

    // Process each file
    for (const file of files) {
      const category = (file as any).category || getFileCategory(file.mimetype, file.originalname);

      // Generate unique file key
      const fileKey = generateFileKey(
        req.user?.id || 'anonymous',
        category,
        file.originalname
      );

      // Virus scanning
      const isClean = await scanForViruses(file.path || fileKey);
      if (!isClean) {
        throw new AppError('File failed virus scan', 400, 'VIRUS_DETECTED');
      }

      // Process file based on category
      let processedBuffer = file.buffer;
      let processedContentType = file.mimetype;

      if (category === FileCategory.IMAGE || category === FileCategory.AVATAR) {
        // Process images
        const processingOptions = category === FileCategory.AVATAR
          ? storageConfig.config.imageProcessing.avatar
          : storageConfig.config.imageProcessing.thumbnail;

        // TODO: Implement actual image processing
        // processedBuffer = await processImage(file.buffer, processingOptions);
        // processedContentType = `image/${processingOptions.format}`;
      }

      // Upload to cloud storage
      if ('uploadFile' in storageClient) {
        await storageClient.uploadFile(
          fileKey,
          processedBuffer,
          processedContentType,
          {
            originalName: file.originalname,
            category,
            uploadedBy: req.user?.id || 'anonymous',
            uploadedAt: new Date().toISOString(),
          }
        );
      }

      // Generate file URL
      const fileUrl = await getFileUrl(fileKey);

      uploadedFiles.push({
        key: fileKey,
        url: fileUrl,
        category,
        originalName: file.originalname,
        size: file.size,
        mimetype: processedContentType,
      });

      logger.info('File uploaded successfully', {
        key: fileKey,
        originalName: file.originalname,
        category,
        size: file.size,
        userId: req.user?.id,
      });
    }

    // Attach uploaded file information to request
    req.fileUrls = uploadedFiles.map(f => f.url);
    req.processedFiles = uploadedFiles;

    next();
  } catch (error) {
    logger.error('File upload handler error', { error });
    next(error);
  }
};

// File validation middleware (for validating existing files)
export const validateFileAccess = (req: Request, res: Response, next: NextFunction) => {
  try {
    const fileKey = req.params.fileKey || req.query.fileKey;

    if (!fileKey) {
      throw new AppError('File key is required', 400, 'FILE_KEY_REQUIRED');
    }

    // TODO: Implement file access validation
    // - Check if user has permission to access the file
    // - Check if file exists
    // - Validate file category restrictions

    next();
  } catch (error) {
    next(error);
  }
};

// File deletion middleware
export const deleteFile = async (fileKey: string): Promise<void> => {
  try {
    const storageClient = storageConfig.client;

    if (!storageClient) {
      throw new AppError('File storage not configured', 500, 'STORAGE_NOT_CONFIGURED');
    }

    if ('deleteFile' in storageClient) {
      await storageClient.deleteFile(fileKey);
    }

    logger.info('File deleted successfully', { fileKey });
  } catch (error) {
    logger.error('File deletion failed', { fileKey, error });
    throw error;
  }
};

// File retrieval middleware
export const getFile = async (fileKey: string): Promise<{
  buffer: Buffer;
  contentType: string;
  metadata?: Record<string, string>;
}> => {
  try {
    const storageClient = storageConfig.client;

    if (!storageClient) {
      throw new AppError('File storage not configured', 500, 'STORAGE_NOT_CONFIGURED');
    }

    if (!('getFile' in storageClient) || !('getFileMetadata' in storageClient)) {
      throw new AppError('Storage client does not support file operations', 500, 'UNSUPPORTED_OPERATION');
    }

    const buffer = await storageClient.getFile(fileKey);
    const metadata = await storageClient.getFileMetadata(fileKey);

    return {
      buffer,
      contentType: metadata.contentType || 'application/octet-stream',
      metadata: metadata.metadata,
    };
  } catch (error) {
    logger.error('File retrieval failed', { fileKey, error });
    throw error;
  }
};

// File serving middleware
export const serveFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fileKey = req.params.fileKey;

    if (!fileKey) {
      throw new AppError('File key is required', 400, 'FILE_KEY_REQUIRED');
    }

    const { buffer, contentType } = await getFile(fileKey);

    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.setHeader('Content-Disposition', `inline; filename="${fileKey.split('/').pop()}"`);

    // Send file
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

// File upload progress middleware (for tracking upload progress)
export const trackUploadProgress = (req: Request, res: Response, next: NextFunction) => {
  let progress = 0;

  // Override res.writeHead to track progress
  const originalWriteHead = res.writeHead;
  res.writeHead = function(statusCode: number, headers?: any) {
    if (statusCode === 200 && req.fileUrls) {
      progress = 100;
      logger.info('File upload completed', {
        progress: `${progress}%`,
        fileCount: req.fileUrls.length,
        userId: req.user?.id,
      });
    }

    return originalWriteHead.call(this, statusCode, headers);
  };

  next();
};

export default {
  uploadSingle,
  uploadMultiple,
  uploadFields,
  handleFileUpload,
  validateFileAccess,
  deleteFile,
  getFile,
  serveFile,
  trackUploadProgress,
};