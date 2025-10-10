import { Router } from 'express';
import { messageController } from '../controllers/message.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validation.js';
import { upload } from '../middleware/fileUpload.js';
import {
  sqlInjectionPrevention,
  xssPrevention,
  inputSanitization
} from '../middleware/security.js';
import {
  sendMessageSchema,
  replyMessageSchema,
  markMessageReadSchema,
  archiveConversationSchema,
  messageListQuerySchema,
  conversationListQuerySchema,
  bulkMessageActionSchema,
  messageTemplateSchema,
  useMessageTemplateSchema,
  messageNotificationPreferencesSchema,
} from '../validations/message.validation.js';

const router = Router();

// Apply security middleware
router.use(sqlInjectionPrevention);
router.use(xssPrevention);
router.use(inputSanitization);

// All message routes require authentication
router.use(authenticate);

// Get conversations
router.get('/conversations', validateBody(conversationListQuerySchema), messageController.getConversations.bind(messageController));

// Get conversation by ID
router.get('/conversations/:id', messageController.getConversation.bind(messageController));

// Send message
router.post('/', upload.array('attachments', 5), validateBody(sendMessageSchema), messageController.sendMessage.bind(messageController));

// Reply to message
router.post('/:id/reply', upload.array('attachments', 5), validateBody(replyMessageSchema), messageController.replyToMessage.bind(messageController));

// Mark messages as read
router.put('/read', validateBody(markMessageReadSchema), messageController.markAsRead.bind(messageController));

// Archive conversation
router.put('/conversations/:id/archive', validateBody(archiveConversationSchema), messageController.archiveConversation.bind(messageController));

// Get messages list
router.get('/', validateBody(messageListQuerySchema), messageController.getMessages.bind(messageController));

// Bulk message actions
router.post('/bulk-action', validateBody(bulkMessageActionSchema), messageController.bulkMessageAction.bind(messageController));

// Message templates
router.post('/templates', validateBody(messageTemplateSchema), messageController.createMessageTemplate.bind(messageController));
router.post('/templates/use', validateBody(useMessageTemplateSchema), messageController.useMessageTemplate.bind(messageController));

// Notification preferences
router.get('/preferences', messageController.getNotificationPreferences.bind(messageController));
router.put('/preferences', validateBody(messageNotificationPreferencesSchema), messageController.updateNotificationPreferences.bind(messageController));

export default router;