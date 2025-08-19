/**
 * *project*\backend/models/user/userProfileModel.js
 * Модель для работы с профилями пользователей
 */

const BaseModel = require('../BaseModel');
const { ValidationError, NotFoundError } = require('../../utils/errors');
const logger = require('../../utils/logger');

class UserProfileModel extends BaseModel {
  static tableName = 'user_profiles';

  /**
   * Создает профиль для пользователя
   * @param {Object} profileData - Данные профиля
   * @returns {Promise<Object>} Созданный профиль
   */
  static async create(profileData) {
    const { user_id, ...otherData } = profileData;

    // Проверяем, что профиль еще не существует
    const existing = await this.findByUserId(user_id);
    if (existing) {
      throw new ValidationError('Profile already exists for this user');
    }

    // Создаем профиль с дефолтными значениями
    const profile = {
      user_id,
      phone: null,
      phone_verified: false,
      avatar_url: null,
      bio: null,
      company_name: null,
      company_verified: false,
      preferred_language: 'en',
      timezone: 'UTC',
      notification_settings: '{}',
      ...otherData
    };

    // Используем прямой запрос, так как у нас нет id колонки
    const fields = Object.keys(profile);
    const placeholders = fields.map(() => '?').join(', ');
    const values = Object.values(profile);

    const query = `
      INSERT INTO ${this.tableName} (${fields.join(', ')})
      VALUES (${placeholders})
    `;

    await this.safeQuery('run', query, values);
    
    return await this.findByUserId(user_id);
  }

  /**
   * Находит профиль по user_id
   * @param {number} userId - ID пользователя
   * @returns {Promise<Object|null>} Профиль пользователя
   */
  static async findByUserId(userId) {
    const query = `SELECT * FROM ${this.tableName} WHERE user_id = ?`;
    return await this.safeQuery('get', query, [userId]);
  }

  /**
   * Обновляет профиль пользователя
   * @param {number} userId - ID пользователя
   * @param {Object} updates - Обновляемые поля
   * @returns {Promise<Object>} Обновленный профиль
   */
  static async updateByUserId(userId, updates) {
    const allowedFields = [
      'phone', 'phone_verified', 'avatar_url', 'bio',
      'company_name', 'company_verified', 'preferred_language',
      'timezone', 'notification_settings'
    ];

    // Фильтруем только разрешенные поля
    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    if (Object.keys(filteredUpdates).length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    const fields = Object.keys(filteredUpdates);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = [...Object.values(filteredUpdates), userId];

    const query = `
      UPDATE ${this.tableName} 
      SET ${setClause}
      WHERE user_id = ?
    `;

    const result = await this.safeQuery('run', query, values);

    if (result.changes === 0) {
      throw new NotFoundError('User profile not found');
    }

    return await this.findByUserId(userId);
  }

  /**
   * Обновляет телефон и статус верификации
   * @param {number} userId - ID пользователя
   * @param {string} phone - Номер телефона
   * @param {boolean} verified - Статус верификации
   * @returns {Promise<Object>} Обновленный профиль
   */
  static async updatePhone(userId, phone, verified = false) {
    const updated = await this.updateByUserId(userId, {
      phone,
      phone_verified: verified
    });

    logger.info('User phone updated', { userId, verified });

    return updated;
  }

  /**
   * Верифицирует телефон
   * @param {number} userId - ID пользователя
   * @returns {Promise<Object>} Обновленный профиль
   */
  static async verifyPhone(userId) {
    const profile = await this.findByUserId(userId);
    
    if (!profile) {
      throw new NotFoundError('User profile not found');
    }

    if (!profile.phone) {
      throw new ValidationError('No phone number to verify');
    }

    const updated = await this.updateByUserId(userId, { phone_verified: true });

    logger.info('User phone verified', { userId });

    return updated;
  }

  /**
   * Обновляет аватар пользователя
   * @param {number} userId - ID пользователя
   * @param {string} avatarUrl - URL аватара
   * @returns {Promise<Object>} Обновленный профиль
   */
  static async updateAvatar(userId, avatarUrl) {
    return await this.updateByUserId(userId, { avatar_url: avatarUrl });
  }

  /**
   * Обновляет информацию о компании
   * @param {number} userId - ID пользователя
   * @param {string} companyName - Название компании
   * @param {boolean} verified - Статус верификации
   * @returns {Promise<Object>} Обновленный профиль
   */
  static async updateCompany(userId, companyName, verified = false) {
    const updated = await this.updateByUserId(userId, {
      company_name: companyName,
      company_verified: verified
    });

    logger.info('User company updated', { userId, companyName, verified });

    return updated;
  }

  /**
   * Обновляет настройки уведомлений
   * @param {number} userId - ID пользователя
   * @param {Object} settings - Настройки уведомлений
   * @returns {Promise<Object>} Обновленный профиль
   */
  static async updateNotificationSettings(userId, settings) {
    const settingsJson = JSON.stringify(settings);
    return await this.updateByUserId(userId, { 
      notification_settings: settingsJson 
    });
  }

  /**
   * Находит пользователей по компании
   * @param {string} companyName - Название компании
   * @param {Object} options - Опции поиска
   * @returns {Promise<Array>} Массив профилей
   */
  static async findByCompany(companyName, options = {}) {
    const { verified = null, limit = 50 } = options;

    let query = `
      SELECT p.*, u.username, u.email
      FROM ${this.tableName} p
      JOIN users u ON p.user_id = u.id
      WHERE p.company_name = ?
    `;

    const params = [companyName];

    if (verified !== null) {
      query += ' AND p.company_verified = ?';
      params.push(verified ? 1 : 0);
    }

    query += ' LIMIT ?';
    params.push(limit);

    return await this.safeQuery('all', query, params);
  }

  /**
   * Получает статистику по профилям
   * @returns {Promise<Object>} Статистика
   */
  static async getStatistics() {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(phone) as with_phone,
        COUNT(CASE WHEN phone_verified = 1 THEN 1 END) as phone_verified,
        COUNT(company_name) as with_company,
        COUNT(CASE WHEN company_verified = 1 THEN 1 END) as company_verified,
        COUNT(avatar_url) as with_avatar,
        COUNT(bio) as with_bio
      FROM ${this.tableName}
    `;

    return await this.safeQuery('get', query);
  }
}

module.exports = UserProfileModel;