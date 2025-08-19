/**
 * *project*\backend/services/user/userService.js
 * User Service - orchestrates operations across user-related services
 */

const UserModel = require('../../models/user/userModel');
const ProfileService = require('./profileService');
const FinanceService = require('./financeService');
const LoyaltyService = require('./loyaltyService');
const SubscriptionService = require('./subscriptionService');

class UserService {
  /**
   * Get complete user data
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Complete user data
   */
  static async getCompleteUserData(userId) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get data from all services
    const [profile, balance, loyalty, subscription] = await Promise.all([
      ProfileService.getProfile(userId),
      FinanceService.getBalance(userId),
      LoyaltyService.getLoyaltyData(userId),
      SubscriptionService.getSubscription(userId)
    ]);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        email_verified: user.email_verified,
        is_admin: user.is_admin,
        is_moderator: user.is_moderator,
        status: user.status
      },
      profile,
      finance: balance,
      loyalty,
      subscription
    };
  }

  /**
   * Search users
   * @param {Object} criteria - Search criteria
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  static async searchUsers(criteria, options = {}) {
    const {
      page = 1,
      limit = 10,
      sort = 'created_at',
      order = 'DESC'
    } = options;

    const offset = (page - 1) * limit;

    // Get users from model
    const users = await UserModel.findAll(criteria, limit, offset);
    const total = await UserModel.count(criteria);

    // Get additional data for each user if needed
    const enrichedUsers = await Promise.all(
      users.map(async (user) => {
        const profile = await ProfileService.getProfile(user.id);
        return {
          ...user,
          avatar_url: profile.avatar_url,
          company_name: profile.company_name
        };
      })
    );

    return {
      users: enrichedUsers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Ban user
   * @param {number} userId - User ID to ban
   * @param {Object} banData - Ban details
   * @returns {Promise<boolean>} Success status
   */
  static async banUser(userId, banData) {
    const { reason, until, bannedBy } = banData;

    // Update user status
    await UserModel.update(userId, {
      status: until ? 'suspended' : 'banned',
      banned_until: until,
      ban_reason: reason
    });

    // In production, send notification email

    return true;
  }

  /**
   * Unban user
   * @param {number} userId - User ID to unban
   * @returns {Promise<boolean>} Success status
   */
  static async unbanUser(userId) {
    await UserModel.update(userId, {
      status: 'active',
      banned_until: null,
      ban_reason: null
    });

    return true;
  }

  /**
   * Delete user and all related data
   * @param {number} userId - User ID to delete
   * @returns {Promise<boolean>} Success status
   */
  static async deleteUser(userId) {
    // In production, this would be a soft delete
    // or archive the user data
    
    // Delete user (cascades to related tables)
    await UserModel.delete(userId);

    return true;
  }

  /**
   * Get user statistics
   * @param {number} userId - User ID
   * @returns {Promise<Object>} User statistics
   */
  static async getUserStatistics(userId) {
    // This would aggregate data from various sources
    // Campaigns, platforms, transactions, etc.
    
    const stats = {
      account_age_days: 0,
      total_campaigns: 0,
      active_campaigns: 0,
      total_platforms: 0,
      active_platforms: 0,
      total_transactions: 0,
      total_revenue: 0,
      total_spent: 0
    };

    // Calculate account age
    const user = await UserModel.findById(userId);
    if (user) {
      const createdAt = new Date(user.created_at);
      const now = new Date();
      stats.account_age_days = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
    }

    return stats;
  }

  /**
   * Promote user to role
   * @param {number} userId - User ID
   * @param {string} role - Role to promote to
   * @returns {Promise<boolean>} Success status
   */
  static async promoteToRole(userId, role) {
    const updates = {};
    
    switch (role) {
      case 'moderator':
        updates.is_moderator = 1;
        break;
      case 'admin':
        updates.is_admin = 1;
        updates.is_moderator = 1; // Admins are also moderators
        break;
      default:
        throw new Error('Invalid role');
    }

    await UserModel.update(userId, updates);
    return true;
  }

  /**
   * Revoke user role
   * @param {number} userId - User ID
   * @param {string} role - Role to revoke
   * @returns {Promise<boolean>} Success status
   */
  static async revokeRole(userId, role) {
    const updates = {};
    
    switch (role) {
      case 'moderator':
        updates.is_moderator = 0;
        break;
      case 'admin':
        updates.is_admin = 0;
        break;
      default:
        throw new Error('Invalid role');
    }

    await UserModel.update(userId, updates);
    return true;
  }
}

module.exports = UserService;