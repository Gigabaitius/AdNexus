/**
 * *project*\backend\models\user\userFinanceModel.js
 * User Finance Model - handles database operations for user_finances table
 */

const db = require('../../config/database');

class UserFinanceModel {
  /**
   * Find finance record by user ID
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} Finance record or null
   */
  static async findByUserId(userId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM user_finances WHERE user_id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  /**
   * Create new finance record
   * @param {number} userId - User ID
   * @param {Object} financeData - Initial finance data
   * @returns {Promise<boolean>} Success status
   */
  static async create(userId, financeData = {}) {
    const {
      balance = 0.00,
      balance_on_hold = 0.00,
      subscription_plan = 'free',
      subscription_expires_at = null,
      subscription_auto_renew = true
    } = financeData;

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO user_finances (
          user_id, balance, balance_on_hold,
          subscription_plan, subscription_expires_at, subscription_auto_renew
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          userId, balance, balance_on_hold,
          subscription_plan, subscription_expires_at, subscription_auto_renew
        ],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  /**
   * Update balance
   * @param {number} userId - User ID
   * @param {number} amount - Amount to add/subtract
   * @param {string} operation - 'add' or 'subtract'
   * @returns {Promise<boolean>} Success status
   */
  static async updateBalance(userId, amount, operation) {
    const operator = operation === 'add' ? '+' : '-';
    
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE user_finances 
         SET balance = balance ${operator} ?,
             last_transaction_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
        [amount, userId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  /**
   * Update balance on hold
   * @param {number} userId - User ID
   * @param {number} amount - Amount to add/subtract
   * @param {string} operation - 'add' or 'subtract'
   * @returns {Promise<boolean>} Success status
   */
  static async updateBalanceOnHold(userId, amount, operation) {
    const operator = operation === 'add' ? '+' : '-';
    
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE user_finances 
         SET balance_on_hold = balance_on_hold ${operator} ?
         WHERE user_id = ?`,
        [amount, userId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  /**
   * Update statistics
   * @param {number} userId - User ID
   * @param {string} field - Field to update (total_earned, total_spent, total_withdrawn)
   * @param {number} amount - Amount to add
   * @returns {Promise<boolean>} Success status
   */
  static async updateStats(userId, field, amount) {
    const allowedFields = ['total_earned', 'total_spent', 'total_withdrawn'];
    
    if (!allowedFields.includes(field)) {
      throw new Error('Invalid field');
    }

    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE user_finances 
         SET ${field} = ${field} + ?
         WHERE user_id = ?`,
        [amount, userId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  /**
   * Update subscription
   * @param {number} userId - User ID
   * @param {Object} subscriptionData - Subscription data
   * @returns {Promise<boolean>} Success status
   */
  static async updateSubscription(userId, subscriptionData) {
const { plan, expires_at, auto_renew } = subscriptionData;

    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE user_finances 
         SET subscription_plan = ?, 
             subscription_expires_at = ?,
             subscription_auto_renew = ?
         WHERE user_id = ?`,
        [plan, expires_at, auto_renew, userId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  /**
   * Get users with expiring subscriptions
   * @param {number} daysAhead - Days to look ahead
   * @returns {Promise<Array>} Array of users with expiring subscriptions
   */
  static async findExpiringSubscriptions(daysAhead = 7) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM user_finances 
         WHERE subscription_plan != 'free' 
         AND subscription_expires_at <= datetime('now', '+${daysAhead} days')
         AND subscription_expires_at > datetime('now')`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }
}

module.exports = UserFinanceModel;