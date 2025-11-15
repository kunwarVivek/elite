import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { sendSuccess } from '../utils/response.js';
import { logger } from '../config/logger.js';
import { fileUploadService } from '../services/fileUploadService.js';
import { prisma } from '../config/database.js';

// Types for better type safety
interface AuthRequest extends Request {
user?: {
  id: string;
email: string;
name?: string;
role: string;
};
}

interface Document {
  id: string;
  fileName: string;
  fileUrl: string;
  documentType: string;
  visibility: string;
  description?: string | null;
  tags?: any;
  fileSize: number;
  mimeType?: string | null;
  isPublic: boolean;
  requiresSignature: boolean;
  expiryDate?: Date | null;
  downloadCount: number;
  version: number;
  relatedEntity?: any;
  uploadedBy: string;
  uploadedAt: Date;
  updatedAt?: Date;
  signatures?: any;
}

interface DocumentTemplate {
  id: string;
  name: string;
  documentType: string;
  category: string;
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
}

interface UploadDocumentData {
  fileName: string;
  fileSize: number;
  mimeType: string;
  documentType: string;
  visibility?: string;
  description?: string;
  tags?: string[];
  relatedEntity: {
    type: string;
    id: string;
  };
  isPublic?: boolean;
  requiresSignature?: boolean;
  expiryDate?: string;
}

interface UpdateDocumentData {
  fileName?: string;
  documentType?: string;
  visibility?: string;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
  requiresSignature?: boolean;
  expiryDate?: string;
}

class DocumentController {
  // Upload document
  async uploadDocument(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      if (!req.file) {
        throw new AppError('Document file is required', 400, 'FILE_REQUIRED');
      }

      const documentData: UploadDocumentData = req.body;

      // Validate related entity exists
      await this.validateRelatedEntity(documentData.relatedEntity);

      // Upload file to storage
      const fileUrl = await fileUploadService.uploadFile(req.file, {
        folder: this.getFolderForDocumentType(documentData.documentType),
        allowedTypes: this.getAllowedTypesForDocumentType(documentData.documentType),
        maxSize: this.getMaxSizeForDocumentType(documentData.documentType),
      });

      // Create document record
      const document = await this.createDocumentInDb({
        ...documentData,
        fileName: req.file.originalname,
        fileUrl,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedBy: userId,
      });

      logger.info('Document uploaded', {
        documentId: document.id,
        fileName: document.fileName,
        uploadedBy: userId,
      });

      sendSuccess(res, {
        id: document.id,
        file_name: document.fileName,
        file_url: document.fileUrl,
        document_type: document.documentType,
        file_size: document.fileSize,
        uploaded_at: document.uploadedAt,
      }, 'Document uploaded successfully', 201);

    } catch (error) {
      next(error);
    }
  }

  // Get document by ID
  async getDocumentById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        throw new AppError('Document ID is required', 400, 'ID_REQUIRED');
      }

      const document = await this.findDocumentById(id);
      if (!document) {
        throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
      }

      // Check if user has access to document
      const hasAccess = await this.checkDocumentAccess(id, req.user?.id);
      if (!hasAccess) {
        throw new AppError('Not authorized to view this document', 403, 'NOT_AUTHORIZED');
      }

      // Track document view
      await this.trackDocumentView(id, {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        referrer: req.headers.referer,
      });

      sendSuccess(res, {
        id: document.id,
        file_name: document.fileName,
        file_url: document.fileUrl,
        document_type: document.documentType,
        visibility: document.visibility,
        description: document.description,
        tags: document.tags,
        file_size: document.fileSize,
        mime_type: document.mimeType,
        is_public: document.isPublic,
        requires_signature: document.requiresSignature,
        expiry_date: document.expiryDate,
        download_count: document.downloadCount,
        version: document.version,
        related_entity: document.relatedEntity,
        uploaded_by: document.uploadedBy,
        uploaded_at: document.uploadedAt,
        signatures: document.signatures,
      }, 'Document retrieved successfully');

    } catch (error) {
      next(error);
    }
  }

  // Update document
  async updateDocument(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;
      if (!id) {
        throw new AppError('Document ID is required', 400, 'ID_REQUIRED');
      }
      const updateData: UpdateDocumentData = req.body;

      // Check if user owns the document or is admin
      const document = await this.findDocumentById(id);
      if (!document) {
        throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
      }

      if (document.uploadedBy !== userId && req.user?.role !== 'ADMIN') {
        throw new AppError('Not authorized to update this document', 403, 'NOT_AUTHORIZED');
      }

      // Update document
      const updatedDocument = await this.updateDocumentInDb(id, updateData);

      logger.info('Document updated', { documentId: id, updatedBy: userId });

      sendSuccess(res, {
        id: updatedDocument.id,
        file_name: updatedDocument.fileName,
        document_type: updatedDocument.documentType,
        updated_at: updatedDocument.updatedAt,
      }, 'Document updated successfully');

    } catch (error) {
      next(error);
    }
  }

  // Delete document
  async deleteDocument(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;
      if (!id) {
        throw new AppError('Document ID is required', 400, 'ID_REQUIRED');
      }

      // Check if user owns the document or is admin
      const document = await this.findDocumentById(id);
      if (!document) {
        throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
      }

      if (document.uploadedBy !== userId && req.user?.role !== 'ADMIN') {
        throw new AppError('Not authorized to delete this document', 403, 'NOT_AUTHORIZED');
      }

      // Delete file from storage
      await fileUploadService.deleteFile(document.fileUrl);

      // Delete document record
      await this.deleteDocumentFromDb(id);

      logger.info('Document deleted', { documentId: id, deletedBy: userId });

      sendSuccess(res, null, 'Document deleted successfully');

    } catch (error) {
      next(error);
    }
  }

  // Download document
  async downloadDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        throw new AppError('Document ID is required', 400, 'ID_REQUIRED');
      }

      const document = await this.findDocumentById(id);
      if (!document) {
        throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
      }

      // Check if user has access to document
      const hasAccess = await this.checkDocumentAccess(id, req.user?.id);
      if (!hasAccess) {
        throw new AppError('Not authorized to download this document', 403, 'NOT_AUTHORIZED');
      }

      // Track download
      await this.trackDocumentDownload(id, {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        referrer: req.headers.referer,
        downloadReason: req.query.reason as string,
      });

      // Generate signed URL for download
      const downloadUrl = await fileUploadService.getSignedDownloadUrl(document.fileUrl);

      // Redirect to download URL or return JSON response
      if (req.headers.accept?.includes('application/json')) {
        sendSuccess(res, {
          download_url: downloadUrl,
          expires_in: 3600, // 1 hour
        }, 'Download URL generated successfully');
      } else {
        res.redirect(downloadUrl);
      }

    } catch (error) {
      next(error);
    }
  }

  // List documents
  async listDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const queryParams = req.query;
      const {
        documentType,
        visibility,
        relatedEntity,
        uploaderId,
        isPublic,
        requiresSignature,
        hasExpiry,
        search,
        tags,
        uploadedAfter,
        uploadedBefore,
        page,
        limit,
        sortBy,
        sortOrder,
      } = queryParams as any;

      const result = await this.getDocumentsList({
        documentType,
        visibility,
        relatedEntity,
        uploaderId,
        isPublic: isPublic === 'true',
        requiresSignature: requiresSignature === 'true',
        hasExpiry: hasExpiry === 'true',
        search,
        tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
        uploadedAfter,
        uploadedBefore,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        sortBy,
        sortOrder,
      });

      sendSuccess(res, {
        documents: result.documents,
        pagination: result.pagination,
      }, 'Documents retrieved successfully');

    } catch (error) {
      next(error);
    }
  }

  // Share document
  async shareDocument(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;
      if (!id) {
        throw new AppError('Document ID is required', 400, 'ID_REQUIRED');
      }
      const { shareWith, message, expiryDate, requireAcceptance } = req.body;

      // Check if user owns the document or is admin
      const document = await this.findDocumentById(id);
      if (!document) {
        throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
      }

      if (document.uploadedBy !== userId && req.user?.role !== 'ADMIN') {
        throw new AppError('Not authorized to share this document', 403, 'NOT_AUTHORIZED');
      }

      // Grant access to specified users
      const accessGrants = await this.grantDocumentAccess(id, shareWith, {
        grantedBy: userId,
        expiryDate,
        message,
        requireAcceptance,
      });

      logger.info('Document shared', {
        documentId: id,
        sharedWith: shareWith.map((s: any) => s.userId),
        sharedBy: userId,
      });

      sendSuccess(res, {
        document_id: id,
        shared_with: accessGrants.length,
        access_grants: accessGrants,
      }, 'Document shared successfully');

    } catch (error) {
      next(error);
    }
  }

  // Sign document
  async signDocument(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;
      if (!id) {
        throw new AppError('Document ID is required', 400, 'ID_REQUIRED');
      }
      const {
        signatureData,
        signatureType,
        signerName,
        signerTitle,
        signatureDate,
        ipAddress,
        location,
      } = req.body;

      // Check if document exists and requires signature
      const document = await this.findDocumentById(id);
      if (!document) {
        throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
      }

      if (!document.requiresSignature) {
        throw new AppError('Document does not require signature', 400, 'SIGNATURE_NOT_REQUIRED');
      }

      // Check if user has access to document
      const hasAccess = await this.checkDocumentAccess(id, userId);
      if (!hasAccess) {
        throw new AppError('Not authorized to sign this document', 403, 'NOT_AUTHORIZED');
      }

      // Check if user already signed the document
      const existingSignature = await this.findDocumentSignature(id, userId);
      if (existingSignature) {
        throw new AppError('Document already signed by user', 409, 'ALREADY_SIGNED');
      }

      // Create signature
      const signature = await this.createDocumentSignature(id, {
        signatureData,
        signatureType,
        signerName,
        signerTitle,
        signatureDate,
        ipAddress: ipAddress || req.ip,
        location,
        signedBy: userId,
      });

      logger.info('Document signed', {
        documentId: id,
        signedBy: userId,
        signatureId: signature.id,
      });

      sendSuccess(res, {
        id: signature.id,
        document_id: id,
        signature_type: signature.signatureType,
        signer_name: signature.signerName,
        signed_at: signature.signedAt,
      }, 'Document signed successfully', 201);

    } catch (error) {
      next(error);
    }
  }

  // Create document version
  async createDocumentVersion(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;
      if (!id) {
        throw new AppError('Document ID is required', 400, 'ID_REQUIRED');
      }
      const { version, changelog, isMajorVersion } = req.body;

      // Check if user owns the document or is admin
      const document = await this.findDocumentById(id);
      if (!document) {
        throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
      }

      if (document.uploadedBy !== userId && req.user?.role !== 'ADMIN') {
        throw new AppError('Not authorized to create document version', 403, 'NOT_AUTHORIZED');
      }

      if (!req.file) {
        throw new AppError('New document file is required', 400, 'FILE_REQUIRED');
      }

      // Upload new version file
      const fileUrl = await fileUploadService.uploadFile(req.file, {
        folder: this.getFolderForDocumentType(document.documentType),
        allowedTypes: this.getAllowedTypesForDocumentType(document.documentType),
        maxSize: this.getMaxSizeForDocumentType(document.documentType),
      });

      // Create new version
      const newVersion = await this.createDocumentVersionInDb(id, {
        version,
        fileName: req.file.originalname,
        fileUrl,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        changelog,
        isMajorVersion,
        createdBy: userId,
      });

      logger.info('Document version created', {
        documentId: id,
        versionId: newVersion.id,
        version,
        createdBy: userId,
      });

      sendSuccess(res, {
        id: newVersion.id,
        document_id: id,
        version: newVersion.version,
        file_name: newVersion.fileName,
        created_at: newVersion.createdAt,
      }, 'Document version created successfully', 201);

    } catch (error) {
      next(error);
    }
  }

  // Create document template
  async createDocumentTemplate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const templateData = req.body;

      if (!req.file) {
        throw new AppError('Template file is required', 400, 'FILE_REQUIRED');
      }

      // Upload template file
      const fileUrl = await fileUploadService.uploadFile(req.file, {
        folder: 'document-templates',
        allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        maxSize: 50 * 1024 * 1024, // 50MB
      });

      // Create template
      const template = await this.createDocumentTemplateInDb({
        ...templateData,
        fileUrl,
        createdBy: userId,
      });

      logger.info('Document template created', {
        templateId: template.id,
        createdBy: userId,
      });

      sendSuccess(res, {
        id: template.id,
        name: template.name,
        document_type: template.documentType,
        category: template.category,
        is_public: template.isPublic,
        created_at: template.createdAt,
      }, 'Document template created successfully', 201);

    } catch (error) {
      next(error);
    }
  }

  // Generate document from template
  async generateDocumentFromTemplate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { templateId, fieldValues, outputFileName, format } = req.body;

      // Get template
      const template = await this.findDocumentTemplateById(templateId);
      if (!template) {
        throw new AppError('Document template not found', 404, 'TEMPLATE_NOT_FOUND');
      }

      if (!template.isPublic && template.createdBy !== userId) {
        throw new AppError('Not authorized to use this template', 403, 'NOT_AUTHORIZED');
      }

      // Generate document from template
      const generatedDocument = await this.generateDocument({
        template,
        fieldValues,
        outputFileName,
        format,
        generatedBy: userId,
      });

      logger.info('Document generated from template', {
        templateId,
        generatedDocumentId: generatedDocument.id,
        generatedBy: userId,
      });

      sendSuccess(res, {
        id: generatedDocument.id,
        file_name: generatedDocument.fileName,
        file_url: generatedDocument.fileUrl,
        generated_at: generatedDocument.generatedAt,
      }, 'Document generated successfully', 201);

    } catch (error) {
      next(error);
    }
  }

  // Helper methods
  private getFolderForDocumentType(documentType: string): string {
    const folderMap: Record<string, string> = {
      'PITCH_DECK': 'pitch-decks',
      'BUSINESS_PLAN': 'business-plans',
      'FINANCIAL_PROJECTIONS': 'financial-projections',
      'INVESTMENT_AGREEMENT': 'investment-agreements',
      'KYC': 'kyc-documents',
      'PASSPORT': 'kyc-documents',
      'DRIVERS_LICENSE': 'kyc-documents',
    };
    return folderMap[documentType] || 'documents';
  }

  private getAllowedTypesForDocumentType(documentType: string): string[] {
    const typeMap: Record<string, string[]> = {
      'PITCH_DECK': ['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
      'BUSINESS_PLAN': ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      'FINANCIAL_PROJECTIONS': ['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      'KYC': ['image/jpeg', 'image/png', 'application/pdf'],
    };
    return typeMap[documentType] || ['application/pdf', 'image/jpeg', 'image/png'];
  }

  private getMaxSizeForDocumentType(documentType: string): number {
    const sizeMap: Record<string, number> = {
      'PITCH_DECK': 50 * 1024 * 1024, // 50MB
      'BUSINESS_PLAN': 25 * 1024 * 1024, // 25MB
      'KYC': 10 * 1024 * 1024, // 10MB
    };
    return sizeMap[documentType] || 10 * 1024 * 1024; // 10MB default
  }

  /**
   * Validate that the related entity exists in the database
   */
  private async validateRelatedEntity(relatedEntity: { type: string; id: string }) {
    if (!relatedEntity || !relatedEntity.type || !relatedEntity.id) {
      return; // Optional validation
    }

    const { type, id } = relatedEntity;

    try {
      switch (type.toUpperCase()) {
        case 'STARTUP':
          const startup = await prisma.startup.findUnique({ where: { id } });
          if (!startup) {
            throw new AppError(`Startup with ID ${id} not found`, 404, 'RELATED_ENTITY_NOT_FOUND');
          }
          break;
        case 'PITCH':
          const pitch = await prisma.pitch.findUnique({ where: { id } });
          if (!pitch) {
            throw new AppError(`Pitch with ID ${id} not found`, 404, 'RELATED_ENTITY_NOT_FOUND');
          }
          break;
        case 'INVESTMENT':
          const investment = await prisma.investment.findUnique({ where: { id } });
          if (!investment) {
            throw new AppError(`Investment with ID ${id} not found`, 404, 'RELATED_ENTITY_NOT_FOUND');
          }
          break;
        default:
          logger.warn(`Unknown related entity type: ${type}`);
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error validating related entity', { error, relatedEntity });
      throw new AppError('Failed to validate related entity', 500, 'VALIDATION_ERROR');
    }
  }

  /**
   * Check if user has access to document based on visibility and permissions
   */
  private async checkDocumentAccess(documentId: string, userId?: string): Promise<boolean> {
    try {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: {
          accessGrants: {
            where: {
              userId: userId || '',
              OR: [
                { expiryDate: null },
                { expiryDate: { gte: new Date() } }
              ]
            }
          }
        }
      });

      if (!document) {
        return false;
      }

      // Public documents are accessible to all
      if (document.isPublic || document.visibility === 'PUBLIC') {
        return true;
      }

      // No user ID provided for private document
      if (!userId) {
        return false;
      }

      // Check if user is the uploader
      if (document.uploadedBy === userId) {
        return true;
      }

      // Check if user has been granted access
      if (document.accessGrants.length > 0) {
        return true;
      }

      // Check visibility rules
      if (document.visibility === 'INVESTORS_ONLY') {
        // Check if user is an investor in the related startup/pitch
        if (document.pitchId) {
          const investment = await prisma.investment.findFirst({
            where: {
              pitchId: document.pitchId,
              investorId: userId
            }
          });
          return !!investment;
        }
      }

      return false;
    } catch (error) {
      logger.error('Error checking document access', { error, documentId, userId });
      return false;
    }
  }

  /**
   * Track document view activity
   */
  private async trackDocumentView(documentId: string, viewData: any) {
    try {
      await prisma.documentActivity.create({
        data: {
          documentId,
          userId: viewData.userId,
          activityType: 'VIEW',
          metadata: {
            userAgent: viewData.userAgent,
            referrer: viewData.referrer
          },
          ipAddress: viewData.ipAddress,
          userAgent: viewData.userAgent
        }
      });

      logger.debug('Document view tracked', { documentId });
    } catch (error) {
      logger.error('Error tracking document view', { error, documentId });
      // Don't throw error - tracking failure shouldn't block the request
    }
  }

  /**
   * Track document download activity
   */
  private async trackDocumentDownload(documentId: string, downloadData: any) {
    try {
      await Promise.all([
        // Create activity record
        prisma.documentActivity.create({
          data: {
            documentId,
            userId: downloadData.userId,
            activityType: 'DOWNLOAD',
            metadata: {
              userAgent: downloadData.userAgent,
              referrer: downloadData.referrer,
              downloadReason: downloadData.downloadReason
            },
            ipAddress: downloadData.ipAddress,
            userAgent: downloadData.userAgent
          }
        }),
        // Increment download count
        prisma.document.update({
          where: { id: documentId },
          data: { downloadCount: { increment: 1 } }
        })
      ]);

      logger.debug('Document download tracked', { documentId });
    } catch (error) {
      logger.error('Error tracking document download', { error, documentId });
      // Don't throw error - tracking failure shouldn't block the request
    }
  }

  /**
   * Grant document access to specified users
   */
  private async grantDocumentAccess(documentId: string, shareWith: any[], accessData: any) {
    try {
      const accessGrants = await Promise.all(
        shareWith.map(async (share: any) => {
          return await prisma.documentAccess.upsert({
            where: {
              documentId_userId: {
                documentId,
                userId: share.userId
              }
            },
            create: {
              documentId,
              userId: share.userId,
              grantedBy: accessData.grantedBy,
              permission: share.permission || 'VIEW',
              expiryDate: accessData.expiryDate ? new Date(accessData.expiryDate) : null,
              message: accessData.message,
              requireAcceptance: accessData.requireAcceptance || false
            },
            update: {
              permission: share.permission || 'VIEW',
              expiryDate: accessData.expiryDate ? new Date(accessData.expiryDate) : null,
              message: accessData.message,
              requireAcceptance: accessData.requireAcceptance || false
            }
          });
        })
      );

      // Track sharing activity
      await prisma.documentActivity.create({
        data: {
          documentId,
          userId: accessData.grantedBy,
          activityType: 'SHARE',
          metadata: {
            sharedWith: shareWith.map((s: any) => s.userId),
            message: accessData.message
          }
        }
      });

      return accessGrants;
    } catch (error) {
      logger.error('Error granting document access', { error, documentId });
      throw new AppError('Failed to grant document access', 500, 'ACCESS_GRANT_ERROR');
    }
  }

  /**
   * Find existing signature for a document by a specific user
   */
  private async findDocumentSignature(documentId: string, userId: string) {
    try {
      return await prisma.documentSignatureRecord.findFirst({
        where: {
          documentId,
          signedBy: userId
        }
      });
    } catch (error) {
      logger.error('Error finding document signature', { error, documentId, userId });
      return null;
    }
  }

  /**
   * Create a new document signature record
   */
  private async createDocumentSignature(documentId: string, signatureData: any) {
    try {
      const signature = await prisma.documentSignatureRecord.create({
        data: {
          documentId,
          signedBy: signatureData.signedBy,
          signatureData: signatureData.signatureData,
          signatureType: signatureData.signatureType || 'ELECTRONIC',
          signerName: signatureData.signerName,
          signerTitle: signatureData.signerTitle,
          ipAddress: signatureData.ipAddress,
          location: signatureData.location,
          signedAt: signatureData.signatureDate ? new Date(signatureData.signatureDate) : new Date()
        }
      });

      logger.info('Document signature created', { signatureId: signature.id, documentId });
      return signature;
    } catch (error) {
      logger.error('Error creating document signature', { error, documentId });
      throw new AppError('Failed to create document signature', 500, 'SIGNATURE_CREATE_ERROR');
    }
  }

  /**
   * Find document template by ID
   */
  private async findDocumentTemplateById(id: string): Promise<DocumentTemplate | null> {
    try {
      const template = await prisma.documentTemplate.findUnique({
        where: { id }
      });
      return template as DocumentTemplate | null;
    } catch (error) {
      logger.error('Error finding document template', { error, id });
      return null;
    }
  }

  /**
   * Generate document from template with variable substitution
   */
  private async generateDocument(generateData: any) {
    try {
      const { template, fieldValues, outputFileName, format, generatedBy } = generateData;

      // Simple variable substitution ({{variable}} syntax)
      // In production, use a proper template engine
      const fileContent = await this.substituteTemplateVariables(
        template.templateUrl,
        fieldValues
      );

      // Upload generated document
      const fileBuffer = Buffer.from(fileContent);
      const mockFile = {
        originalname: outputFileName || `${template.name}_${Date.now()}.pdf`,
        buffer: fileBuffer,
        size: fileBuffer.length,
        mimetype: format === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf'
      } as any;

      const fileUrl = await fileUploadService.uploadFile(mockFile, {
        folder: 'generated-documents',
        allowedTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        maxSize: 50 * 1024 * 1024
      });

      // Create document generation record
      const generation = await prisma.documentGeneration.create({
        data: {
          templateId: template.id,
          mergeData: fieldValues,
          documentUrl: fileUrl,
          status: 'DRAFT'
        }
      });

      // Update template use count
      await prisma.documentTemplate.update({
        where: { id: template.id },
        data: { useCount: { increment: 1 } }
      });

      return {
        id: generation.id,
        fileName: outputFileName,
        fileUrl,
        generatedAt: generation.generatedAt
      };
    } catch (error) {
      logger.error('Error generating document', { error, templateId: generateData.template?.id });
      throw new AppError('Failed to generate document from template', 500, 'DOCUMENT_GENERATION_ERROR');
    }
  }

  /**
   * Simple template variable substitution
   */
  private async substituteTemplateVariables(templateUrl: string, variables: any): Promise<string> {
    // Placeholder implementation - in production, download template and process it
    // For now, return a simple text representation
    let content = `Document generated from template\n\n`;

    for (const [key, value] of Object.entries(variables)) {
      content += `${key}: ${value}\n`;
    }

    return content;
  }

  // Database operations
  /**
   * Find document by ID with related data
   */
  private async findDocumentById(id: string): Promise<Document | null> {
    try {
      const document = await prisma.document.findUnique({
        where: { id },
        include: {
          accessGrants: true,
          versions: true,
          documentSignatures: true
        }
      });

      return document as Document | null;
    } catch (error) {
      logger.error('Error finding document', { error, id });
      return null;
    }
  }

  /**
   * Create new document in database
   */
  private async createDocumentInDb(documentData: any) {
    try {
      // Extract startupId from relatedEntity if not provided
      let startupId = documentData.startupId;
      if (!startupId && documentData.relatedEntity?.type === 'STARTUP') {
        startupId = documentData.relatedEntity.id;
      }

      // If still no startupId, try to get from pitch
      if (!startupId && documentData.pitchId) {
        const pitch = await prisma.pitch.findUnique({
          where: { id: documentData.pitchId },
          select: { startupId: true }
        });
        if (pitch) {
          startupId = pitch.startupId;
        }
      }

      if (!startupId) {
        throw new AppError('Startup ID is required for document creation', 400, 'STARTUP_ID_REQUIRED');
      }

      const document = await prisma.document.create({
        data: {
          startupId,
          pitchId: documentData.pitchId || null,
          name: documentData.fileName,
          fileName: documentData.fileName,
          filePath: documentData.fileUrl,
          fileUrl: documentData.fileUrl,
          fileType: this.mapDocumentTypeToFileType(documentData.documentType),
          documentType: documentData.documentType,
          fileSize: documentData.fileSize,
          mimeType: documentData.mimeType,
          isPublic: documentData.isPublic || false,
          visibility: documentData.visibility || 'PRIVATE',
          description: documentData.description,
          tags: documentData.tags || [],
          requiresSignature: documentData.requiresSignature || false,
          expiryDate: documentData.expiryDate ? new Date(documentData.expiryDate) : null,
          relatedEntity: documentData.relatedEntity || null,
          uploadedBy: documentData.uploadedBy
        }
      });

      logger.info('Document created in database', { documentId: document.id });
      return document;
    } catch (error) {
      logger.error('Error creating document in database', { error });
      throw error instanceof AppError ? error : new AppError('Failed to create document', 500, 'DOCUMENT_CREATE_ERROR');
    }
  }

  /**
   * Map documentType string to DocumentType enum
   */
  private mapDocumentTypeToFileType(documentType: string): any {
    const typeMap: Record<string, string> = {
      'PITCH_DECK': 'PITCH_DECK',
      'BUSINESS_PLAN': 'BUSINESS_PLAN',
      'FINANCIAL_PROJECTIONS': 'FINANCIAL_STATEMENT',
      'FINANCIAL_STATEMENT': 'FINANCIAL_STATEMENT',
      'INVESTMENT_AGREEMENT': 'LEGAL_DOCUMENT',
      'KYC': 'OTHER',
      'PASSPORT': 'OTHER',
      'DRIVERS_LICENSE': 'OTHER'
    };
    return typeMap[documentType] || 'OTHER';
  }

  /**
   * Update document in database
   */
  private async updateDocumentInDb(id: string, updateData: any) {
    try {
      const document = await prisma.document.update({
        where: { id },
        data: {
          name: updateData.fileName,
          fileName: updateData.fileName,
          documentType: updateData.documentType,
          visibility: updateData.visibility,
          description: updateData.description,
          tags: updateData.tags,
          isPublic: updateData.isPublic,
          requiresSignature: updateData.requiresSignature,
          expiryDate: updateData.expiryDate ? new Date(updateData.expiryDate) : undefined
        }
      });

      logger.info('Document updated in database', { documentId: id });
      return document;
    } catch (error) {
      logger.error('Error updating document in database', { error, id });
      throw new AppError('Failed to update document', 500, 'DOCUMENT_UPDATE_ERROR');
    }
  }

  /**
   * Delete document from database
   */
  private async deleteDocumentFromDb(id: string) {
    try {
      await prisma.document.delete({
        where: { id }
      });

      logger.info('Document deleted from database', { documentId: id });
    } catch (error) {
      logger.error('Error deleting document from database', { error, id });
      throw new AppError('Failed to delete document', 500, 'DOCUMENT_DELETE_ERROR');
    }
  }

  /**
   * Create new document version
   */
  private async createDocumentVersionInDb(documentId: string, versionData: any) {
    try {
      // Get current document to determine next version number
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: {
          versions: {
            orderBy: { version: 'desc' },
            take: 1
          }
        }
      });

      if (!document) {
        throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
      }

      const nextVersion = versionData.version || ((document.versions[0]?.version || document.version) + 1);

      const version = await prisma.documentVersion.create({
        data: {
          documentId,
          version: nextVersion,
          fileName: versionData.fileName,
          fileUrl: versionData.fileUrl,
          fileSize: versionData.fileSize,
          mimeType: versionData.mimeType,
          changelog: versionData.changelog,
          isMajorVersion: versionData.isMajorVersion || false,
          createdBy: versionData.createdBy
        }
      });

      // Update document's current version
      await prisma.document.update({
        where: { id: documentId },
        data: {
          version: nextVersion,
          fileUrl: versionData.fileUrl,
          fileName: versionData.fileName
        }
      });

      // Track version creation
      await prisma.documentActivity.create({
        data: {
          documentId,
          userId: versionData.createdBy,
          activityType: 'VERSION_CREATE',
          metadata: {
            version: nextVersion,
            changelog: versionData.changelog
          }
        }
      });

      logger.info('Document version created', { documentId, versionId: version.id });
      return version;
    } catch (error) {
      logger.error('Error creating document version', { error, documentId });
      throw error instanceof AppError ? error : new AppError('Failed to create document version', 500, 'VERSION_CREATE_ERROR');
    }
  }

  /**
   * Create document template
   */
  private async createDocumentTemplateInDb(templateData: any) {
    try {
      const template = await prisma.documentTemplate.create({
        data: {
          name: templateData.name,
          documentType: templateData.documentType,
          category: templateData.category || 'OTHER',
          jurisdictions: templateData.jurisdictions || [],
          version: templateData.version || '1.0',
          templateUrl: templateData.fileUrl,
          fileUrl: templateData.fileUrl,
          variableFields: templateData.variableFields || {},
          isPublic: templateData.isPublic || false,
          createdBy: templateData.createdBy
        }
      });

      logger.info('Document template created', { templateId: template.id });
      return template;
    } catch (error) {
      logger.error('Error creating document template', { error });
      throw new AppError('Failed to create document template', 500, 'TEMPLATE_CREATE_ERROR');
    }
  }

  /**
   * Get paginated and filtered list of documents
   */
  private async getDocumentsList(filters: any) {
    try {
      const {
        documentType,
        visibility,
        relatedEntity,
        uploaderId,
        isPublic,
        requiresSignature,
        hasExpiry,
        search,
        tags,
        uploadedAfter,
        uploadedBefore,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      // Build where clause
      const where: any = {};

      if (documentType) {
        where.documentType = documentType;
      }

      if (visibility) {
        where.visibility = visibility;
      }

      if (uploaderId) {
        where.uploadedBy = uploaderId;
      }

      if (typeof isPublic === 'boolean') {
        where.isPublic = isPublic;
      }

      if (typeof requiresSignature === 'boolean') {
        where.requiresSignature = requiresSignature;
      }

      if (hasExpiry) {
        where.expiryDate = { not: null };
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { fileName: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }

      if (tags && tags.length > 0) {
        where.tags = { hasSome: tags };
      }

      if (uploadedAfter) {
        where.uploadedAt = { ...where.uploadedAt, gte: new Date(uploadedAfter) };
      }

      if (uploadedBefore) {
        where.uploadedAt = { ...where.uploadedAt, lte: new Date(uploadedBefore) };
      }

      if (relatedEntity) {
        const relEntity = typeof relatedEntity === 'string' ? JSON.parse(relatedEntity) : relatedEntity;
        if (relEntity.type === 'STARTUP') {
          where.startupId = relEntity.id;
        } else if (relEntity.type === 'PITCH') {
          where.pitchId = relEntity.id;
        }
      }

      // Get total count
      const total = await prisma.document.count({ where });

      // Get documents
      const documents = await prisma.document.findMany({
        where,
        include: {
          uploader: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          documentSignatures: {
            select: {
              id: true,
              signerName: true,
              signedAt: true
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit
      });

      return {
        documents,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting documents list', { error, filters });
      throw new AppError('Failed to retrieve documents', 500, 'DOCUMENTS_LIST_ERROR');
    }
  }
}

// Export singleton instance
export const documentController = new DocumentController();
export default documentController;