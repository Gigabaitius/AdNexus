/**
 * *project*\backend/models/user/userFinanceModel.js
 * Модель для работы с финансами пользователей
 */

const BaseModel = require('../BaseModel');
const { ValidationError, BusinessError, NotFoundError } = require('../../utils/errors');
const logger = require('../../utils/logger');

class UserFinanceModel extends BaseModel {
  static tableName = 'user_finances';

  /**
   * Создает финансовую запись для пользователя
   * @param {number} userId - ID пользователя
   * @returns {Promise<Object>} Созданная запись
   */
  static async create(userId) {
    // Проверяем, что запись еще не существует
    const existing = await this.findByUserId(userId);
    if (existing) {
      throw new ValidationError('Finance record already exists for this user');
    }

    const finance = {
      user_id: userId,
      balance: 0,
      balance_on_hold: 0,
      total_earned: 0,
      total_spent: 0,
      total_withdrawn: 0,
      subscription_plan: 'free',
      subscription_expires_at: null,
      subscription_auto_renew: true,
      last_transaction_at: null
    };

    const fields = Object.keys(finance);
    const placeholders = fields.map(() => '?').join(', ');
    const values = Object.values(finance);

    const query = `
      INSERT INTO ${this.tableName} (${fields.join(', ')})
      VALUES (${placeholders})
    `;

    await this.safeQuery('run', query, values);
    
    return await this.findByUserId(userId);
  }

  /**
   * Находит финансы по user_id
   * @param {number} userId - ID пользователя
   * @returns {Promise<Object|null>} Финансовая запись
   */
  static async findByUserId(userId) {
    const query = `SELECT * FROM ${this.tableName} WHERE user_id = ?`;
    return await this.safeQuery('get', query, [userId]);
  }

  /**
   * Резервирует средства (с транзакцией)
   * @param {number} userId - ID пользователя
   * @param {number} amount - Сумма для резервирования
   * @param {string} reason - Причина резервирования
   * @param {Object} metadata - Дополнительные данные
* @returns {Promise<Object>} Обновленная запись
   */
  static async holdFunds(userId, amount, reason, metadata = {}) {
    return await this.transaction(async () => {
      const finances = await this.findByUserId(userId);
      if (!finances) {
        throw new NotFoundError('User finances not found');
      }

      const availableBalance = finances.balance - finances.balance_on_hold;
      if (availableBalance < amount) {
        throw new BusinessError('Insufficient funds', {
          required: amount,
          available: availableBalance
        });
      }

      const newHoldBalance = finances.balance_on_hold + amount;
      
      const query = `
        UPDATE ${this.tableName} 
        SET balance_on_hold = ?,
            last_transaction_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `;
      
      await this.safeQuery('run', query, [newHoldBalance, userId]);

      logger.info('Funds held', {
        userId,
        amount,
        reason,
        metadata
      });

      return await this.findByUserId(userId);
    });
  }

  /**
   * Освобождает зарезервированные средства
   * @param {number} userId - ID пользователя
   * @param {number} amount - Сумма для освобождения
   * @param {string} reason - Причина освобождения
   * @param {Object} metadata - Дополнительные данные
   * @returns {Promise<Object>} Обновленная запись
   */
  static async releaseFunds(userId, amount, reason, metadata = {}) {
    return await this.transaction(async () => {
      const finances = await this.findByUserId(userId);
      if (!finances) {
        throw new NotFoundError('User finances not found');
      }

      if (finances.balance_on_hold < amount) {
        throw new BusinessError('Cannot release more than held', {
          held: finances.balance_on_hold,
          requested: amount
        });
      }

      const newHoldBalance = finances.balance_on_hold - amount;
      
      const query = `
        UPDATE ${this.tableName}
        SET balance_on_hold = ?,
            last_transaction_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `;
      
      await this.safeQuery('run', query, [newHoldBalance, userId]);

      logger.info('Funds released', {
        userId,
        amount,
        reason,
        metadata
      });

      return await this.findByUserId(userId);
    });
  }

  /**
   * Конвертирует зарезервированные средства в потраченные
   * @param {number} userId - ID пользователя
   * @param {number} amount - Сумма для конвертации
   * @param {string} reason - Причина траты
   * @param {Object} metadata - Дополнительные данные
   * @returns {Promise<Object>} Обновленная запись
   */
  static async convertHeldToSpent(userId, amount, reason, metadata = {}) {
    return await this.transaction(async () => {
      const finances = await this.findByUserId(userId);
      if (!finances) {
        throw new NotFoundError('User finances not found');
      }

      if (finances.balance_on_hold < amount) {
        throw new BusinessError('Insufficient held funds', {
          held: finances.balance_on_hold,
          requested: amount
        });
      }

      const query = `
        UPDATE ${this.tableName}
        SET balance_on_hold = balance_on_hold - ?,
            balance = balance - ?,
            total_spent = total_spent + ?,
            last_transaction_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `;

      await this.safeQuery('run', query, [amount, amount, amount, userId]);

      logger.info('Held funds converted to spent', {
        userId,
        amount,
        reason,
        metadata
      });

      return await this.findByUserId(userId);
    });
  }

  /**
   * Добавляет средства на баланс
   * @param {number} userId - ID пользователя
   * @param {number} amount - Сумма для добавления
   * @param {string} source - Источник средств
   * @param {Object} metadata - Дополнительные данные
   * @returns {Promise<Object>} Обновленная запись
   */
  static async addFunds(userId, amount, source, metadata = {}) {
    return await this.transaction(async () => {
      const query = `
        UPDATE ${this.tableName}
        SET balance = balance + ?,
            total_earned = total_earned + ?,
            last_transaction_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `;

      const result = await this.safeQuery('run', query, [amount, amount, userId]);
      
      if (result.changes === 0) {
        throw new NotFoundError('User finances not found');
      }

      logger.info('Funds added', {
        userId,
        amount,
        source,
        metadata
      });

      return await this.findByUserId(userId);
    });
  }

  /**
   * Вывод средств
   * @param {number} userId - ID пользователя
   * @param {number} amount - Сумма для вывода
   * @param {string} destination - Куда выводятся средства
   * @param {Object} metadata - Дополнительные данные
   * @returns {Promise<Object>} Обновленная запись
   */
  static async withdrawFunds(userId, amount, destination, metadata = {}) {
    return await this.transaction(async () => {
      const finances = await this.findByUserId(userId);
      if (!finances) {
        throw new NotFoundError('User finances not found');
      }

      const availableBalance = finances.balance - finances.balance_on_hold;
      if (availableBalance < amount) {
        throw new BusinessError('Insufficient funds for withdrawal', {
          requested: amount,
          available: availableBalance
        });
      }

      const query = `
        UPDATE ${this.tableName}
        SET balance = balance - ?,
            total_withdrawn = total_withdrawn + ?,
            last_transaction_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `;

      await this.safeQuery('run', query, [amount, amount, userId]);

      logger.info('Funds withdrawn', {
        userId,
        amount,
        destination,
        metadata
      });

      return await this.findByUserId(userId);
    });
  }

  /**
   * Переводит средства между пользователями
   * @param {number} fromUserId - ID отправителя
   * @param {number} toUserId - ID получателя
   * @param {number} amount - Сумма перевода
   * @param {string} reason - Причина перевода
   * @returns {Promise<Object>} Результат перевода
   */
  static async transferFunds(fromUserId, toUserId, amount, reason = 'transfer') {
    return await this.transaction(async () => {
      // Проверяем отправителя
      const fromFinances = await this.findByUserId(fromUserId);
      if (!fromFinances) {
        throw new NotFoundError('Sender finances not found');
      }

      const availableBalance = fromFinances.balance - fromFinances.balance_on_hold;
      if (availableBalance < amount) {
        throw new BusinessError('Insufficient funds for transfer');
      }

      // Проверяем получателя
      const toFinances = await this.findByUserId(toUserId);
      if (!toFinances) {
        throw new NotFoundError('Recipient finances not found');
      }

      // Выполняем перевод
      const withdrawQuery = `
        UPDATE ${this.tableName}
        SET balance = balance - ?,
            last_transaction_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `;

      const depositQuery = `
        UPDATE ${this.tableName}
        SET balance = balance + ?,
            total_earned = total_earned + ?,
            last_transaction_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `;

      await this.safeQuery('run', withdrawQuery, [amount, fromUserId]);
      await this.safeQuery('run', depositQuery, [amount, amount, toUserId]);

      logger.info('Funds transferred', {
        fromUserId,
        toUserId,
        amount,
        reason
      });

      return {
        from: await this.findByUserId(fromUserId),
        to: await this.findByUserId(toUserId)
      };
    });
  }

  /**
   * Обновляет подписку
   * @param {number} userId - ID пользователя
   * @param {string} plan - План подписки
   * @param {Date} expiresAt - Дата истечения
   * @returns {Promise<Object>} Обновленная запись
   */
  static async updateSubscription(userId, plan, expiresAt = null) {
    const allowedPlans = ['free', 'standard', 'premium'];
    if (!allowedPlans.includes(plan)) {
      throw new ValidationError(`Invalid subscription plan: ${plan}`);
    }

    const query = `
      UPDATE ${this.tableName}
      SET subscription_plan = ?,
          subscription_expires_at = ?
      WHERE user_id = ?
    `;

    const result = await this.safeQuery('run', query, [
      plan,
      expiresAt ? expiresAt.toISOString() : null,
      userId
    ]);

    if (result.changes === 0) {
      throw new NotFoundError('User finances not found');
    }

    logger.info('Subscription updated', {
      userId,
      plan,
      expiresAt
    });

    return await this.findByUserId(userId);
  }

  /**
   * Получает пользователей с истекающими подписками
   * @param {number} days - За сколько дней до истечения
   * @returns {Promise<Array>} Массив пользователей
   */
  static async getExpiringSubscriptions(days = 7) {
    const query = `
      SELECT f.*, u.username, u.email
      FROM ${this.tableName} f
      JOIN users u ON f.user_id = u.id
      WHERE f.subscription_plan != 'free'
        AND f.subscription_expires_at IS NOT NULL
        AND f.subscription_expires_at <= datetime('now', '+${days} days')
        AND f.subscription_expires_at > datetime('now')
    `;

    return await this.safeQuery('all', query);
  }

  /**
   * Получает статистику по финансам
   * @returns {Promise<Object>} Статистика
   */
  static async getStatistics() {
    const query = `
      SELECT 
        COUNT(*) as total_users,
        SUM(balance) as total_balance,
        SUM(balance_on_hold) as total_on_hold,
        SUM(total_earned) as platform_earned,
        SUM(total_spent) as platform_spent,
        SUM(total_withdrawn) as platform_withdrawn,
        COUNT(CASE WHEN subscription_plan = 'free' THEN 1 END) as free_users,
        COUNT(CASE WHEN subscription_plan = 'standard' THEN 1 END) as standard_users,
        COUNT(CASE WHEN subscription_plan = 'premium' THEN 1 END) as premium_users,
        AVG(balance) as avg_balance
      FROM ${this.tableName}
    `;

    return await this.safeQuery('get', query);
  }

  /**
   * Проверяет и обновляет истекшие подписки
   * @returns {Promise<number>} Количество обновленных записей
   */
  static async processExpiredSubscriptions() {
    const query = `
      UPDATE ${this.tableName}
      SET subscription_plan = 'free',
          subscription_expires_at = NULL
      WHERE subscription_plan != 'free'
        AND subscription_expires_at IS NOT NULL
        AND subscription_expires_at < datetime('now')
    `;

    const result = await this.safeQuery('run', query);

    if (result.changes > 0) {
      logger.info('Expired subscriptions processed', { count: result.changes });
    }

    return result.changes;
  }
}

module.exports = UserFinanceModel;