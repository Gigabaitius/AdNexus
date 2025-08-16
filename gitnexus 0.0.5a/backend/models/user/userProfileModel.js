/**
 * *project*\backend\models\user\userProfileModel.js
 * User Profile Model - handles database operations for user_profiles table
 */

const db = require('../../config/database');

class UserProfileModel {
  /**
   * Find profile by user ID
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} Profile record or null
   */
  static async findByUserId(userId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM user_profiles WHERE user_id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  /**
   * Create new profile
   * @param {number} userId - User ID
   * @param {Object} profileData - Profile data
   * @returns {Promise<boolean>} Success status
   */
  static async create(userId, profileData = {}) {
    const {
      phone = null,
      phone_verified = false,
      avatar_url = null,
      bio = null,
      company_name = null,
      company_verified = false,
      preferred_language = 'en',
      timezone = 'UTC',
      notification_settings = '{}'
    } = profileData;

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO user_profiles (
          user_id, phone, phone_verified, avatar_url, bio,
          company_name, company_verified, preferred_language,
          timezone, notification_settings
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId, phone, phone_verified, avatar_url, bio,
          company_name, company_verified, preferred_language,
          timezone, notification_settings
        ],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  /**
   * Update profile
   * @param {number} userId - User ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<boolean>} Success status
   */
  static async update(userId, updates) {
    const allowedFields = [
      'phone', 'phone_verified', 'avatar_url', 'bio',
      'company_name', 'company_verified', 'preferred_language',
      'timezone', 'notification_settings'
    ];

    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) return true;

    values.push(userId);

    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE user_profiles SET ${fields.join(', ')} WHERE user_id = ?`,
        values,
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  /**
   * Delete profile
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(userId) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM user_profiles WHERE user_id = ?',
        [userId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }
}

module.exports = UserProfileModel;