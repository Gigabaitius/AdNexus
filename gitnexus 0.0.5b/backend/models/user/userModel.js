/**
 * *project*\backend/models/user/userModel.js
 * Модель для работы с основной таблицей users
 */

const BaseModel = require('../BaseModel');
const { ValidationError, NotFoundError } = require('../../utils/errors');
const bcrypt = require('bcrypt');
const logger = require('../../utils/logger');

class UserModel extends BaseModel {
  static tableName = 'users';

  /**
   * Создает нового пользователя
   * @param {Object} userData - Данные пользователя
   * @returns {Promise<Object>} Созданный пользователь
   */
  static async create(userData) {
    const { username, email, password } = userData;

    // Проверка уникальности
    const existingEmail = await this.findByEmail(email);
    if (existingEmail) {
      throw new ValidationError('Email already registered');
    }

    const existingUsername = await this.findByUsername(username);
    if (existingUsername) {
      throw new ValidationError('Username already taken');
    }

    // Хешируем пароль
    const password_hash = await bcrypt.hash(password, 10);

    const user = await super.create({
      username,
      email,
      password_hash,
      email_verified: false,
      is_admin: 0,
      is_moderator: 0,
      status: 'active',
      login_count: 0
    });

    logger.info('User created', { userId: user.id, username: user.username });

    return user;
  }

  /**
   * Находит пользователя по email
   * @param {string} email - Email пользователя
   * @returns {Promise<Object|null>} Найденный пользователь
   */
  static async findByEmail(email) {
    const query = `SELECT * FROM ${this.tableName} WHERE email = ?`;
    return await this.safeQuery('get', query, [email]);
  }

  /**
   * Находит пользователя по username
   * @param {string} username - Username пользователя
   * @returns {Promise<Object|null>} Найденный пользователь
   */
  static async findByUsername(username) {
    const query = `SELECT * FROM ${this.tableName} WHERE username = ?`;
    return await this.safeQuery('get', query, [username]);
  }

  /**
   * Обновляет последний вход
   * @param {number} id - ID пользователя
   * @returns {Promise<Object>} Обновленный пользователь
   */
  static async updateLastLogin(id) {
    const query = `
      UPDATE ${this.tableName} 
      SET last_login_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await this.safeQuery('run', query, [id]);
    return await this.findById(id);
  }

  /**
   * Изменяет роль пользователя
   * @param {number} id - ID пользователя
   * @param {string} role - Роль (is_admin, is_moderator)
   * @param {boolean} value - Значение роли
   * @returns {Promise<Object>} Обновленный пользователь
   */
  static async updateRole(id, role, value) {
    const allowedRoles = ['is_admin', 'is_moderator'];
    if (!allowedRoles.includes(role)) {
      throw new ValidationError(`Invalid role: ${role}`);
    }

    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updated = await super.update(id, { [role]: value ? 1 : 0 });

    logger.info('User role updated', {
      userId: id,
      role,
      value,
      updatedBy: 'system' // Should be passed from context
    });

    return updated;
  }

  /**
   * Проверяет пароль
   * @param {Object} user - Пользователь
   * @param {string} password - Пароль для проверки
   * @returns {Promise<boolean>} Результат проверки
   */
  static async verifyPassword(user, password) {
    return await bcrypt.compare(password, user.password_hash);
  }

  /**
   * Обновляет пароль
   * @param {number} id - ID пользователя
   * @param {string} newPassword - Новый пароль
   * @returns {Promise<Object>} Обновленный пользователь
   */
  static async updatePassword(id, newPassword) {
    const password_hash = await bcrypt.hash(newPassword, 10);
    const updated = await super.update(id, { password_hash });

    logger.info('User password updated', { userId: id });

    return updated;
  }

  /**
   * Меняет статус пользователя
   * @param {number} id - ID пользователя
   * @param {string} status - Новый статус
   * @returns {Promise<Object>} Обновленный пользователь
   */
  static async updateStatus(id, status) {
    const allowedStatuses = ['active', 'suspended', 'banned'];
    if (!allowedStatuses.includes(status)) {
      throw new ValidationError(`Invalid status: ${status}`);
    }

    const updated = await super.update(id, { status });

    logger.info('User status updated', { userId: id, status });

    return updated;
  }

  /**
   * Банит пользователя
   * @param {number} id - ID пользователя
   * @param {string} reason - Причина бана
   * @param {Date|null} until - До какого времени
   * @returns {Promise<Object>} Забаненный пользователь
   */
  static async banUser(id, reason, until = null) {
    const updated = await super.update(id, {
      status: 'banned',
      ban_reason: reason,
      banned_until: until ? until.toISOString() : null
    });

    logger.warn('User banned', {
      userId: id,
      reason,
      until
    });

    return updated;
  }

  /**
   * Разбанивает пользователя
   * @param {number} id - ID пользователя
   * @returns {Promise<Object>} Разбаненный пользователь
   */
  static async unbanUser(id) {
    const updated = await super.update(id, {
      status: 'active',
      ban_reason: null,
      banned_until: null
    });

    logger.info('User unbanned', { userId: id });

    return updated;
  }

  /**
   * Подтверждает email
   * @param {number} id - ID пользователя
   * @returns {Promise<Object>} Обновленный пользователь
   */
  static async verifyEmail(id) {
    const updated = await super.update(id, { email_verified: true });

    logger.info('User email verified', { userId: id });

    return updated;
  }

  /**
   * Включает/выключает 2FA
   * @param {number} id - ID пользователя
   * @param {boolean} enabled - Включить/выключить
   * @param {string|null} secret - Секрет для 2FA
   * @returns {Promise<Object>} Обновленный пользователь
   */
  static async update2FA(id, enabled, secret = null) {
    const updates = {
      two_factor_enabled: enabled
    };

    if (enabled && secret) {
      updates.two_factor_secret = secret;
    } else if (!enabled) {
      updates.two_factor_secret = null;
    }

    const updated = await super.update(id, updates);

    logger.info('User 2FA updated', { userId: id, enabled });

    return updated;
  }

  /**
   * Поиск пользователей с фильтрами
   * @param {Object} options - Опции поиска
   * @returns {Promise<Object>} Результаты с пагинацией
   */
  static async search(options = {}) {
    const {
      page = 1,
      limit = 20,
      search = null,
      status = null,
      role = null,
      emailVerified = null,
      orderBy = 'created_at',
      orderDir = 'DESC'
    } = options;

    const offset = (page - 1) * limit;
    const whereConditions = [];
    const params = [];

    // Поисковый запрос
    if (search) {
      whereConditions.push('(username LIKE ? OR email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    // Фильтр по статусу
    if (status) {
      whereConditions.push('status = ?');
      params.push(status);
    }

    // Фильтр по роли
    if (role === 'admin') {
      whereConditions.push('is_admin = 1');
    } else if (role === 'moderator') {
      whereConditions.push('is_moderator = 1');
    } else if (role === 'user') {
      whereConditions.push('is_admin = 0 AND is_moderator = 0');
    }

    // Фильтр по верификации email
    if (emailVerified !== null) {
      whereConditions.push('email_verified = ?');
      params.push(emailVerified ? 1 : 0);
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Получаем общее количество
    const countQuery = `SELECT COUNT(*) as total FROM ${this.tableName} ${whereClause}`;
    const { total } = await this.safeQuery('get', countQuery, params);

    // Получаем данные
    const dataQuery = `
      SELECT * FROM ${this.tableName}
      ${whereClause}
      ORDER BY ${orderBy} ${orderDir}
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);
    const data = await this.safeQuery('all', dataQuery, params);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Получает статистику пользователей
   * @returns {Promise<Object>} Статистика
   */
  static async getStatistics() {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'banned' THEN 1 END) as banned,
        COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended,
        COUNT(CASE WHEN email_verified = 1 THEN 1 END) as verified,
        COUNT(CASE WHEN is_admin = 1 THEN 1 END) as admins,
        COUNT(CASE WHEN is_moderator = 1 THEN 1 END) as moderators,
        COUNT(CASE WHEN two_factor_enabled = 1 THEN 1 END) as with_2fa
      FROM ${this.tableName}
    `;

    return await this.safeQuery('get', query);
  }

  /**
   * Очищает истекшие баны
   * @returns {Promise<number>} Количество разбаненных пользователей
   */
  static async clearExpiredBans() {
    const query = `
      UPDATE ${this.tableName}
      SET status = 'active', ban_reason = NULL, banned_until = NULL
      WHERE status = 'banned' 
        AND banned_until IS NOT NULL 
        AND banned_until < datetime('now')
    `;

    const result = await this.safeQuery('run', query);

    if (result.changes > 0) {
      logger.info('Expired bans cleared', { count: result.changes });
    }

    return result.changes;
  }

  static async getUsersWithCampaigns(options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const query = `
    SELECT 
      u.*,
      COUNT(DISTINCT c.id) as campaign_count,
      SUM(c.budget_total) as total_budget
    FROM ${this.tableName} u
    LEFT JOIN campaigns c ON u.id = c.user_id AND c.deleted_at IS NULL
    GROUP BY u.id
    HAVING campaign_count > 0
    ORDER BY campaign_count DESC
    LIMIT ? OFFSET ?
  `;

    const users = await this.safeQuery('all', query, [limit, offset]);

    // Получаем общее количество
    const countQuery = `
    SELECT COUNT(DISTINCT u.id) as total
    FROM ${this.tableName} u
    INNER JOIN campaigns c ON u.id = c.user_id AND c.deleted_at IS NULL
  `;

    const { total } = await this.safeQuery('get', countQuery);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async getTransactionHistory(userId, options = {}) {
    // Временная заглушка до создания таблицы transactions
    logger.warn('getTransactionHistory called but transactions table not implemented');

    return {
      data: [],
      pagination: {
        page: 1,
        limit: options.limit || 20,
        total: 0,
        totalPages: 0
      }
    };
  }
}

module.exports = UserModel;