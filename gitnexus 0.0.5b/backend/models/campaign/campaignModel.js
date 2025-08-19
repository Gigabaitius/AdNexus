/**
 * *project*\backend/models/campaign/campaignModel.js
 * Обновленная модель с использованием BaseModel
 */

const BaseModel = require('../BaseModel');

class CampaignModel extends BaseModel {
  static tableName = 'campaigns';

/**
   * Создает новую кампанию
   * @param {Object} campaignData - Данные кампании
   * @returns {Promise<Object>} Созданная кампания
   */
  static async create(campaignData) {
    const {
      user_id, title, description, objective,
      budget_total, budget_daily, currency,
      start_date, end_date,
      external_id, external_system,
      is_test_campaign = false,
      requires_approval = true
    } = campaignData;

    return await super.create({
      user_id, title, description, objective,
      budget_total, budget_daily, currency,
      start_date, end_date,
      external_id, external_system,
      is_test_campaign, requires_approval,
      status: 'draft',
      budget_spent: 0
    });
  }

  /**
   * Находит все кампании пользователя с расширенными опциями
   * @param {number} userId - ID пользователя
   * @param {Object} options - Опции фильтрации
   * @returns {Promise<Object>} Результат с пагинацией
   */
  static async findByUserId(userId, options = {}) {
    const { 
      status = null,
      includeDeleted = false,
      search = null,
      ...paginationOptions
    } = options;

    const where = { user_id: userId };
    
    if (status) {
      where.status = status;
    }
    
    if (!includeDeleted) {
      where.deleted_at = null;
    }

    // Если есть поисковый запрос
    if (search) {
      const searchQuery = `
        SELECT c.* FROM campaigns c
        LEFT JOIN campaigns_fts fts ON c.id = fts.rowid
        WHERE c.user_id = ? 
          ${status ? 'AND c.status = ?' : ''}
          ${!includeDeleted ? 'AND c.deleted_at IS NULL' : ''}
          AND (
            c.title LIKE ? OR 
            c.description LIKE ? OR
            fts.title MATCH ? OR
            fts.description MATCH ?
          )
        ORDER BY c.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const searchPattern = `%${search}%`;
      const params = [userId];
      if (status) params.push(status);
      params.push(searchPattern, searchPattern, search, search);
      params.push(paginationOptions.limit || 20);
      params.push((paginationOptions.page - 1) * (paginationOptions.limit || 20));

      const data = await this.safeQuery('all', searchQuery, params);
      
      // Подсчет общего количества для поиска
      const countQuery = searchQuery.replace(
        'SELECT c.*', 
        'SELECT COUNT(*) as total'
      ).replace(/LIMIT \? OFFSET \?$/, '');
      
      const { total } = await this.safeQuery('get', countQuery, params.slice(0, -2));

      return {
        data,
        pagination: {
          page: paginationOptions.page || 1,
          limit: paginationOptions.limit || 20,
          total,
          totalPages: Math.ceil(total / (paginationOptions.limit || 20))
        }
      };
    }

    return await super.findAll({ ...paginationOptions, where });
  }

  /**
   * Обновляет статус кампании
   * @param {number} id - ID кампании
   * @param {string} status - Новый статус
   * @returns {Promise<Object>} Обновленная кампания
   */
  static async updateStatus(id, status) {
    return await super.update(id, { status });
  }

  /**
   * Обновляет статус модерации
   * @param {number} id - ID кампании
   * @param {string} approvalStatus - Статус модерации
   * @param {number} approvedBy - ID модератора
   * @param {string} notes - Примечания
   * @returns {Promise<Object>} Обновленная кампания
   */
  static async updateApprovalStatus(id, approvalStatus, approvedBy, notes = null) {
    return await super.update(id, {
      approval_status: approvalStatus,
      approved_by: approvedBy,
      approval_notes: notes,
      approved_at: new Date().toISOString()
    });
  }

  /**
   * Обновляет потраченный бюджет
   * @param {number} id - ID кампании
   * @param {number} amount - Сумма для добавления
   * @returns {Promise<Object>} Обновленная кампания
   */
  static async incrementBudgetSpent(id, amount) {
    const query = `
      UPDATE campaigns 
      SET budget_spent = budget_spent + ? 
      WHERE id = ? AND deleted_at IS NULL
    `;
    
    const result = await this.safeQuery('run', query, [amount, id]);
    
    if (result.changes === 0) {
      throw new NotFoundError('Campaign not found');
    }
    
    return await this.findById(id);
  }

  /**
   * Находит кампании для модерации с пагинацией
   * @param {Object} options - Опции пагинации
   * @returns {Promise<Object>} Результат с пагинацией
   */
  static async findPendingModeration(options = {}) {
    const query = `
      SELECT c.*, u.username, u.email
      FROM campaigns c
      JOIN users u ON c.user_id = u.id
      WHERE c.approval_status = 'pending' 
        AND c.deleted_at IS NULL
      ORDER BY c.created_at ASC
    `;

    // Используем базовый метод для обработки пагинации
    return await this.findAll({
      ...options,
      where: { approval_status: 'pending', deleted_at: null }
    });
  }

  /**
   * Находит активные кампании с истекающим бюджетом
   * @param {number} threshold - Порог в процентах
   * @returns {Promise<Array>} Массив кампаний
   */
  static async findLowBudgetCampaigns(threshold = 10) {
    const query = `
      SELECT * FROM campaigns
      WHERE status = 'active'
        AND deleted_at IS NULL
        AND (budget_spent / budget_total) > ?
    `;

    return await this.safeQuery('all', query, [(100 - threshold) / 100]);
  }

  /**
   * Находит завершающиеся кампании
   * @param {number} days - Количество дней до завершения
   * @returns {Promise<Array>} Массив кампаний
   */
  static async findEndingSoon(days = 3) {
    const query = `
      SELECT * FROM campaigns
      WHERE status = 'active'
        AND deleted_at IS NULL
        AND date(end_date) <= date('now', '+' || ? || ' days')
        AND date(end_date) >= date('now')
    `;

    return await this.safeQuery('all', query, [days]);
  }

  /**
   * Подсчитывает кампании по статусам для пользователя
   * @param {number} userId - ID пользователя
   * @returns {Promise<Object>} Объект со счетчиками
   */
  static async countByStatus(userId) {
    const query = `
      SELECT 
        status,
        COUNT(*) as count
      FROM campaigns
      WHERE user_id = ? AND deleted_at IS NULL
      GROUP BY status
    `;

    const results = await this.safeQuery('all', query, [userId]);
    
    return results.reduce((acc, row) => {
      acc[row.status] = row.count;
      return acc;
    }, {});
  }

  /**
   * Проверяет доступность имени кампании для пользователя
   * @param {number} userId - ID пользователя
   * @param {string} title - Название кампании
   * @returns {Promise<boolean>} Доступность имени
   */
  static async checkTitleAvailability(userId, title) {
    const count = await this.count({
      user_id: userId,
      title: title,
      deleted_at: null
    });

    return count === 0;
  }
}

module.exports = CampaignModel;