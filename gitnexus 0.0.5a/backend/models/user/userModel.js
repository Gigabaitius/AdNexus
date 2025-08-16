/**
 * *project*\backend\models\user\userModel.js
 * User Model - handles database operations for users table
 */

const db = require('../../config/database');

class UserModel {
  /**
   * Find user by ID
   * @param {number} id - User ID
   * @returns {Promise<Object|null>} User record or null
   */
  static async findById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  /**
   * Find user by username
   * @param {string} username - Username
   * @returns {Promise<Object|null>} User record or null
   */
  static async findByUsername(username) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  /**
   * Find user by email
   * @param {string} email - Email address
   * @returns {Promise<Object|null>} User record or null
   */
  static async findByEmail(email) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  /**
   * Create new user
   * @param {Object} userData - User data
   * @returns {Promise<number>} Created user ID
   */
  static async create(userData) {
    const {
      username,
      email,
      password_hash,
      email_verified = false,
      two_factor_enabled = false,
      two_factor_secret = null,
      is_admin = 0,
      is_moderator = 0
    } = userData;

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO users (
          username, email, password_hash, email_verified,
          two_factor_enabled, two_factor_secret,
          is_admin, is_moderator
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          username, email, password_hash, email_verified,
          two_factor_enabled, two_factor_secret,
          is_admin, is_moderator
        ],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  /**
   * Update user
   * @param {number} id - User ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<boolean>} Success status
   */
  static async update(id, updates) {
    const allowedFields = [
      'email_verified', 'two_factor_enabled', 'two_factor_secret',
      'is_admin', 'is_moderator', 'status', 'banned_until', 'ban_reason'
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

    values.push(id);

    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  /**
   * Update last login timestamp
   * @param {number} id - User ID
   * @returns {Promise<boolean>} Success status
   */
  static async updateLastLogin(id) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE users SET 
          last_login_at = CURRENT_TIMESTAMP,
          login_count = login_count + 1
        WHERE id = ?`,
        [id],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  /**
   * Delete user
   * @param {number} id - User ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id) {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }

  /**
   * Find all users with filters
   * @param {Object} filters - Filter criteria
   * @param {number} limit - Results limit
   * @param {number} offset - Results offset
   * @returns {Promise<Array>} Array of users
   */
  static async findAll(filters = {}, limit = 10, offset = 0) {
    let query = 'SELECT * FROM users WHERE 1=1';
    const params = [];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.is_admin !== undefined) {
      query += ' AND is_admin = ?';
      params.push(filters.is_admin);
    }

    if (filters.is_moderator !== undefined) {
      query += ' AND is_moderator = ?';
      params.push(filters.is_moderator);
    }

    if (filters.search) {
      query += ' AND (username LIKE ? OR email LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  /**
   * Count users with filters
   * @param {Object} filters - Filter criteria
   * @returns {Promise<number>} User count
   */
  static async count(filters = {}) {
    let query = 'SELECT COUNT(*) as count FROM users WHERE 1=1';
    const params = [];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.is_admin !== undefined) {
      query += ' AND is_admin = ?';
      params.push(filters.is_admin);
    }

    if (filters.is_moderator !== undefined) {
      query += ' AND is_moderator = ?';
      params.push(filters.is_moderator);
    }

    if (filters.search) {
      query += ' AND (username LIKE ? OR email LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    return new Promise((resolve, reject) => {
      db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });
  }
}

module.exports = UserModel;