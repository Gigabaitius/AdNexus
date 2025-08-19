/**
 * *project*\backend/models/user/userApiModel.js
 * Модель для работы с API доступом пользователей
 */

const BaseModel = require('../BaseModel');
const { ValidationError, NotFoundError } = require('../../utils/errors');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const logger = require('../../utils/logger');

class UserApiModel extends BaseModel {
  static tableName = 'user_api_access';

  /**
   * Генерирует API ключ и секрет
   * @returns {Object} Объект с ключом и секретом
   */
  static generateApiKey() {
    const key = `ak_${crypto.randomBytes(16).toString('hex')}`;
    const secret = `sk_${crypto.randomBytes(32).toString('hex')}`;
    
    return { key, secret };
  }

  /**
   * Создает новый API ключ для пользователя
   * @param {number} userId - ID пользователя
   * @param {string} name - Название ключа
   * @param {Array} permissions - Массив разрешений
   * @returns {Promise<Object>} Созданный ключ с секретом
   */
  static async createApiKey(userId, name, permissions = []) {
    const { key, secret } = this.generateApiKey();
    const secretHash = await bcrypt.hash(secret, 10);

    try {
      const created = await super.create({
        user_id: userId,
        api_key: key,
        api_secret_hash: secretHash,
        name,
        permissions: JSON.stringify(permissions),
        rate_limit: 1000,
        is_active: true
      });

      logger.info('API key created', {
        userId,
        keyId: created.id,
        name
      });

      // Возвращаем ключ с оригинальным секретом (только при создании)
      return {
        ...created,
        api_secret: secret
      };
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        throw new ValidationError('API key generation failed, please try again');
      }
      throw error;
    }
  }

  /**
   * Находит ключ по API key
   * @param {string} apiKey - API ключ
   * @returns {Promise<Object|null>} Найденный ключ
   */
  static async findByApiKey(apiKey) {
    const query = `SELECT * FROM ${this.tableName} WHERE api_key = ?`;
    return await this.safeQuery('get', query, [apiKey]);
  }

  /**
   * Находит все ключи пользователя
   * @param {number} userId - ID пользователя
   * @returns {Promise<Array>} Массив ключей
   */
  static async findByUserId(userId) {
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `;
    
    return await this.safeQuery('all', query, [userId]);
  }

  /**
   * Верифицирует API ключ и секрет
   * @param {string} apiKey - API ключ
   * @param {string} apiSecret - API секрет
   * @returns {Promise<Object|null>} Верифицированный ключ или null
   */
  static async verifyApiKey(apiKey, apiSecret) {
const keyData = await this.findByApiKey(apiKey);
    
    if (!keyData) {
      return null;
    }

    if (!keyData.is_active) {
      logger.warn('Attempt to use inactive API key', { apiKey });
      return null;
    }

    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      logger.warn('Attempt to use expired API key', { apiKey });
      return null;
    }

    const isValid = await bcrypt.compare(apiSecret, keyData.api_secret_hash);
    
    if (!isValid) {
      logger.warn('Invalid API secret', { apiKey });
      return null;
    }

    // Обновляем время последнего использования
    await this.updateLastUsed(keyData.id);

    return keyData;
  }

  /**
   * Обновляет время последнего использования
   * @param {number} id - ID ключа
   * @returns {Promise<void>}
   */
  static async updateLastUsed(id) {
    const query = `
      UPDATE ${this.tableName}
      SET last_used_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    await this.safeQuery('run', query, [id]);
  }

  /**
   * Обновляет разрешения ключа
   * @param {number} id - ID ключа
   * @param {Array} permissions - Новые разрешения
   * @returns {Promise<Object>} Обновленный ключ
   */
  static async updatePermissions(id, permissions) {
    const updated = await super.update(id, {
      permissions: JSON.stringify(permissions)
    });

    logger.info('API key permissions updated', {
      keyId: id,
      permissions
    });

    return updated;
  }

  /**
   * Активирует/деактивирует ключ
   * @param {number} id - ID ключа
   * @param {boolean} isActive - Статус активности
   * @returns {Promise<Object>} Обновленный ключ
   */
  static async setActive(id, isActive) {
    const updated = await super.update(id, {
      is_active: isActive
    });

    logger.info('API key status changed', {
      keyId: id,
      isActive
    });

    return updated;
  }

  /**
   * Обновляет лимит запросов
   * @param {number} id - ID ключа
   * @param {number} rateLimit - Новый лимит
   * @returns {Promise<Object>} Обновленный ключ
   */
  static async updateRateLimit(id, rateLimit) {
    if (rateLimit < 0 || rateLimit > 100000) {
      throw new ValidationError('Rate limit must be between 0 and 100000');
    }

    return await super.update(id, {
      rate_limit: rateLimit
    });
  }

  /**
   * Устанавливает срок действия ключа
   * @param {number} id - ID ключа
   * @param {Date} expiresAt - Дата истечения
   * @returns {Promise<Object>} Обновленный ключ
   */
  static async setExpiration(id, expiresAt) {
    return await super.update(id, {
      expires_at: expiresAt ? expiresAt.toISOString() : null
    });
  }

  /**
   * Проверяет разрешения ключа
   * @param {number} id - ID ключа
   * @param {string} permission - Проверяемое разрешение
   * @returns {Promise<boolean>} Есть ли разрешение
   */
  static async hasPermission(id, permission) {
    const keyData = await this.findById(id);
    
    if (!keyData) {
      return false;
    }

    const permissions = JSON.parse(keyData.permissions);
    
    // Проверяем точное совпадение или wildcard
    return permissions.includes(permission) || 
           permissions.includes('*') ||
           permissions.some(p => {
             if (p.endsWith('*')) {
               return permission.startsWith(p.slice(0, -1));
             }
             return false;
           });
  }

  /**
   * Удаляет все истекшие ключи
   * @returns {Promise<number>} Количество удаленных ключей
   */
  static async cleanupExpiredKeys() {
    const query = `
      DELETE FROM ${this.tableName}
      WHERE expires_at IS NOT NULL
        AND expires_at < datetime('now')
    `;

    const result = await this.safeQuery('run', query);

    if (result.changes > 0) {
      logger.info('Expired API keys cleaned up', { count: result.changes });
    }

    return result.changes;
  }

  /**
   * Получает статистику использования API
   * @param {number} userId - ID пользователя
   * @returns {Promise<Object>} Статистика
   */
  static async getUserApiStatistics(userId) {
    const query = `
      SELECT 
        COUNT(*) as total_keys,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_keys,
        COUNT(CASE WHEN expires_at IS NOT NULL THEN 1 END) as expiring_keys,
        COUNT(CASE WHEN last_used_at > datetime('now', '-7 days') THEN 1 END) as recently_used
      FROM ${this.tableName}
      WHERE user_id = ?
    `;

    return await this.safeQuery('get', query, [userId]);
  }

  /**
   * Ротирует секрет ключа
   * @param {number} id - ID ключа
   * @returns {Promise<Object>} Обновленный ключ с новым секретом
   */
  static async rotateSecret(id) {
    const keyData = await this.findById(id);
    
    if (!keyData) {
      throw new NotFoundError('API key not found');
    }

    const { secret } = this.generateApiKey();
    const secretHash = await bcrypt.hash(secret, 10);

    await super.update(id, {
      api_secret_hash: secretHash
    });

    logger.info('API key secret rotated', {
      keyId: id,
      userId: keyData.user_id
    });

    return {
      ...keyData,
      api_secret: secret
    };
  }
}

module.exports = UserApiModel;