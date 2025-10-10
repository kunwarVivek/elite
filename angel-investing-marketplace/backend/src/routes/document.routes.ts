import { Router } from 'express';
import { documentController } from '../controllers/document.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validation.js';
import { upload } from '../middleware/fileUpload.js';
import {
  uploadRateLimiter,
  sqlInjectionPrevention,
  xssPrevention,
  inputSanitization
} from '../middleware/security.js';
import {
  uploadDocumentSchema,
  updateDocumentSchema,
  documentAccessSchema,
  documentListQuerySchema,
  documentVersionSchema,
  bulkDocumentOperationSchema,
  documentDownloadSchema,
  documentSignatureSchema,
  documentSharingSchema,
  documentTemplateSchema,
  generateDocumentFromTemplateSchema,
} from '../validations/document.validation.js';

const router = Router();

// Public routes (no authentication required for public documents)
router.get('/:id/download', documentController.downloadDocument.bind(documentController));

// Apply security middleware
router.use(uploadRateLimiter);
router.use(sqlInjectionPrevention);
router.use(xssPrevention);
router.use(inputSanitization);

// All other document routes require authentication
router.use(authenticate);

// Upload document
router.post('/upload', upload.single('file'), validateBody(uploadDocumentSchema), documentController.uploadDocument.bind(documentController));

// List documents
router.get('/', validateBody(documentListQuerySchema), documentController.listDocuments.bind(documentController));

// Get document by ID
router.get('/:id', documentController.getDocumentById.bind(documentController));

// Update document
router.put('/:id', validateBody(updateDocumentSchema), documentController.updateDocument.bind(documentController));

// Delete document
router.delete('/:id', documentController.deleteDocument.bind(documentController));

// Share document
router.post('/:id/share', validateBody(documentSharingSchema), documentController.shareDocument.bind(documentController));

// Sign document
router.post('/:id/sign', validateBody(documentSignatureSchema), documentController.signDocument.bind(documentController));

// Create document version
router.post('/:id/versions', upload.single('file'), validateBody(documentVersionSchema), documentController.createDocumentVersion.bind(documentController));

// Document templates
router.post('/templates', upload.single('file'), validateBody(documentTemplateSchema), documentController.createDocumentTemplate.bind(documentController));
router.post('/templates/generate', validateBody(generateDocumentFromTemplateSchema), documentController.generateDocumentFromTemplate.bind(documentController));

export default router;