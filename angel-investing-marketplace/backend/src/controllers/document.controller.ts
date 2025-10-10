import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { sendSuccess } from '../utils/response.js';
import { logger } from '../config/logger.js';
import { fileUploadService } from '../services/fileUploadService.js';

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

  private async validateRelatedEntity(_relatedEntity: { type: string; id: string }) {
    // TODO: Validate that the related entity exists
  }

  private async checkDocumentAccess(_documentId: string, _userId?: string): Promise<boolean> {
    // TODO: Check if user has access to document
    return true;
  }

  private async trackDocumentView(_documentId: string, _viewData: any) {
    // TODO: Track document view
  }

  private async trackDocumentDownload(_documentId: string, _downloadData: any) {
    // TODO: Track document download
  }

  private async grantDocumentAccess(_documentId: string, _shareWith: any[], _accessData: any) {
    // TODO: Grant document access to users
    return [];
  }

  private async findDocumentSignature(_documentId: string, _userId: string) {
    // TODO: Find existing signature
    return null;
  }

  private async createDocumentSignature(_documentId: string, signatureData: any) {
    // TODO: Create document signature
    return {
      id: 'signature_123',
      ...signatureData,
      signedAt: new Date(),
    };
  }

  private async findDocumentTemplateById(_id: string): Promise<DocumentTemplate | null> {
    // TODO: Find document template
    // For MVP, return null (template operations will be mocked)
    return null;
  }

  private async generateDocument(generateData: any) {
    // TODO: Generate document from template
    return {
      id: 'generated_doc_123',
      fileName: generateData.outputFileName,
      fileUrl: 'https://example.com/generated-document.pdf',
      generatedAt: new Date(),
    };
  }

  // Database operations (these would typically be in a service layer)
  private async findDocumentById(_id: string): Promise<Document | null> {
    // TODO: Implement database query
    // For MVP, return null (document operations will be mocked)
    return null;
  }

  private async createDocumentInDb(documentData: any) {
    // TODO: Implement database insert
    return {
      id: 'document_123',
      ...documentData,
      uploadedAt: new Date(),
    };
  }

  private async updateDocumentInDb(_id: string, updateData: any) {
    // TODO: Implement database update
    return {
      id: _id,
      ...updateData,
      updatedAt: new Date(),
    };
  }

  private async deleteDocumentFromDb(_id: string) {
    // TODO: Implement database delete
  }

  private async createDocumentVersionInDb(_documentId: string, versionData: any) {
    // TODO: Implement database insert
    return {
      id: 'version_123',
      documentId: _documentId,
      ...versionData,
      createdAt: new Date(),
    };
  }

  private async createDocumentTemplateInDb(templateData: any) {
    // TODO: Implement database insert
    return {
      id: 'template_123',
      ...templateData,
      createdAt: new Date(),
    };
  }

  private async getDocumentsList(_filters: any) {
    // TODO: Implement database query with filters
    return {
      documents: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },
    };
  }
}

// Export singleton instance
export const documentController = new DocumentController();
export default documentController;