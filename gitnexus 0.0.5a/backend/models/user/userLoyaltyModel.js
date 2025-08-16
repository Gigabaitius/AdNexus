/**
 * *project*\backend\models\user\userLoyaltyModel.js
 * User Loyalty Model - handles database operations for user_loyalty table
 */

const db = require('../../config/database');

class UserLoyaltyModel {
  /**
   * Find loyalty record by user ID
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} Loyalty record or null
   */
  static async findByUserId(userId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM user_loyalty WHERE user_id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  /**
   * Find by referral code
   * @param {string} referralCode - Referral code
   * @returns {Promise<Object|null>} Loyalty record or null
   */
  static async findByReferralCode(referralCode) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM user_loyalty WHERE referral_code = ?',
        [referralCode],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  /**
   * Create new loyalty record
   * @param {number} userId - User ID
   * @param {Object} loyaltyData - Initial loyalty data
   * @returns {Promise<boolean>} Success status
   */
  static async create(userId, loyaltyData = {}) {
    const {
      referral_code,
      referred_by = null,
      loyalty_points = 0,
      loyalty_level = 1
    } = loyaltyData;

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO user_loyalty (
          user_id, referral_code, referred_by,
          loyalty_points, loyalty_level
        ) VALUES (?, ?, ?, ?, ?)`,
        [userId, referral_code, referred_by, loyalty_points, loyalty_level],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  /**
   * Update loyalty points
   * @param {number} userId - User ID
   * @param {number} points - Points to add/subtract
   * @param {string} operation - 'add' or 'subtract'
   * @returns {Promise<boolean>} Success status
   */
  static async updatePoints(userId, points, operation) {
    const operator = operation === 'add' ? '+' : '-';
    const field = operation === 'add' ? 'total_points_earned' : 'total_points_spent';

    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE user_loyalty 
         SET loyalty_points = loyalty_points ${operator} ?,
             ${field} = ${field} + ?
         WHERE user_id = ?`,
        [points, points, userId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  /**
   * Update loyalty level
   * @param {number} userId - User ID
   * @param {number} level - New level
   * @returns {Promise<boolean>} Success status
   */
  static async updateLevel(userId, level) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE user_loyalty SET loyalty_level = ? WHERE user_id = ?',
        [level, userId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  /**
   * Update referral statistics
   * @param {number} userId - Referrer user ID
   * @param {number} earnings - Earnings to add
   * @returns {Promise<boolean>} Success status
   */
  static async updateReferralStats(userId, earnings) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE user_loyalty 
         SET referral_count = referral_count + 1,
             referral_earnings = referral_earnings + ?
         WHERE user_id = ?`,
        [earnings, userId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);}
      );
    });
  }

  /**
   * Update achievements
   * @param {number} userId - User ID
   * @param {string} achievementsJson - JSON string of achievements
   * @returns {Promise<boolean>} Success status
   */
  static async updateAchievements(userId, achievementsJson) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE user_loyalty SET achievements_unlocked = ? WHERE user_id = ?',
        [achievementsJson, userId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  /**
   * Update badges
   * @param {number} userId - User ID
   * @param {string} badgesJson - JSON string of badges
   * @returns {Promise<boolean>} Success status
   */
  static async updateBadges(userId, badgesJson) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE user_loyalty SET badges_earned = ? WHERE user_id = ?',
        [badgesJson, userId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  /**
   * Get top users by points
   * @param {number} limit - Number of users to return
   * @returns {Promise<Array>} Array of top users
   */
  static async getTopUsersByPoints(limit = 10) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT ul.*, u.username 
         FROM user_loyalty ul
         JOIN users u ON ul.user_id = u.id
         ORDER BY ul.loyalty_points DESC
         LIMIT ?`,
        [limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }
}

module.exports = UserLoyaltyModel;