/**
 * *project*\backend\models\user\userApiModel.js
 * User API Model - handles database operations for user_api_access table
 */

const db = require('../../config/database');

class UserApiModel {
  /**
   * Find API key by key
   * @param {string} apiKey - API key
   * @returns {Promise<Object|null>} API access record or null
   */
  static async findByKey(apiKey) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM user_api_access WHERE api_key = ? AND is_active = 1',
        [apiKey],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  /**
   * Find all API keys for user
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Array of API keys
   */
  static async findByUserId(userId) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM user_api_access WHERE user_id = ?',
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  /**
   * Create new API key
   * @param {Object} apiData - API key data
   * @returns {Promise<number>} Created API key ID
   */
  static async create(apiData) {
    const {
      user_id,
      api_key,
      api_secret_hash,
      name,
      permissions = '[]',
      rate_limit = 1000,
      expires_at = null
    } = apiData;

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO user_api_access (
          user_id, api_key, api_secret_hash, name,
          permissions, rate_limit, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          user_id, api_key, api_secret_hash, name,
          permissions, rate_limit, expires_at
        ],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  /**
   * Update last used timestamp
   * @param {string} apiKey - API key
   * @returns {Promise<boolean>} Success status
   */
  static async updateLastUsed(apiKey) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE user_api_access SET last_used_at = CURRENT_TIMESTAMP WHERE api_key = ?',
        [apiKey],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  /**
   * Deactivate API key
   * @param {number} id - API key ID
   * @returns {Promise<boolean>} Success status
   */
  static async deactivate(id) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE user_api_access SET is_active = 0 WHERE id = ?',
        [id],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  /**
   * Delete API key
   * @param {number} id - API key ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM user_api_access WHERE id = ?',
        [id],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  /**
   * Check if API key has expired
   * @param {string} apiKey - API key
   * @returns {Promise<boolean>} True if expired
   */
  static async isExpired(apiKey) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT expires_at FROM user_api_access 
         WHERE api_key = ? AND expires_at IS NOT NULL`,
        [apiKey],
        (err, row) => {
          if (err) reject(err);
          else if (!row) resolve(false);
          else resolve(new Date(row.expires_at) < new Date());
        }
      );
    });
  }
}

module.exports = UserApiModel;