import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '../config/logger.js';

export interface CloudflareR2Config {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region?: string;
  endpoint?: string;
}

export class CloudflareR2 {
  private s3Client: S3Client;
  private bucket: string;
  private endpoint: string;

  constructor(config: CloudflareR2Config) {
    this.bucket = config.bucket;
    this.endpoint = config.endpoint || 'https://your-account-id.r2.cloudflarestorage.com';

    this.s3Client = new S3Client({
      region: config.region || 'auto',
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      endpoint: this.endpoint,
    });

    logger.info('Cloudflare R2 service initialized', {
      bucket: this.bucket,
      endpoint: this.endpoint,
    });
  }

  async uploadFile(
    key: string,
    fileBuffer: Buffer,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        Metadata: metadata,
      });

      await this.s3Client.send(command);

      logger.info('File uploaded to Cloudflare R2', { key, contentType });
      return key;
    } catch (error) {
      logger.error('Failed to upload file to Cloudflare R2', { key, error });
      throw error;
    }
  }

  async getFile(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      const chunks: Buffer[] = [];

      if (response.Body) {
        for await (const chunk of response.Body as any) {
          chunks.push(chunk);
        }
      }

      const buffer = Buffer.concat(chunks);
      logger.info('File retrieved from Cloudflare R2', { key, size: buffer.length });

      return buffer;
    } catch (error) {
      logger.error('Failed to get file from Cloudflare R2', { key, error });
      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);

      logger.info('File deleted from Cloudflare R2', { key });
    } catch (error) {
      logger.error('Failed to delete file from Cloudflare R2', { key, error });
      throw error;
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      logger.debug('Generated signed URL for Cloudflare R2', { key, expiresIn });
      return signedUrl;
    } catch (error) {
      logger.error('Failed to generate signed URL for Cloudflare R2', { key, error });
      throw error;
    }
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      // Try to get the file metadata
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      logger.error('Error checking if file exists in Cloudflare R2', { key, error });
      throw error;
    }
  }

  async getFileMetadata(key: string): Promise<any> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      return {
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
        metadata: response.Metadata,
        etag: response.ETag,
      };
    } catch (error) {
      logger.error('Failed to get file metadata from Cloudflare R2', { key, error });
      throw error;
    }
  }

  // Batch operations
  async uploadFiles(files: Array<{
    key: string;
    buffer: Buffer;
    contentType: string;
    metadata?: Record<string, string>;
  }>): Promise<string[]> {
    const results: string[] = [];

    for (const file of files) {
      try {
        const key = await this.uploadFile(file.key, file.buffer, file.contentType, file.metadata);
        results.push(key);
      } catch (error) {
        logger.error('Failed to upload file in batch', { key: file.key, error });
        // Continue with other files
      }
    }

    return results;
  }

  async deleteFiles(keys: string[]): Promise<void> {
    for (const key of keys) {
      try {
        await this.deleteFile(key);
      } catch (error) {
        logger.error('Failed to delete file in batch', { key, error });
        // Continue with other files
      }
    }
  }
}

export default CloudflareR2;