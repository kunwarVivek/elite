import { Router } from 'express';
import { logger } from '../config/logger.js';

// Import route modules
import healthRoutes from './health.js';
import authRoutes from './auth.js';
import userRoutes from './user.routes.js';
import startupRoutes from './startup.routes.js';
import pitchRoutes from './pitch.routes.js';
import investmentRoutes from './investment.routes.js';
import paymentRoutes from './payment.routes.js';
import portfolioRoutes from './portfolio.routes.js';
import syndicateRoutes from './syndicate.routes.js';
import messageRoutes from './message.routes.js';
import documentRoutes from './document.routes.js';
import notificationRoutes from './notification.routes.js';
import accreditationRoutes from './accreditation.routes.js';
import complianceRoutes from './compliance.routes.js';
import taxRoutes from './tax.routes.js';
import adminApprovalRoutes from './admin-approval.routes.js';
import companyUpdateRoutes from './company-update.routes.js';
import marketplaceRoutes from './marketplace.routes.js';
import socialRoutes from './social.routes.js';

// Create main router
const router = Router();

// API versioning middleware
export const apiVersion = (version: string) => {
  return (req: any, res: any, next: any) => {
    req.apiVersion = version;
    res.setHeader('API-Version', version);
    next();
  };
};

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Angel Investing Marketplace API',
      version: 'v1',
      description: 'B2C SaaS angel investing marketplace backend API',
      documentation: '/api/docs',
      health: '/api/health',
      endpoints: {
        auth: '/api/auth',
        users: '/api/users',
        startups: '/api/startups',
        investments: '/api/investments',
        payments: '/api/payments',
        portfolio: '/api/portfolio',
        syndicates: '/api/syndicates',
        accreditation: '/api/accreditation',
        compliance: '/api/compliance',
        tax: '/api/tax',
        adminApprovals: '/api/admin/approvals',
        updates: '/api/updates',
        marketplace: '/api/marketplace',
        messages: '/api/messages',
        notifications: '/api/notifications',
      },
    },
  });
});

// Mount health check routes (no versioning needed for health checks)
router.use('/health', healthRoutes);

// Mount API routes with versioning
router.use('/auth', apiVersion('v1'), authRoutes);
router.use('/users', apiVersion('v1'), userRoutes);
router.use('/startups', apiVersion('v1'), startupRoutes);
router.use('/pitches', apiVersion('v1'), pitchRoutes);
router.use('/investments', apiVersion('v1'), investmentRoutes);
router.use('/payments', apiVersion('v1'), paymentRoutes);
router.use('/portfolio', apiVersion('v1'), portfolioRoutes);
router.use('/syndicates', apiVersion('v1'), syndicateRoutes);
router.use('/accreditation', apiVersion('v1'), accreditationRoutes);
router.use('/compliance', apiVersion('v1'), complianceRoutes);
router.use('/tax', apiVersion('v1'), taxRoutes);
router.use('/admin/approvals', apiVersion('v1'), adminApprovalRoutes);
router.use('/updates', apiVersion('v1'), companyUpdateRoutes);
router.use('/marketplace', apiVersion('v1'), marketplaceRoutes);
router.use('/social', apiVersion('v1'), socialRoutes);
router.use('/messages', apiVersion('v1'), messageRoutes);
router.use('/documents', apiVersion('v1'), documentRoutes);
router.use('/notifications', apiVersion('v1'), notificationRoutes);

// API documentation endpoint (placeholder)
router.get('/docs', (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'API documentation coming soon',
      swagger: 'Coming soon',
      postman: 'Coming soon',
    },
  });
});

// 404 handler for API routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      'GET /api/',
      'POST /api/auth/*',
      // Add other endpoints as they are implemented
    ],
  });
});

export default router;