/**
 * *project*\backend/services/user/profileService.js
 * Profile Service - handles user profile operations
 */

const UserModel = require('../../models/user/userModel');
const UserProfileModel = require('../../models/user/userProfileModel');
const UserVerificationModel = require('../../models/user/userVerificationModel');
const crypto = require('crypto');

class ProfileService {
  /**
   * Get user profile
   * @param {number} userId - User ID
   * @returns {Promise<Object>} User profile data
   */
  static async getProfile(userId) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const profile = await UserProfileModel.findByUserId(userId);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      email_verified: user.email_verified,
      status: user.status,
      created_at: user.created_at,
      ...profile
    };
  }

  /**
   * Update profile
   * @param {number} userId - User ID
   * @param {Object} profileData - Profile data to update
   * @returns {Promise<boolean>} Success status
   */
  static async updateProfile(userId, profileData) {
    // Check if user exists
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Update profile
    await UserProfileModel.update(userId, profileData);

    return true;
  }

  /**
   * Request phone verification
   * @param {number} userId - User ID
   * @param {string} phone - Phone number
   * @returns {Promise<string>} Verification code
   */
  static async requestPhoneVerification(userId, phone) {
    // Update phone number
    await UserProfileModel.update(userId, { phone, phone_verified: false });

    // Generate verification code (6 digits)
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Create verification token
    const token = crypto.createHash('sha256').update(code).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await UserVerificationModel.create({
      user_id: userId,
      token,
      type: 'phone',
      expires_at: expiresAt.toISOString()
    });

    // In production, send SMS here
    return code;
  }

  /**
   * Verify phone
   * @param {number} userId - User ID
   * @param {string} code - Verification code
   * @returns {Promise<boolean>} Success status
   */
  static async verifyPhone(userId, code) {
    // Hash the code
    const token = crypto.createHash('sha256').update(code).digest('hex');

    // Find token
    const tokenData = await UserVerificationModel.findByToken(token, 'phone');
    if (!tokenData || tokenData.user_id !== userId) {
      throw new Error('Invalid verification code');
    }

    // Check if expired
    if (new Date(tokenData.expires_at) < new Date()) {
      throw new Error('Code expired');
    }

    // Update profile
    await UserProfileModel.update(userId, { phone_verified: true });

    // Mark token as used
    await UserVerificationModel.markAsUsed(token);

    return true;
  }

  /**
   * Update notification settings
   * @param {number} userId - User ID
   * @param {Object} settings - Notification settings
   * @returns {Promise<boolean>} Success status
   */
  static async updateNotificationSettings(userId, settings) {
    const settingsJson = JSON.stringify(settings);
    await UserProfileModel.update(userId, { notification_settings: settingsJson });
    return true;
  }

  /**
   * Request company verification
   * @param {number} userId - User ID
   * @param {string} companyName - Company name
   * @param {Object} verificationData - Verification documents/data
   * @returns {Promise<Object>} Verification request data
   */
  static async requestCompanyVerification(userId, companyName, verificationData) {
    // Update company name
    await UserProfileModel.update(userId, {
      company_name: companyName,
      company_verified: false
    });

    // In production, create verification request in separate table
    // For now, just return success
    return {
      status: 'pending',
      company_name: companyName,
      submitted_at: new Date().toISOString()
    };
  }

  /**
   * Upload avatar
   * @param {number} userId - User ID
   * @param {string} avatarUrl - Avatar URL
   * @returns {Promise<boolean>} Success status
   */
  static async updateAvatar(userId, avatarUrl) {
    await UserProfileModel.update(userId, { avatar_url: avatarUrl });
    return true;
  }

  /**
   * Get public profile
   * @param {string} username - Username
   * @returns {Promise<Object>} Public profile data
   */
  static async getPublicProfile(username) {
    const user = await UserModel.findByUsername(username);
    if (!user) {
      throw new Error('User not found');
    }

    const profile = await UserProfileModel.findByUserId(user.id);

    // Return only public information
    return {
      username: user.username,
      avatar_url: profile?.avatar_url,
      bio: profile?.bio,
      company_name: profile?.company_name,
      company_verified: profile?.company_verified,
      created_at: user.created_at
    };
  }
}

module.exports = ProfileService;