/**
 * *project*\backend\models\user\userVerificationModel.js
 * User Verification Model - handles database operations for user_verification_tokens table
 */

const db = require('../../config/database');

class UserVerificationModel {
  /**
   * Find token
   * @param {string} token - Verification token
   * @param {string} type - Token type
   * @returns {Promise<Object|null>} Token record or null
   */
  static async findByToken(token, type) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM user_verification_tokens WHERE token = ? AND type = ?',
        [token, type],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  /**
   * Create verification token
   * @param {Object} tokenData - Token data
   * @returns {Promise<number>} Created token ID
   */
  static async create(tokenData) {
    const { user_id, token, type, expires_at } = tokenData;

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO user_verification_tokens (user_id, token, type, expires_at) 
         VALUES (?, ?, ?, ?)`,
        [user_id, token, type, expires_at],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  /**
   * Mark token as used
   * @param {string} token - Token to mark as used
   * @returns {Promise<boolean>} Success status
   */
  static async markAsUsed(token) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE user_verification_tokens SET used_at = CURRENT_TIMESTAMP WHERE token = ?',
        [token],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  /**
   * Delete expired tokens
   * @returns {Promise<number>} Number of deleted tokens
   */
  static async deleteExpired() {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM user_verification_tokens WHERE expires_at < datetime("now")',
        [],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  /**
   * Delete all tokens for user
   * @param {number} userId - User ID
   * @param {string} type - Token type (optional)
   * @returns {Promise<number>} Number of deleted tokens
   */
  static async deleteForUser(userId, type = null) {
    let query = 'DELETE FROM user_verification_tokens WHERE user_id = ?';
    const params = [userId];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    return new Promise((resolve, reject) => {
      db.run(query, params, function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }
}

module.exports = UserVerificationModel;