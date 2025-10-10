import { Job } from 'bullmq';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { storageService } from '../services/cloudflareR2.js';

export interface FileJobData {
  fileId: string;
  operation: 'upload' | 'convert' | 'resize' | 'optimize' | 'delete' | 'copy' | 'move';
  options?: {
    format?: string;
    quality?: number;
    width?: number;
    height?: number;
    targetPath?: string;
    metadata?: Record<string, any>;
  };
  userId?: string;
  uploadSource?: 'pitch' | 'profile' | 'document' | 'avatar';
}

export interface FileJobResult {
  success: boolean;
  fileId?: string;
  url?: string;
  metadata?: Record<string, any>;
  error?: string;
  processingTime?: number;
}

export class FileProcessor {
  static async process(job: Job<FileJobData>): Promise<FileJobResult> {
    const { fileId, operation, options = {}, userId } = job.data;
    const startTime = Date.now();

    logger.info('Processing file job', {
      jobId: job.id,
      fileId,
      operation,
      options
    });

    try {
      // Get file record from database
      const fileRecord = await prisma.file.findUnique({
        where: { id: fileId }
      });

      if (!fileRecord) {
        throw new Error(`File record not found: ${fileId}`);
      }

      let result: FileJobResult;

      // Process based on operation type
      switch (operation) {
        case 'upload':
          result = await this.processUpload(fileRecord, options);
          break;
        case 'convert':
          result = await this.processConversion(fileRecord, options);
          break;
        case 'resize':
          result = await this.processResize(fileRecord, options);
          break;
        case 'optimize':
          result = await this.processOptimization(fileRecord, options);
          break;
        case 'delete':
          result = await this.processDeletion(fileRecord, options);
          break;
        case 'copy':
          result = await this.processCopy(fileRecord, options);
          break;
        case 'move':
          result = await this.processMove(fileRecord, options);
          break;
        default:
          throw new Error(`Unknown file operation: ${operation}`);
      }

      // Update file record with processing results
      await this.updateFileRecord(fileRecord.id, {
        status: result.success ? 'PROCESSED' : 'FAILED',
        processedAt: new Date(),
        metadata: {
          ...fileRecord.metadata as Record<string, any>,
          ...result.metadata,
          processingTime: Date.now() - startTime,
          operation,
          jobId: job.id
        },
        error: result.error
      });

      // Log success
      logger.info('File job completed successfully', {
        jobId: job.id,
        fileId,
        operation,
        processingTime: Date.now() - startTime
      });

      return {
        ...result,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      logger.error('File job failed', {
        jobId: job.id,
        fileId,
        operation,
        error: error instanceof Error ? error.message : String(error)
      });

      // Update file record with error
      await this.updateFileRecord(fileId, {
        status: 'FAILED',
        processedAt: new Date(),
        error: error instanceof Error ? error.message : String(error)
      });

      throw error;
    }
  }

  private static async processUpload(fileRecord: any, options: any): Promise<FileJobResult> {
    try {
      // Upload file to cloud storage
      const uploadResult = await storageService.uploadFile({
        fileName: fileRecord.originalName,
        fileBuffer: Buffer.from(fileRecord.content, 'base64'),
        mimeType: fileRecord.mimeType,
        folder: options.folder || 'uploads',
        metadata: {
          ...options.metadata,
          uploadSource: options.uploadSource,
          userId: options.userId
        }
      });

      return {
        success: true,
        fileId: fileRecord.id,
        url: uploadResult.url,
        metadata: {
          storageUrl: uploadResult.url,
          storageKey: uploadResult.key,
          bucket: uploadResult.bucket,
          size: uploadResult.size
        }
      };
    } catch (error) {
      throw new Error(`Upload failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static async processConversion(fileRecord: any, options: any): Promise<FileJobResult> {
    try {
      // For now, simulate conversion process
      // In a real implementation, you would use libraries like sharp, ffmpeg, etc.
      logger.info('Converting file', {
        fileId: fileRecord.id,
        from: fileRecord.mimeType,
        to: options.format
      });

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));

      return {
        success: true,
        fileId: fileRecord.id,
        metadata: {
          originalFormat: fileRecord.mimeType,
          convertedFormat: options.format,
          conversionQuality: options.quality || 'standard'
        }
      };
    } catch (error) {
      throw new Error(`Conversion failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static async processResize(fileRecord: any, options: any): Promise<FileJobResult> {
    try {
      logger.info('Resizing file', {
        fileId: fileRecord.id,
        width: options.width,
        height: options.height
      });

      // Simulate image resize processing
      await new Promise(resolve => setTimeout(resolve, 1500));

      return {
        success: true,
        fileId: fileRecord.id,
        metadata: {
          originalSize: fileRecord.metadata?.size,
          newWidth: options.width,
          newHeight: options.height,
          resizeQuality: options.quality || 'good'
        }
      };
    } catch (error) {
      throw new Error(`Resize failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static async processOptimization(fileRecord: any, options: any): Promise<FileJobResult> {
    try {
      logger.info('Optimizing file', {
        fileId: fileRecord.id,
        optimizationLevel: options.level || 'standard'
      });

      // Simulate optimization process
      await new Promise(resolve => setTimeout(resolve, 3000));

      return {
        success: true,
        fileId: fileRecord.id,
        metadata: {
          originalSize: fileRecord.metadata?.size,
          optimizedSize: Math.floor((fileRecord.metadata?.size || 0) * 0.8), // Simulate 20% reduction
          optimizationLevel: options.level || 'standard',
          compressionRatio: 0.8
        }
      };
    } catch (error) {
      throw new Error(`Optimization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static async processDeletion(fileRecord: any, options: any): Promise<FileJobResult> {
    try {
      // Delete from cloud storage
      if (fileRecord.metadata?.storageKey) {
        await storageService.deleteFile(fileRecord.metadata.storageKey);
      }

      // Delete record from database
      await prisma.file.delete({
        where: { id: fileRecord.id }
      });

      return {
        success: true,
        fileId: fileRecord.id,
        metadata: {
          deletedAt: new Date().toISOString(),
          storageDeleted: !!fileRecord.metadata?.storageKey
        }
      };
    } catch (error) {
      throw new Error(`Deletion failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static async processCopy(fileRecord: any, options: any): Promise<FileJobResult> {
    try {
      if (!fileRecord.metadata?.storageKey) {
        throw new Error('Source file not found in storage');
      }

      const copyResult = await storageService.copyFile(
        fileRecord.metadata.storageKey,
        options.targetPath
      );

      return {
        success: true,
        fileId: fileRecord.id,
        url: copyResult.url,
        metadata: {
          sourceKey: fileRecord.metadata.storageKey,
          copiedKey: copyResult.key,
          copyPath: options.targetPath
        }
      };
    } catch (error) {
      throw new Error(`Copy failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static async processMove(fileRecord: any, options: any): Promise<FileJobResult> {
    try {
      if (!fileRecord.metadata?.storageKey) {
        throw new Error('Source file not found in storage');
      }

      const moveResult = await storageService.moveFile(
        fileRecord.metadata.storageKey,
        options.targetPath
      );

      // Update file record with new location
      await this.updateFileRecord(fileRecord.id, {
        metadata: {
          ...fileRecord.metadata,
          storageKey: moveResult.key,
          movedAt: new Date().toISOString()
        }
      });

      return {
        success: true,
        fileId: fileRecord.id,
        url: moveResult.url,
        metadata: {
          sourceKey: fileRecord.metadata.storageKey,
          movedKey: moveResult.key,
          movePath: options.targetPath
        }
      };
    } catch (error) {
      throw new Error(`Move failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static async updateFileRecord(
    fileId: string,
    updates: {
      status?: string;
      processedAt?: Date;
      metadata?: Record<string, any>;
      error?: string;
    }
  ): Promise<void> {
    try {
      await prisma.file.update({
        where: { id: fileId },
        data: updates
      });
    } catch (error) {
      logger.error('Failed to update file record', {
        fileId,
        error: error instanceof Error ? error.message : String(error)
      });
      // Don't throw here as this is not critical for the file processing
    }
  }

  // Queue file processing job
  static async queueFileJob(
    fileId: string,
    operation: FileJobData['operation'],
    options: FileJobData['options'] = {},
    userId?: string
  ): Promise<void> {
    const { fileProcessingQueue } = await import('../config/queues.js');

    await fileProcessingQueue.add('file-operation', {
      fileId,
      operation,
      options,
      userId,
      queuedAt: new Date().toISOString()
    });

    logger.info('File job queued', {
      fileId,
      operation,
      userId
    });
  }

  // Process multiple files in batch
  static async queueBatchFileJob(
    fileIds: string[],
    operation: FileJobData['operation'],
    options: FileJobData['options'] = {},
    userId?: string
  ): Promise<void> {
    const { fileProcessingQueue } = await import('../config/queues.js');

    // Add parent job for batch processing
    const parentJob = await fileProcessingQueue.add('batch-file-operation', {
      fileIds,
      operation,
      options,
      userId,
      isBatch: true,
      queuedAt: new Date().toISOString()
    });

    // Add individual jobs as children
    const childJobs = await Promise.all(
      fileIds.map(fileId =>
        fileProcessingQueue.add('file-operation', {
          fileId,
          operation,
          options,
          userId,
          parentJobId: parentJob.id,
          queuedAt: new Date().toISOString()
        })
      )
    );

    logger.info('Batch file job queued', {
      batchJobId: parentJob.id,
      fileCount: fileIds.length,
      operation,
      childJobIds: childJobs.map(job => job.id)
    });
  }
}

export default FileProcessor;