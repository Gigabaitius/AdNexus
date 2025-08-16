/**
 * *project*\backend\services\user\authService.js
 * Authentication Service - handles user authentication and registration
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const UserModel = require('../../models/user/userModel');
const UserProfileModel = require('../../models/user/userProfileModel');
const UserFinanceModel = require('../../models/user/userFinanceModel');
const UserLoyaltyModel = require('../../models/user/userLoyaltyModel');
const UserVerificationModel = require('../../models/user/userVerificationModel');

class AuthService {
  /**
   * Register new user
   * @param {Object} userData - Registration data
   * @returns {Promise<Object>} Created user data
   */
  static async register(userData) {
    const { username, email, password, referralCode } = userData;

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    const existingUsername = await UserModel.findByUsername(username);
    if (existingUsername) {
      throw new Error('Username already taken');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userId = await UserModel.create({
      username,
      email,
      password_hash: passwordHash
    });

    // Create related records
    await UserProfileModel.create(userId);
    await UserFinanceModel.create(userId);

    // Handle referral
    let referrerId = null;
    if (referralCode) {
      const referrer = await UserLoyaltyModel.findByReferralCode(referralCode);
      if (referrer) {
        referrerId = referrer.user_id;
        // Update referrer stats
        await UserLoyaltyModel.updateReferralStats(referrerId, 0);
      }
    }

    // Create loyalty record with referral
    const userReferralCode = AuthService.generateReferralCode(username);
    await UserLoyaltyModel.create(userId, {
      referral_code: userReferralCode,
      referred_by: referrerId
    });

    // Create email verification token
    const verificationToken = await AuthService.createVerificationToken(userId, 'email');

    return {
      id: userId,
      username,
      email,
      verificationToken
    };
  }

  /**
   * Login user
   * @param {string} email - Email
   * @param {string} password - Password
   * @returns {Promise<Object>} Login result with tokens
   */
  static async login(email, password) {
    // Find user
    const user = await UserModel.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      throw new Error('Invalid credentials');
    }

    // Check if banned
    if (user.status === 'banned') {
      throw new Error('Account is banned');
    }

    // Check if suspended
    if (user.status === 'suspended' && user.banned_until) {
      const banExpired = new Date(user.banned_until) < new Date();
      if (!banExpired) {
        throw new Error(`Account suspended until ${user.banned_until}`);
      }
      // Unban if suspension expired
      await UserModel.update(user.id, {
        status: 'active',
        banned_until: null,
        ban_reason: null
      });
    }

    // Update last login
    await UserModel.updateLastLogin(user.id);

    // Generate tokens
    const accessToken = AuthService.generateAccessToken(user);
    const refreshToken = AuthService.generateRefreshToken(user);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.is_admin,
        isModerator: user.is_moderator
      }
    };
  }

  /**
   * Generate access token
   * @param {Object} user - User data
   * @returns {string} JWT access token
   */
  static generateAccessToken(user) {
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.is_admin,
        isModerator: user.is_moderator
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
  }

  /**
   * Generate refresh token
   * @param {Object} user - User data
   * @returns {string} JWT refresh token
   */
  static generateRefreshToken(user) {
    return jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
  }

  /**
   * Generate referral code
   * @param {string} username - Username
   * @returns {string} Referral code
   */
  static generateReferralCode(username) {
    const randomPart = crypto.randomBytes(3).toString('hex');
    const userPart = username.substring(0, 3).toUpperCase();
    return `${userPart}${randomPart}`;
  }

  /**
   * Create verification token
   * @param {number} userId - User ID
   * @param {string} type - Token type
   * @returns {Promise<string>} Verification token
   */
  static async createVerificationToken(userId, type) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await UserVerificationModel.create({
      user_id: userId,
      token,
type,
      expires_at: expiresAt.toISOString()
    });

    return token;
  }

  /**
   * Verify email
   * @param {string} token - Verification token
   * @returns {Promise<boolean>} Success status
   */
  static async verifyEmail(token) {
    // Find token
    const tokenData = await UserVerificationModel.findByToken(token, 'email');
    if (!tokenData) {
      throw new Error('Invalid verification token');
    }

    // Check if already used
    if (tokenData.used_at) {
      throw new Error('Token already used');
    }

    // Check if expired
    if (new Date(tokenData.expires_at) < new Date()) {
      throw new Error('Token expired');
    }

    // Update user
    await UserModel.update(tokenData.user_id, { email_verified: true });

    // Mark token as used
    await UserVerificationModel.markAsUsed(token);

    return true;
  }

  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {Promise<string>} Reset token
   */
  static async requestPasswordReset(email) {
    const user = await UserModel.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    // Delete existing password reset tokens
    await UserVerificationModel.deleteForUser(user.id, 'password_reset');

    // Create new token
    const token = await AuthService.createVerificationToken(user.id, 'password_reset');

    return token;
  }

  /**
   * Reset password
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} Success status
   */
  static async resetPassword(token, newPassword) {
    // Find token
    const tokenData = await UserVerificationModel.findByToken(token, 'password_reset');
    if (!tokenData) {
      throw new Error('Invalid reset token');
    }

    // Check if already used
    if (tokenData.used_at) {
      throw new Error('Token already used');
    }

    // Check if expired
    if (new Date(tokenData.expires_at) < new Date()) {
      throw new Error('Token expired');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user password
    await UserModel.update(tokenData.user_id, { password_hash: passwordHash });

    // Mark token as used
    await UserVerificationModel.markAsUsed(token);

    // Delete all password reset tokens for this user
    await UserVerificationModel.deleteForUser(tokenData.user_id, 'password_reset');

    return true;
  }

  /**
   * Refresh access token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} New tokens
   */
  static async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const user = await UserModel.findById(decoded.id);

      if (!user) {
        throw new Error('User not found');
      }

      if (user.status !== 'active') {
        throw new Error('Account not active');
      }

      const newAccessToken = AuthService.generateAccessToken(user);
      const newRefreshToken = AuthService.generateRefreshToken(user);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }
}

module.exports = AuthService;