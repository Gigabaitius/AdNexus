// *project*/backend/routes/userRoutes.js
// Routes - определяют, какой контроллер обрабатывает какой URL

const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const AuthService = require('../services/user/authService');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validationMiddleware');
const Joi = require('joi');

// Validation schemas
const schemas = {
  createUser: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    phone: Joi.string().optional(),
    company_name: Joi.string().optional()
  }),

  updateUser: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).optional(),
    email: Joi.string().email().optional(),
    status: Joi.string().valid('active', 'suspended', 'banned').optional()
  }),

  updateProfile: Joi.object({
    phone: Joi.string().optional(),
    bio: Joi.string().max(500).optional(),
company_name: Joi.string().max(100).optional(),
    avatar_url: Joi.string().uri().optional(),
    preferred_language: Joi.string().valid('en', 'ru', 'es', 'fr', 'de').optional(),
    timezone: Joi.string().optional(),
    notification_settings: Joi.object().optional()
  }),

  addFunds: Joi.object({
    amount: Joi.number().positive().required(),
    description: Joi.string().max(200).optional()
  }),

  transfer: Joi.object({
    fromUserId: Joi.number().integer().positive().required(),
    toUserId: Joi.number().integer().positive().required(),
    amount: Joi.number().positive().required(),
    description: Joi.string().max(200).optional()
  }),

  addPoints: Joi.object({
    points: Joi.number().integer().positive().required(),
    reason: Joi.string().max(200).required()
  }),

  updateSubscription: Joi.object({
    plan: Joi.string().valid('free', 'standard', 'premium').required(),
    duration: Joi.number().integer().min(1).max(12).optional()
  }),

  banUser: Joi.object({
    reason: Joi.string().max(500).required(),
    duration: Joi.number().integer().positive().optional() // hours
  }),

  pagination: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    search: Joi.string().optional(),
    role: Joi.string().valid('user', 'moderator', 'admin').optional(),
    status: Joi.string().valid('active', 'suspended', 'banned').optional(),
    subscription: Joi.string().valid('free', 'standard', 'premium').optional(),
    sortBy: Joi.string().valid('created_at', 'username', 'email', 'last_login_at').optional(),
    sortOrder: Joi.string().valid('ASC', 'DESC').optional()
  })
};

// Public routes
router.post('/register', validateRequest(schemas.createUser), UserController.create);
router.post('/login', AuthService.login);
router.post('/refresh', AuthService.refreshToken);
router.post('/logout', AuthService.logout);

// Protected routes
router.use(requireAuth);

// User management routes
router.get('/', validateRequest(schemas.pagination, 'query'), UserController.getAll);
router.get('/:id', UserController.getById);
router.put('/:id', validateRequest(schemas.updateUser), UserController.update);
router.delete('/:id', requireAdmin, UserController.delete);

// Profile routes
router.get('/:id/profile', UserController.getById); // Same as getById but can be extended
router.put('/:id/profile', validateRequest(schemas.updateProfile), UserController.updateProfile);

// Finance routes
router.get('/:id/balance', UserController.getBalance);
router.post('/:id/add-funds', requireAdmin, validateRequest(schemas.addFunds), UserController.addFunds);
router.post('/transfer', validateRequest(schemas.transfer), UserController.transferFunds);

// Loyalty routes
router.get('/:id/loyalty', UserController.getLoyalty);
router.post('/:id/add-points', requireAdmin, validateRequest(schemas.addPoints), UserController.addPoints);

// Subscription routes
router.get('/:id/subscription', UserController.getById); // Subscription info included in user data
router.put('/:id/subscription', validateRequest(schemas.updateSubscription), UserController.updateSubscription);
router.get('/:id/subscription/features', UserController.getSubscriptionFeatures);

// Admin routes
router.post('/:id/ban', requireAdmin, validateRequest(schemas.banUser), UserController.banUser);
router.post('/:id/unban', requireAdmin, UserController.unbanUser);

// Statistics
router.get('/:id/stats', UserController.getUserStats);

// Email verification routes
router.post('/:id/verify-email/send', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Check permissions
    if (req.user.id !== userId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await AuthService.sendVerificationEmail(userId);
    res.json({ message: 'Verification email sent' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/verify-email/:token', async (req, res) => {
  try {
    await AuthService.verifyEmail(req.params.token);
    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Password reset routes
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    await AuthService.initiatePasswordReset(email);
    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/reset-password/:token', async (req, res) => {
  try {
    const { password } = req.body;
    await AuthService.resetPassword(req.params.token, password);
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Two-factor authentication routes
router.post('/:id/2fa/enable', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Check permissions
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Can only enable 2FA for your own account' });
    }

    const result = await AuthService.enableTwoFactor(userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/2fa/disable', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { code } = req.body;
    
    // Check permissions
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Can only disable 2FA for your own account' });
    }

    await AuthService.disableTwoFactor(userId, code);
    res.json({ message: '2FA disabled successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/2fa/verify', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { code } = req.body;
    
    const isValid = await AuthService.verifyTwoFactorCode(userId, code);
    res.json({ valid: isValid });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// API key management routes
router.get('/:id/api-keys', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Check permissions
    if (req.user.id !== userId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const keys = await AuthService.getUserApiKeys(userId);
    res.json(keys);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/api-keys', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { name, permissions } = req.body;
    
    // Check permissions
    if (req.user.id !== userId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const apiKey = await AuthService.createApiKey(userId, name, permissions);
    res.json(apiKey);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id/api-keys/:keyId', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const keyId = parseInt(req.params.keyId);
    
    // Check permissions
    if (req.user.id !== userId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await AuthService.revokeApiKey(keyId, userId);
    res.json({ message: 'API key revoked successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
