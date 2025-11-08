import { Router } from 'express';
import { searchController } from '../controllers/search.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All search routes require authentication
router.use(authenticate);

// Global search
router.get('/', searchController.globalSearch.bind(searchController));

export default router;
