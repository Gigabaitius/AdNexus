/**
 * *project*\backend\services\user\authService.js
 * Authentication Service - handles user authentication and registration
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../../utils/logger');
const { ValidationError, AuthenticationError, BusinessError } = require('../../utils/errors');
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
    const { username, email, password } = userData;

    return await UserModel.transaction(async () => {
      try {
        // Создаем пользователя (проверка уникальности теперь в модели)
        const user = await UserModel.create({ username, email, password });

        // Создаем связанные записи
        await Promise.all([
          UserProfileModel.create({ user_id: user.id }),
          UserFinanceModel.create(user.id),
          UserLoyaltyModel.create({
            user_id: user.id,
            referral_code: this.generateReferralCode(username)
          })
        ]);

        // Создаем токен подтверждения email
        const verificationToken = await UserVerificationModel.createToken(
          user.id,
          'email'
        );

        return {
          user: this.sanitizeUser(user),
          verificationToken: verificationToken.token
        };
      } catch (error) {
        // Модель теперь бросает правильные ошибки
        throw error;
      }
    });
  }

  /**
   * Login user
   * @param {string} email - Email
   * @param {string} password - Password
   * @returns {Promise<Object>} Login result with tokens
   */
  static async login(email, password) {
    try {
      const user = await UserModel.findByEmail(email);

      if (!user) {
        logger.warn('Login attempt with unknown email', { email });
        throw new AuthenticationError('Invalid credentials');
      }

      if (user.status === 'banned') {
        logger.warn('Login attempt by banned user', { userId: user.id });
        throw new BusinessError('Account is banned', {
          reason: user.ban_reason,
          until: user.banned_until
        });
      }

      const isValidPassword = await UserModel.verifyPassword(user, password);

      if (!isValidPassword) {
        logger.warn('Login attempt with wrong password', { userId: user.id });
        throw new AuthenticationError('Invalid credentials');
      }

      // Обновляем последний вход
      await UserModel.updateLastLogin(user.id);

      const tokens = this.generateTokens(user);

      logger.info('User logged in', {
        userId: user.id,
        username: user.username
      });

      return {
        user: this.sanitizeUser(user),
        tokens
      };
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof BusinessError) {
        throw error;
      }
      logger.error('Login error', { email, error: error.message });
      throw new Error('Login failed');
    }
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
    const tokenData = await UserVerificationModel.verifyAndUseToken(token, 'email');
    const user = await UserModel.verifyEmail(tokenData.user_id);

    return this.sanitizeUser(user);
  }

  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {Promise<string>} Reset token
   */
  static async requestPasswordReset(email) {
    const user = await UserModel.findByEmail(email);

    if (!user) {
      // Не раскрываем, существует ли email
      return { message: 'If email exists, reset link will be sent' };
    }

    // Проверяем rate limit
    const canRequest = await UserVerificationModel.canRequestToken(user.id, 'password_reset');
    if (!canRequest.canRequest) {
      throw new BusinessError(canRequest.reason, { retryAfter: canRequest.retryAfter });
    }

    const token = await UserVerificationModel.createToken(user.id, 'password_reset');

    // Здесь должна быть отправка email

    return { message: 'Password reset link sent' };
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


  static async enable2FA(userId) {
    const secret = speakeasy.generateSecret();
    await UserModel.update2FA(userId, true, secret.base32);
    return {
      secret: secret.base32,
      qrCode: secret.otpauth_url
    };
  }
}

module.exports = AuthService;