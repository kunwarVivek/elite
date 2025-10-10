import { Router } from 'express';
import auth from '../config/auth.js';
import { authenticate } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/security.js';
import { validateBody } from '../middleware/validation.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { logger } from '../config/logger.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
  socialLoginSchema,
  updateProfileSchema,
} from '../validations/auth.js';

const router = Router();

// Apply rate limiting to all auth routes
router.use(authRateLimiter);

// Better-Auth handlers (automatically handles most auth routes)
router.use(auth.handler);

// Custom auth endpoints
router.post('/register', validateBody(registerSchema), async (req, res, next) => {
  try {
    // Better-Auth handles registration, but we can add custom logic here
    logger.info('User registration attempt', { email: req.validated?.body.email });

    // For now, we'll use Better-Auth's built-in registration
    // In a real app, you might want to add additional validation or processing

    res.status(200).json({
      success: true,
      message: 'Registration endpoint - handled by Better-Auth',
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', validateBody(loginSchema), async (req, res, next) => {
  try {
    logger.info('User login attempt', { email: req.validated?.body.email });

    // Better-Auth handles login, but we can add custom logic here
    res.status(200).json({
      success: true,
      message: 'Login endpoint - handled by Better-Auth',
    });
  } catch (error) {
    next(error);
  }
});

router.post('/forgot-password', validateBody(forgotPasswordSchema), async (req, res, next) => {
  try {
    logger.info('Password reset request', { email: req.validated?.body.email });

    // Better-Auth handles forgot password
    res.status(200).json({
      success: true,
      message: 'Password reset email sent if account exists',
    });
  } catch (error) {
    next(error);
  }
});

router.post('/reset-password', validateBody(resetPasswordSchema), async (req, res, next) => {
  try {
    logger.info('Password reset attempt');

    // Better-Auth handles password reset
    res.status(200).json({
      success: true,
      message: 'Password reset endpoint - handled by Better-Auth',
    });
  } catch (error) {
    next(error);
  }
});

router.post('/verify-email', validateBody(verifyEmailSchema), async (req, res, next) => {
  try {
    logger.info('Email verification attempt');

    // Better-Auth handles email verification
    res.status(200).json({
      success: true,
      message: 'Email verification endpoint - handled by Better-Auth',
    });
  } catch (error) {
    next(error);
  }
});

router.post('/change-password', authenticate, validateBody(changePasswordSchema), async (req, res, next) => {
  try {
    logger.info('Password change attempt', { userId: req.user?.id });

    // Better-Auth handles password changes
    res.status(200).json({
      success: true,
      message: 'Password change endpoint - handled by Better-Auth',
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    logger.info('Profile request', { userId: req.user?.id });

    // Return current user profile
    sendSuccess(res, {
      id: req.user!.id,
      email: req.user!.email,
      name: req.user!.name,
      role: req.user!.role,
    }, 'Profile retrieved successfully');
  } catch (error) {
    next(error);
  }
});

router.put('/me', authenticate, validateBody(updateProfileSchema), async (req, res, next) => {
  try {
    logger.info('Profile update attempt', { userId: req.user?.id });

    // TODO: Implement profile update logic
    sendSuccess(res, req.validated?.body, 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
});

router.post('/logout', authenticate, async (req, res, next) => {
  try {
    logger.info('User logout', { userId: req.user?.id });

    // Better-Auth handles logout
    res.status(200).json({
      success: true,
      message: 'Logout endpoint - handled by Better-Auth',
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/me', authenticate, async (req, res, next) => {
  try {
    logger.info('Account deletion request', { userId: req.user?.id });

    // Better-Auth handles account deletion
    res.status(200).json({
      success: true,
      message: 'Account deletion endpoint - handled by Better-Auth',
    });
  } catch (error) {
    next(error);
  }
});

// Social login endpoints (if not handled by Better-Auth)
router.post('/social-login', validateBody(socialLoginSchema), async (req, res, next) => {
  try {
    const { provider, token } = req.validated!.body;

    logger.info('Social login attempt', { provider });

    // TODO: Implement social login logic if not handled by Better-Auth
    sendSuccess(res, { provider, message: 'Social login not yet implemented' });
  } catch (error) {
    next(error);
  }
});

export default router;