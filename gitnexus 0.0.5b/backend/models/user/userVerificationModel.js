/**
 * *project*\backend/models/user/userVerificationModel.js
 * Модель для работы с токенами верификации
 */

const BaseModel = require('../BaseModel');
const { ValidationError, NotFoundError } = require('../../utils/errors');
const crypto = require('crypto');
const logger = require('../../utils/logger');

class UserVerificationModel extends BaseModel {
  static tableName = 'user_verification_tokens';

  // Время жизни токенов по типам (в миллисекундах)
  static TOKEN_EXPIRY = {
    email: 24 * 60 * 60 * 1000,          // 24 часа
    phone: 10 * 60 * 1000,               // 10 минут
    password_reset: 60 * 60 * 1000,      // 1 час
    api_activation: 7 * 24 * 60 * 60 * 1000  // 7 дней
  };

  /**
   * Создает токен верификации
   * @param {number} userId - ID пользователя
   * @param {string} type - Тип токена
   * @returns {Promise<Object>} Созданный токен
   */
  static async createToken(userId, type) {
    const allowedTypes = ['email', 'phone', 'password_reset', 'api_activation'];
    if (!allowedTypes.includes(type)) {
      throw new ValidationError(`Invalid token type: ${type}`);
    }

    // Деактивируем старые токены того же типа
    await this.deactivateUserTokens(userId, type);

    const token = crypto.randomBytes(32).toString('hex');
    const expiryTime = this.TOKEN_EXPIRY[type] || 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + expiryTime);

    const created = await super.create({
      user_id: userId,
      token,
      type,
      expires_at: expiresAt.toISOString()
    });

    logger.info('Verification token created', {
      userId,
      type,
      tokenId: created.id
    });

    return created;
  }

  /**
   * Находит токен по значению
   * @param {string} token - Токен
   * @returns {Promise<Object|null>} Найденный токен
   */
  static async findByToken(token) {
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE token = ? 
        AND used_at IS NULL
        AND expires_at > datetime('now')
    `;
    
    return await this.safeQuery('get', query, [token]);
  }

  /**
   * Верифицирует и использует токен
   * @param {string} token - Токен
   * @param {string} expectedType - Ожидаемый тип токена
   * @returns {Promise<Object>} Данные токена
   */
  static async verifyAndUseToken(token, expectedType) {
    const tokenData = await this.findByToken(token);
    
    if (!tokenData) {
      throw new ValidationError('Invalid or expired token');
    }

    if (tokenData.type !== expectedType) {
      throw new ValidationError('Invalid token type');
    }

    // Помечаем токен как использованный
    await super.update(tokenData.id, {
      used_at: new Date().toISOString()
    });

    logger.info('Verification token used', {
      tokenId: tokenData.id,
      userId: tokenData.user_id,
      type: tokenData.type
    });

    return tokenData;
  }

  /**
   * Деактивирует токены пользователя
   * @param {number} userId - ID пользователя
   * @param {string} type - Тип токенов для деактивации
   * @returns {Promise<number>} Количество деактивированных токенов
   */
  static async deactivateUserTokens(userId, type = null) {
    let query = `
      UPDATE ${this.tableName}
      SET used_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
        AND used_at IS NULL
    `;

    const params = [userId];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    const result = await this.safeQuery('run', query, params);
    
    if (result.changes > 0) {
      logger.info('Tokens deactivated', {
        userId,
        type,
        count: result.changes
      });
    }

    return result.changes;
  }

  /**
   * Очищает истекшие токены
   * @returns {Promise<number>} Количество удаленных токенов
   */
  static async cleanupExpiredTokens() {
    const query = `
      DELETE FROM ${this.tableName}
      WHERE expires_at < datetime('now')
        OR (used_at IS NOT NULL AND used_at < datetime('now', '-30 days'))
    `;

    const result = await this.safeQuery('run', query);

    if (result.changes > 0) {
      logger.info('Expired tokens cleaned up', { count: result.changes });
    }

    return result.changes;
  }

  /**
   * Проверяет, может ли пользователь запросить новый токен
   * @param {number} userId - ID пользователя
   * @param {string} type - Тип токена
   * @returns {Promise<Object>} Информация о возможности запроса
   */
  static async canRequestToken(userId, type) {
    // Ограничения на количество токенов в период времени
    const limits = {
      email: { count: 3, period: '1 hour' },
      phone: { count: 5, period: '10 minutes' },
      password_reset: { count: 3, period: '1 hour' },
      api_activation: { count: 1, period: '1 day' }
    };

    const limit = limits[type];
    if (!limit) {
      return { canRequest: true };
    }

    const query = `
      SELECT COUNT(*) as count
      FROM ${this.tableName}
      WHERE user_id = ?
        AND type = ?
        AND created_at > datetime('now', '-${limit.period}')
    `;

    const result = await this.safeQuery('get', query, [userId, type]);
    const canRequest = result.count < limit.count;

    if (!canRequest) {
      const retryAfter = await this.getRetryAfter(userId, type, limit.period);
      return {
        canRequest: false,
        reason: `Too many ${type} token requests`,
        retryAfter
      };
    }

    return { canRequest: true };
  }

  /**
   * Получает время до возможности нового запроса
   * @param {number} userId - ID пользователя
   * @param {string} type - Тип токена
   * @param {string} period - Период ограничения
   * @returns {Promise<Date>} Время, когда можно будет запросить токен
   */
  static async getRetryAfter(userId, type, period) {
    const query = `
      SELECT MIN(datetime(created_at, '+${period}')) as retry_after
      FROM ${this.tableName}
      WHERE user_id = ?
        AND type = ?
        AND created_at > datetime('now', '-${period}')
    `;

    const result = await this.safeQuery('get', query, [userId, type]);
    return result.retry_after ? new Date(result.retry_after) : new Date();
  }

  /**
   * Получает активные токены пользователя
   * @param {number} userId - ID пользователя
   * @returns {Promise<Array>} Массив активных токенов
   */
  static async getActiveTokens(userId) {
    const query = `
      SELECT id, type, created_at, expires_at
      FROM ${this.tableName}
      WHERE user_id = ?
        AND used_at IS NULL
        AND expires_at > datetime('now')
      ORDER BY created_at DESC
    `;

    return await this.safeQuery('all', query, [userId]);
  }

  /**
   * Получает статистику по токенам
   * @returns {Promise<Object>} Статистика
   */
  static async getStatistics() {
    const query = `
      SELECT 
        COUNT(*) as total_tokens,
        COUNT(CASE WHEN used_at IS NOT NULL THEN 1 END) as used_tokens,
        COUNT(CASE WHEN used_at IS NULL AND expires_at > datetime('now') THEN 1 END) as active_tokens,
        COUNT(CASE WHEN type = 'email' THEN 1 END) as email_tokens,
        COUNT(CASE WHEN type = 'phone' THEN 1 END) as phone_tokens,
        COUNT(CASE WHEN type = 'password_resetCOUNT(CASE WHEN type = 'password_reset' THEN 1 END) as password_reset_tokens,
        COUNT(CASE WHEN type = 'api_activation' THEN 1 END) as api_activation_tokens
      FROM ${this.tableName}
      WHERE created_at > datetime('now', '-30 days')
    `;

    return await this.safeQuery('get', query);
  }
}

module.exports = UserVerificationModel;