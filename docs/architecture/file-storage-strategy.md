# File Upload and Storage Strategy

## Overview

The angel investing platform requires robust file management for pitch decks, business plans, financial documents, legal agreements, and other assets. This strategy covers secure upload, storage, processing, and delivery of all platform files.

## File Storage Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT                                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Upload     │  │  Progress   │  │  Drag &     │              │
│  │  Components │  │  Tracking   │  │  Drop       │              │
│  │             │  │             │  │  Interface  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────┬───────────────────────────────────────────────┘
                  │ HTTPS/Multipart
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  File       │  │  Validation │  │  Virus       │              │
│  │  Upload     │  │  & Security │  │  Scanning   │              │
│  │  Handler    │  │  Checks     │  │             │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────┬───────────────────────────────────────────────┘
                  │
         ┌────────▼────────┐
         │   OBJECT        │
         │   STORAGE       │
         │   (S3/R2/MinIO) │
         └─────────────────┘
                  │
         ┌────────▼────────┐
         │   CDN           │
         │   (Cloudflare)  │
         └─────────────────┘
```

## Storage Provider Integration

### AWS S3 Integration

```typescript
// lib/storage-providers/aws-s3.ts
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export class S3StorageProvider {
  private bucketName: string

  constructor() {
    this.bucketName = process.env.AWS_S3_BUCKET!
  }

  async uploadFile(
    file: File,
    key: string,
    metadata?: Record<string, string>
  ): Promise<{ url: string; key: string; etag: string }> {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const uploadCommand = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      Metadata: metadata,
      CacheControl: 'max-age=31536000', // 1 year
    })

    const result = await s3Client.send(uploadCommand)

    // Generate signed URL for private files
    const signedUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
      { expiresIn: 3600 } // 1 hour
    )

    return {
      url: signedUrl,
      key: key,
      etag: result.ETag!
    }
  }

  async getFileUrl(key: string, expiresIn: number = 3600): Promise<string> {
    return getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
      { expiresIn }
    )
  }

  async deleteFile(key: string): Promise<void> {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    })

    await s3Client.send(deleteCommand)
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })

      await s3Client.send(headCommand)
      return true
    } catch (error) {
      return false
    }
  }
}
```

### Cloudflare R2 Integration

```typescript
// lib/storage-providers/cloudflare-r2.ts
import { S3Client } from '@aws-sdk/client-s3'

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
})

export class R2StorageProvider extends S3StorageProvider {
  constructor() {
    super()
    this.bucketName = process.env.CLOUDFLARE_R2_BUCKET!
  }

  // Inherits all S3 methods but uses R2 endpoint
}
```

## File Upload Implementation

### Upload Service

```typescript
// lib/upload-service.ts
import { S3StorageProvider } from '@/lib/storage-providers/aws-s3'
import { virusScanner } from '@/lib/security/virus-scanner'
import { imageProcessor } from '@/lib/processors/image-processor'
import { documentProcessor } from '@/lib/processors/document-processor'

export class UploadService {
  private storageProvider: S3StorageProvider

  constructor() {
    this.storageProvider = new S3StorageProvider()
  }

  async uploadDocument(
    file: File,
    userId: string,
    startupId: string,
    fileType: 'PITCH_DECK' | 'BUSINESS_PLAN' | 'FINANCIAL' | 'LEGAL'
  ): Promise<{ document: any; url: string }> {
    // 1. Validate file
    await this.validateFile(file, fileType)

    // 2. Scan for viruses
    await virusScanner.scanBuffer(await file.arrayBuffer())

    // 3. Generate unique key
    const key = this.generateFileKey(userId, startupId, file.name, fileType)

    // 4. Process document based on type
    let processedFile = file
    if (fileType === 'PITCH_DECK' && file.type === 'application/pdf') {
      processedFile = await documentProcessor.optimizePDF(file)
    }

    // 5. Upload to storage
    const uploadResult = await this.storageProvider.uploadFile(
      processedFile,
      key,
      {
        user_id: userId,
        startup_id: startupId,
        file_type: fileType,
        original_name: file.name,
        uploaded_at: new Date().toISOString()
      }
    )

    // 6. Create document record
    const document = await prisma.document.create({
      data: {
        startup_id: startupId,
        name: file.name,
        file_path: key,
        file_url: uploadResult.url,
        file_type: fileType,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: userId
      }
    })

    return { document, url: uploadResult.url }
  }

  async uploadImage(
    file: File,
    userId: string,
    type: 'AVATAR' | 'LOGO' | 'GALLERY'
  ): Promise<{ url: string; thumbnailUrl?: string }> {
    // 1. Validate image
    await this.validateImage(file)

    // 2. Process image
    const processedImage = await imageProcessor.resizeAndOptimize(file, {
      maxWidth: type === 'AVATAR' ? 400 : 1200,
      maxHeight: type === 'AVATAR' ? 400 : 800,
      quality: 85,
      format: 'webp'
    })

    // 3. Generate thumbnail for gallery images
    let thumbnailUrl: string | undefined
    if (type === 'GALLERY') {
      const thumbnail = await imageProcessor.resizeAndOptimize(file, {
        maxWidth: 300,
        maxHeight: 200,
        quality: 75,
        format: 'webp'
      })
      const thumbnailKey = this.generateThumbnailKey(userId, file.name)
      await this.storageProvider.uploadFile(thumbnail, thumbnailKey)
      thumbnailUrl = await this.storageProvider.getFileUrl(thumbnailKey)
    }

    // 4. Upload main image
    const key = this.generateImageKey(userId, file.name, type)
    const uploadResult = await this.storageProvider.uploadFile(
      processedImage,
      key,
      {
        user_id: userId,
        image_type: type,
        original_name: file.name
      }
    )

    return {
      url: uploadResult.url,
      thumbnailUrl
    }
  }

  private async validateFile(file: File, fileType: string) {
    const maxSizes = {
      PITCH_DECK: 50 * 1024 * 1024, // 50MB
      BUSINESS_PLAN: 25 * 1024 * 1024, // 25MB
      FINANCIAL: 10 * 1024 * 1024, // 10MB
      LEGAL: 10 * 1024 * 1024 // 10MB
    }

    if (file.size > maxSizes[fileType as keyof typeof maxSizes]) {
      throw new Error(`File size exceeds maximum allowed size for ${fileType}`)
    }

    const allowedTypes = {
      PITCH_DECK: ['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
      BUSINESS_PLAN: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      FINANCIAL: ['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      LEGAL: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    }

    if (!allowedTypes[fileType as keyof typeof allowedTypes].includes(file.type)) {
      throw new Error(`File type not allowed for ${fileType}`)
    }
  }

  private async validateImage(file: File) {
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image')
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      throw new Error('Image size must be less than 10MB')
    }
  }

  private generateFileKey(userId: string, startupId: string, fileName: string, fileType: string): string {
    const timestamp = Date.now()
    const extension = fileName.split('.').pop()
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')

    return `startups/${startupId}/${fileType.toLowerCase()}/${timestamp}_${sanitizedName}`
  }

  private generateImageKey(userId: string, fileName: string, type: string): string {
    const timestamp = Date.now()
    const extension = fileName.split('.').pop()
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')

    return `images/${type.toLowerCase()}/${userId}/${timestamp}_${sanitizedName}.webp`
  }

  private generateThumbnailKey(userId: string, fileName: string): string {
    const timestamp = Date.now()
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '')

    return `images/thumbnails/${userId}/${timestamp}_${nameWithoutExt}_thumb.webp`
  }
}
```

## File Processing Pipeline

### Image Processing

```typescript
// lib/processors/image-processor.ts
import sharp from 'sharp'

export class ImageProcessor {
  static async resizeAndOptimize(
    file: File,
    options: {
      maxWidth: number
      maxHeight: number
      quality: number
      format: 'jpeg' | 'png' | 'webp'
    }
  ): Promise<File> {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let sharpInstance = sharp(buffer)
      .resize(options.maxWidth, options.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: options.quality })

    if (options.format === 'webp') {
      sharpInstance = sharpInstance.webp({ quality: options.quality })
    }

    const processedBuffer = await sharpInstance.toBuffer()
    const processedFileName = `processed_${file.name.replace(/\.[^/.]+$/, `.${options.format}`)}`

    return new File([processedBuffer], processedFileName, {
      type: `image/${options.format}`
    })
  }

  static async generateThumbnails(file: File, sizes: Array<{ width: number; height: number }>): Promise<File[]> {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const thumbnails = await Promise.all(
      sizes.map(async (size) => {
        const thumbnailBuffer = await sharp(buffer)
          .resize(size.width, size.height, {
            fit: 'cover',
            position: 'center'
          })
          .webp({ quality: 80 })
          .toBuffer()

        const thumbnailName = `thumb_${size.width}x${size.height}_${file.name.replace(/\.[^/.]+$/, '.webp')}`
        return new File([thumbnailBuffer], thumbnailName, { type: 'image/webp' })
      })
    )

    return thumbnails
  }
}
```

### Document Processing

```typescript
// lib/processors/document-processor.ts
import PDFLib from 'pdf-lib'

export class DocumentProcessor {
  static async optimizePDF(file: File): Promise<File> {
    const arrayBuffer = await file.arrayBuffer()
    const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer)

    // Remove metadata and compress
    pdfDoc.setTitle('')
    pdfDoc.setAuthor('')
    pdfDoc.setSubject('')
    pdfDoc.setKeywords([])
    pdfDoc.setProducer('')
    pdfDoc.setCreator('')

    // Compress PDF if it's large
    if (file.size > 5 * 1024 * 1024) { // 5MB
      // Apply compression techniques
      const compressedBytes = await pdfDoc.save({
        useObjectStreams: true,
        compress: true
      })

      return new File([compressedBytes], file.name, {
        type: 'application/pdf'
      })
    }

    return file
  }

  static async extractTextFromPDF(file: File): Promise<string> {
    // Use PDF.js or similar library to extract text for search indexing
    const arrayBuffer = await file.arrayBuffer()

    // This would integrate with a PDF text extraction service
    // For now, return placeholder
    return 'PDF text extraction not implemented'
  }

  static async generatePreview(file: File, pageNumber: number = 1): Promise<File> {
    // Generate preview image of first page
    const arrayBuffer = await file.arrayBuffer()

    // This would use a PDF to image conversion service
    // For now, return placeholder
    const previewBuffer = Buffer.from('placeholder')
    return new File([previewBuffer], `preview_${file.name}.png`, {
      type: 'image/png'
    })
  }
}
```

## Security and Access Control

### File Access Middleware

```typescript
// lib/security/file-access.ts
export class FileAccessControl {
  static async checkDocumentAccess(
    userId: string,
    documentId: string,
    requiredPermission: 'READ' | 'WRITE' | 'DELETE' = 'READ'
  ): Promise<boolean> {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        startup: {
          include: {
            founder: true
          }
        }
      }
    })

    if (!document) {
      return false
    }

    // Document owner has full access
    if (document.uploaded_by === userId) {
      return true
    }

    // Startup founder has access to startup documents
    if (document.startup.founder_id === userId) {
      return true
    }

    // Check if document is public
    if (document.is_public && requiredPermission === 'READ') {
      return true
    }

    // Check investment-based access
    if (requiredPermission === 'READ') {
      const hasInvestment = await prisma.investment.findFirst({
        where: {
          investor_id: userId,
          pitch_id: document.pitch_id,
          status: { in: ['ESCROW', 'COMPLETED'] }
        }
      })

      if (hasInvestment) {
        return true
      }
    }

    // Admin access
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (user?.role === 'ADMIN') {
      return true
    }

    return false
  }

  static generateSecureFileName(originalName: string): string {
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 15)
    const extension = originalName.split('.').pop()
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '')

    // Sanitize filename
    const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9-_]/g, '_')

    return `${timestamp}_${randomSuffix}_${sanitizedName}.${extension}`
  }
}
```

### Virus Scanning Integration

```typescript
// lib/security/virus-scanner.ts
import axios from 'axios'

export class VirusScanner {
  static async scanBuffer(buffer: ArrayBuffer): Promise<void> {
    // Integrate with virus scanning service (ClamAV, VirusTotal, etc.)
    const scanResult = await axios.post(
      `${process.env.VIRUS_SCAN_API_URL}/scan`,
      buffer,
      {
        headers: {
          'Authorization': `Bearer ${process.env.VIRUS_SCAN_API_KEY}`,
          'Content-Type': 'application/octet-stream'
        }
      }
    )

    if (scanResult.data.threats && scanResult.data.threats.length > 0) {
      throw new Error(`File contains threats: ${scanResult.data.threats.join(', ')}`)
    }
  }

  static async scanFile(file: File): Promise<void> {
    const arrayBuffer = await file.arrayBuffer()
    await this.scanBuffer(arrayBuffer)
  }
}
```

## CDN Integration

### Cloudflare CDN Configuration

```typescript
// lib/cdn/cloudflare.ts
export class CloudflareCDN {
  static async purgeFiles(keys: string[]): Promise<void> {
    await axios.post(
      `https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/purge_cache`,
      {
        files: keys.map(key => `https://cdn.angelinvesting.com/${key}`)
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    )
  }

  static async getCacheAnalytics(): Promise<any> {
    const response = await axios.get(
      `https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/analytics/dashboard`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`
        }
      }
    )

    return response.data
  }
}
```

## File Management API

### Upload Endpoints

```typescript
// routes/api/upload/documents.ts
import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { UploadService } from '@/lib/upload-service'
import { FileAccessControl } from '@/lib/security/file-access'

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })

    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const startupId = formData.get('startup_id') as string
    const fileType = formData.get('file_type') as string

    if (!file || !startupId || !fileType) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if user has permission to upload for this startup
    const hasAccess = await FileAccessControl.checkDocumentAccess(
      session.user.id,
      '', // No document ID for new upload
      'WRITE'
    )

    if (!hasAccess) {
      return Response.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const uploadService = new UploadService()
    const result = await uploadService.uploadDocument(
      file,
      session.user.id,
      startupId,
      fileType as any
    )

    return Response.json({
      document: result.document,
      url: result.url
    })

  } catch (error) {
    console.error('Upload failed:', error)
    return Response.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
  }
}
```

### File Access Endpoints

```typescript
// routes/api/files/[key].ts
import { NextRequest } from 'next/server'
import { S3StorageProvider } from '@/lib/storage-providers/aws-s3'
import { FileAccessControl } from '@/lib/security/file-access'

export async function GET(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })

    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const fileKey = params.key

    // Extract document ID from key or lookup in database
    // This is a simplified version
    const documentId = await getDocumentIdFromKey(fileKey)

    if (!documentId) {
      return Response.json({ error: 'File not found' }, { status: 404 })
    }

    // Check access permissions
    const hasAccess = await FileAccessControl.checkDocumentAccess(
      session.user.id,
      documentId,
      'READ'
    )

    if (!hasAccess) {
      return Response.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Generate signed URL
    const storageProvider = new S3StorageProvider()
    const url = await storageProvider.getFileUrl(fileKey, 3600) // 1 hour expiry

    return Response.redirect(url)

  } catch (error) {
    console.error('File access failed:', error)
    return Response.json(
      { error: 'File access failed' },
      { status: 500 }
    )
  }
}
```

## File Versioning and Backup

### Version Management

```typescript
// lib/file-versioning.ts
export class FileVersionManager {
  static async createVersion(
    originalDocumentId: string,
    newFile: File,
    userId: string,
    changeReason: string
  ): Promise<void> {
    // Create new document record
    const newDocument = await prisma.document.create({
      data: {
        startup_id: 'original_startup_id', // Get from original
        name: newFile.name,
        file_path: 'new_key',
        file_url: 'new_url',
        file_type: 'original_type',
        file_size: newFile.size,
        mime_type: newFile.type,
        uploaded_by: userId,
        version_of: originalDocumentId,
        version_number: await this.getNextVersionNumber(originalDocumentId),
        change_reason: changeReason
      }
    })

    // Update original document to point to latest version
    await prisma.document.update({
      where: { id: originalDocumentId },
      data: {
        latest_version_id: newDocument.id,
        is_latest: false
      }
    })
  }

  static async getDocumentVersions(documentId: string) {
    return prisma.document.findMany({
      where: {
        OR: [
          { id: documentId },
          { version_of: documentId }
        ]
      },
      orderBy: { version_number: 'desc' }
    })
  }
}
```

### Backup Strategy

```typescript
// lib/backup-service.ts
export class BackupService {
  static async createDailyBackup(): Promise<void> {
    // Create database backup
    await this.backupDatabase()

    // Create file storage backup
    await this.backupFileStorage()

    // Upload backups to secondary storage
    await this.uploadToSecondaryStorage()
  }

  static async restoreFromBackup(backupId: string): Promise<void> {
    // Restore database from backup
    await this.restoreDatabase(backupId)

    // Restore files from backup
    await this.restoreFileStorage(backupId)
  }

  private static async backupDatabase(): Promise<void> {
    // Use pg_dump or similar for PostgreSQL backup
    const { exec } = require('child_process')
    const backupPath = `/backups/db_${Date.now()}.sql`

    return new Promise((resolve, reject) => {
      exec(`pg_dump ${process.env.DATABASE_URL} > ${backupPath}`, (error: any) => {
        if (error) reject(error)
        else resolve(backupPath)
      })
    })
  }

  private static async backupFileStorage(): Promise<void> {
    // Sync S3 bucket to backup storage
    const backupPrefix = `backup_${Date.now()}/`

    // Use AWS CLI or SDK to copy files
    // This would copy all files to backup location
  }
}
```

## File Analytics and Monitoring

### File Usage Tracking

```typescript
// lib/analytics/file-analytics.ts
export class FileAnalyticsService {
  static async trackFileDownload(fileKey: string, userId: string): Promise<void> {
    // Track download event
    await prisma.file_download.create({
      data: {
        file_key: fileKey,
        user_id: userId,
        downloaded_at: new Date(),
        user_agent: 'browser_info',
        ip_address: 'user_ip'
      }
    })

    // Update download count in document record
    await prisma.document.updateMany({
      where: { file_path: fileKey },
      data: {
        download_count: {
          increment: 1
        }
      }
    })
  }

  static async getFileAnalytics(documentId: string): Promise<any> {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        _count: {
          select: {
            downloads: true
          }
        },
        downloads: {
          take: 100,
          orderBy: { downloaded_at: 'desc' }
        }
      }
    })

    return {
      totalDownloads: document?._count.downloads || 0,
      recentDownloads: document?.downloads || [],
      fileSize: document?.file_size,
      uploadDate: document?.created_at
    }
  }
}
```

This file upload and storage strategy provides a comprehensive, secure, and scalable foundation for managing all platform files, from pitch decks to legal documents, with proper access controls, processing capabilities, and monitoring.