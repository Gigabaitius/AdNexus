// *project*\backend/controllers/userController.js
const UserService = require('../services/user/userService');
const AuthService = require('../services/user/authService');
const ProfileService = require('../services/user/profileService');
const FinanceService = require('../services/user/financeService');
const LoyaltyService = require('../services/user/loyaltyService');
const SubscriptionService = require('../services/user/subscriptionService');
const logger = require('../utils/logger');

class UserController {
  /**
   * Get all users with pagination and filters
   * @route GET /api/users
   */
  static async getAll(req, res) {
    try {
      const filters = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        search: req.query.search,
        role: req.query.role,
        status: req.query.status,
        subscription: req.query.subscription,
        sortBy: req.query.sortBy || 'created_at',
        sortOrder: req.query.sortOrder || 'DESC'
      };

      const result = await UserService.getAllUsers(filters);
      res.json(result);
    } catch (error) {
      logger.error('Error in getAll users:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get user by ID with full info
   * @route GET /api/users/:id
   */
  static async getById(req, res) {
    try {
      const userId = parseInt(req.params.id);
      const includeFinance = req.query.includeFinance === 'true';
      const includeLoyalty = req.query.includeLoyalty === 'true';

      const user = await UserService.getUserById(userId, {
        includeFinance,
        includeLoyalty
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      logger.error(`Error getting user ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Create new user (registration)
   * @route POST /api/users
   */
  static async create(req, res) {
    try {
      const userData = req.body;
      const result = await UserService.createUser(userData);
      
      res.status(201).json({
        message: 'User created successfully',
        user: result.user,
        token: result.token
      });
    } catch (error) {
      logger.error('Error creating user:', error);
      
      if (error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message });
      }
      
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Update user
   * @route PUT /api/users/:id
   */
  static async update(req, res) {
    try {
      const userId = parseInt(req.params.id);
      const updates = req.body;

      // Check permissions
      if (req.user.id !== userId && !req.user.is_admin) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const updatedUser = await UserService.updateUser(userId, updates);
      res.json({
        message: 'User updated successfully',
        user: updatedUser
      });
    } catch (error) {
      logger.error(`Error updating user ${req.params.id}:`, error);
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Delete user (soft delete)
   * @route DELETE /api/users/:id
   */
  static async delete(req, res) {
    try {
      const userId = parseInt(req.params.id);

      // Only admins can delete users
      if (!req.user.is_admin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      await UserService.deleteUser(userId);
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      logger.error(`Error deleting user ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Update user profile
   * @route PUT /api/users/:id/profile
   */
  static async updateProfile(req, res) {
    try {
      const userId = parseInt(req.params.id);
      
      // Check permissions
      if (req.user.id !== userId && !req.user.is_admin) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const profileData = req.body;
      const updatedProfile = await ProfileService.updateProfile(userId, profileData);
      
      res.json({
        message: 'Profile updated successfully',
        profile: updatedProfile
      });
    } catch (error) {
      logger.error(`Error updating profile for user ${req.params.id}:`, error);
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Get user balance
   * @route GET /api/users/:id/balance
   */
  static async getBalance(req, res) {
    try {
      const userId = parseInt(req.params.id);
      
      // Check permissions
      if (req.user.id !== userId && !req.user.is_admin) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const balance = await FinanceService.getBalance(userId);
      res.json(balance);
    } catch (error) {
      logger.error(`Error getting balance for user ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Add funds to user balance
   * @route POST /api/users/:id/add-funds
   */
  static async addFunds(req, res) {
    try {
      const userId = parseInt(req.params.id);
      const { amount, description } = req.body;

      // Only admins can add funds directly
      if (!req.user.is_admin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const result = await FinanceService.addFunds(userId, amount, description);
      res.json({
        message: 'Funds added successfully',
        balance: result
      });
    } catch (error) {
      logger.error(`Error adding funds for user ${req.params.id}:`, error);
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Transfer funds between users
   * @route POST /api/users/transfer
   */
  static async transferFunds(req, res) {
    try {
      const { fromUserId, toUserId, amount, description } = req.body;

      // Check permissions
      if (req.user.id !== fromUserId && !req.user.is_admin) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const result = await FinanceService.transfer(
        fromUserId,
        toUserId,
        amount,
        description
      );

      res.json({
        message: 'Transfer completed successfully',
        transaction: result
      });
    } catch (error) {
      logger.error('Error transferring funds:', error);
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Get user loyalty info
   * @route GET /api/users/:id/loyalty
   */
  static async getLoyalty(req, res) {
    try {
      const userId = parseInt(req.params.id);
      
      // Check permissions
      if (req.user.id !== userId && !req.user.is_admin) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const loyaltyInfo = await LoyaltyService.getUserLoyalty(userId);
      res.json(loyaltyInfo);
    } catch (error) {
      logger.error(`Error getting loyalty for user ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Add loyalty points
   * @route POST /api/users/:id/add-points
   */
  static async addPoints(req, res) {
    try {
      const userId = parseInt(req.params.id);
      const { points, reason } = req.body;

      // Only admins can add points directly
      if (!req.user.is_admin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const result = await LoyaltyService.addPoints(userId, points, reason);
      res.json({
        message: 'Points added successfully',
        loyalty: result
      });
    } catch (error) {
      logger.error(`Error adding points for user ${req.params.id}:`, error);
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Update user subscription
   * @route PUT /api/users/:id/subscription
   */
  static async updateSubscription(req, res) {
    try {
      const userId = parseInt(req.params.id);
      const { plan, duration } = req.body;

      // Check permissions
      if (req.user.id !== userId && !req.user.is_admin) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const result = await SubscriptionService.updateSubscription(
        userId,
        plan,
        duration
      );

      res.json({
        message: 'Subscription updated successfully',
        subscription: result
      });
    } catch (error) {
      logger.error(`Error updating subscription for user ${req.params.id}:`, error);
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Check subscription features
   * @route GET /api/users/:id/subscription/features
   */
  static async getSubscriptionFeatures(req, res) {
    try {
      const userId = parseInt(req.params.id);
      const features = await SubscriptionService.getAvailableFeatures(userId);
      res.json(features);
    } catch (error) {
      logger.error(`Error getting features for user ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Ban/unban user
   * @route POST /api/users/:id/ban
   */
  static async banUser(req, res) {
    try {
      const userId = parseInt(req.params.id);
      const { reason, duration } = req.body;

      // Only admins can ban users
      if (!req.user.is_admin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const result = await UserService.banUser(userId, reason, duration);
      res.json({
        message: 'User banned successfully',
        user: result
      });
    } catch (error) {
      logger.error(`Error banning user ${req.params.id}:`, error);
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Unban user
   * @route POST /api/users/:id/unban
   */
  static async unbanUser(req, res) {
    try {
      const userId = parseInt(req.params.id);

      // Only admins can unban users
      if (!req.user.is_admin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const result = await UserService.unbanUser(userId);
      res.json({
        message: 'User unbanned successfully',
        user: result
      });
    } catch (error) {
      logger.error(`Error unbanning user ${req.params.id}:`, error);
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Get user statistics
   * @route GET /api/users/:id/stats
   */
  static async getUserStats(req, res) {
    try {
      const userId = parseInt(req.params.id);
      
      // Check permissions
      if (req.user.id !== userId && !req.user.is_admin) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const stats = await UserService.getUserStatistics(userId);
      res.json(stats);
    } catch (error) {
      logger.error(`Error getting stats for user ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = UserController;
