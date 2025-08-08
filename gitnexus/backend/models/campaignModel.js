// models/campaignModel.js

const BaseModel = require('./baseModel');
const { databases } = require('../config/database');

/**
 * @typedef {Object} CampaignData
 * @property {string} title - Название кампании
 * @property {string} [description] - Описание кампании
 * @property {string} [objective] - Цель кампании
 * @property {Object} [target_audience] - Целевая аудитория
 * @property {number} budget_total - Общий бюджет
 * @property {number} [budget_daily] - Дневной лимит
 * @property {string} [currency] - Валюта
 * @property {string} start_date - Дата начала
 * @property {string} end_date - Дата окончания
 * @property {Array} [creative_assets] - Креативы
 * @property {string} [landing_url] - Целевая ссылка
 * @property {string} [visibility] - Видимость кампании
 */

/**
 * Модель для работы с рекламными кампаниями
 * @extends BaseModel
 */
class Campaign extends BaseModel {
  static tableName = 'campaigns';

  /**
   * Создает новую кампанию
   * @param {number} userId - ID пользователя-создателя
   * @param {CampaignData} campaignData - Данные кампании
   * @returns {Promise<Object>} Созданная кампания
   */
  static async create(userId, campaignData) {
    const {
      title,
      description,
      objective,
      target_audience,
      budget_total,
      budget_daily,
      currency = 'USD',
      start_date,
      end_date,
      creative_assets = [],
      landing_url,
      visibility = 'public'
    } = campaignData;

    // Генерируем UTM параметры
    const utm_parameters = {
      source: 'adnexus',
      medium: 'cpc',
      campaign: title.toLowerCase().replace(/\s+/g, '_')
    };

    const result = await this.db.run(
      `INSERT INTO ${this.tableName} (
        user_id, title, description, objective, target_audience,
        budget_total, budget_daily, currency, start_date, end_date,
        creative_assets, landing_url, utm_parameters, visibility
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        title,
        description,
        objective,
        JSON.stringify(target_audience),
        budget_total,
        budget_daily,
        currency,
        start_date,
        end_date,
        JSON.stringify(creative_assets),
        landing_url,
        JSON.stringify(utm_parameters),
        visibility
      ]
    );

    return this.findById(result.lastID);
  }

  /**
   * Находит кампанию по ID с дополнительной информацией
   * @param {number} id - ID кампании
   * @returns {Promise<Object|null>} Кампания с расчетными полями
   */
  static async findById(id) {
    const campaign = await this.db.get(`
      SELECT 
        c.*,
        u.username as owner_name,
        u.email as owner_email,
        (c.budget_total - c.budget_spent) as budget_remaining,
        CASE 
          WHEN c.deleted_at IS NOT NULL THEN 'deleted'
          WHEN c.end_date < date('now') THEN 'expired'
          ELSE c.status
        END as effective_status
      FROM ${this.tableName} c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [id]);

    if (campaign) {
      // Парсим JSON поля
      campaign.target_audience = this.parseJSON(campaign.target_audience);
      campaign.performance_metrics = this.parseJSON(campaign.performance_metrics);
      campaign.creative_assets = this.parseJSON(campaign.creative_assets);
      campaign.utm_parameters = this.parseJSON(campaign.utm_parameters);
      campaign.ai_generation_data = this.parseJSON(campaign.ai_generation_data);
    }

    return campaign;
  }

  /**
   * Получает все кампании с фильтрацией
   * @param {Object} options - Опции фильтрации
   * @returns {Promise<{data: Array, pagination: Object}>}
   */
  static async findAll(options = {}) {
    const {
      user_id,
      status,
      approval_status,
      objective,
      search,
      date_from,
      date_to,
      budget_min,
      budget_max,
      include_deleted = false,
      sort = 'created_at:desc',
      page = 1,
      limit = 20
    } = options;

    let whereConditions = ['1=1'];
    const params = [];

    // Фильтры
    if (!include_deleted) {
      whereConditions.push('c.deleted_at IS NULL');
    }

    if (user_id) {
      whereConditions.push('c.user_id = ?');
      params.push(user_id);
    }

    if (status) {
      if (Array.isArray(status)) {
        whereConditions.push(`c.status IN (${status.map(() => '?').join(',')})`);
        params.push(...status);
      } else {
        whereConditions.push('c.status = ?');
        params.push(status);
      }
    }

    if (approval_status) {
      whereConditions.push('c.approval_status = ?');
      params.push(approval_status);
    }

    if (objective) {
      whereConditions.push('c.objective = ?');
      params.push(objective);
    }

    if (search) {
      whereConditions.push('(c.title LIKE ? OR c.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (date_from) {
      whereConditions.push('c.start_date >= ?');
      params.push(date_from);
    }

    if (date_to) {
      whereConditions.push('c.end_date <= ?');
      params.push(date_to);
    }

    if (budget_min) {
      whereConditions.push('c.budget_total >= ?');
      params.push(budget_min);
    }

    if (budget_max) {
      whereConditions.push('c.budget_total <= ?');
      params.push(budget_max);
    }

    const whereClause = whereConditions.join(' AND ');

    // Подсчет общего количества
    const countResult = await this.db.get(
      `SELECT COUNT(*) as total FROM ${this.tableName} c WHERE ${whereClause}`,
      params
    );

    // Сортировка и пагинация
    const [sortField, sortOrder] = sort.split(':');
    const offset = (page - 1) * limit;

    // Получение данных
    const campaigns = await this.db.all(`
      SELECT 
        c.*,
        u.username as owner_name,
        (c.budget_total - c.budget_spent) as budget_remaining,
        CASE 
          WHEN c.deleted_at IS NOT NULL THEN 'deleted'
          WHEN c.end_date < date('now') THEN 'expired'
          ELSE c.status
        END as effective_status
      FROM ${this.tableName} c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE ${whereClause}
      ORDER BY c.${sortField} ${sortOrder.toUpperCase()}
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // Парсим JSON поля для каждой кампании
    campaigns.forEach(campaign => {
      campaign.target_audience = this.parseJSON(campaign.target_audience);
      campaign.performance_metrics = this.parseJSON(campaign.performance_metrics);
      campaign.creative_assets = this.parseJSON(campaign.creative_assets);
    });

    return {
      data: campaigns,
      pagination: {
        total: countResult.total,
        page,
        limit,
        pages: Math.ceil(countResult.total / limit)
      }
    };
  }

  /**
   * Обновляет кампанию
   * @param {number} id - ID кампании
   * @param {number} userId - ID пользователя (для проверки прав)
   * @param {Object} updates - Данные для обновления
   * @returns {Promise<Object>} Обновленная кампания
   */
  static async update(id, userId, updates) {
    // Проверяем права на редактирование
    const campaign = await this.findById(id);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Только владелец или админ может редактировать
    const user = await this.db.get('SELECT is_Admin FROM users WHERE id = ?', [userId]);
    if (campaign.user_id !== userId && !user?.is_Admin) {
      throw new Error('Unauthorized to edit this campaign');
    }

    // Фильтруем разрешенные поля для обновления
    const allowedFields = [
      'title', 'description', 'objective', 'target_audience',
      'budget_total', 'budget_daily', 'start_date', 'end_date',
      'creative_assets', 'landing_url', 'utm_parameters', 'visibility'
    ];

    const updateFields = [];
    const updateValues = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updateFields.push(`${key} = ?`);
        // JSON поля нужно сериализовать
        if (['target_audience', 'creative_assets', 'utm_parameters'].includes(key)) {
          updateValues.push(JSON.stringify(value));
        } else {
          updateValues.push(value);
        }
      }
    }

    if (updateFields.length === 0) {
      return campaign; // Нечего обновлять
    }

    updateValues.push(id);
    await this.db.run(
      `UPDATE ${this.tableName} SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    return this.findById(id);
  }

  /**
   * Изменяет статус кампании
   * @param {number} id - ID кампании
   * @param {string} newStatus - Новый статус
   * @param {number} userId - ID пользователя
   * @returns {Promise<Object>} Обновленная кампания
   */
  static async updateStatus(id, newStatus, userId) {
    const campaign = await this.findById(id);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Проверка прав и валидация перехода статусов
    const validTransitions = {
      'draft': ['pending_approval', 'deleted'],
      'pending_approval': ['active', 'rejected', 'draft'],
      'active': ['paused', 'completed'],
      'paused': ['active', 'completed'],
      'completed': [],
      'rejected': ['draft']
    };

    if (!validTransitions[campaign.status]?.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${campaign.status} to ${newStatus}`);
    }

    const updates = { status: newStatus };

    // Дополнительные действия при смене статуса
    if (newStatus === 'active' && !campaign.launched_at) {
      updates.launched_at = new Date().toISOString();
    } else if (newStatus === 'completed') {
      updates.completed_at = new Date().toISOString();
    }

    await this.db.run(
      `UPDATE ${this.tableName} 
       SET status = ?, launched_at = COALESCE(launched_at, ?), completed_at = ?
       WHERE id = ?`,
      [newStatus, updates.launched_at || null, updates.completed_at || null, id]
    );

    return this.findById(id);
  }

  /**
   * Обрабатывает модерацию кампании
   * @param {number} id - ID кампании
   * @param {string} decision - 'approved' или 'rejected'
   * @param {number} moderatorId - ID модератора
   * @param {string} [notes] - Заметки модератора
   * @returns {Promise<Object>} Обновленная кампания
   */
  static async moderate(id, decision, moderatorId, notes = null) {
    const campaign = await this.findById(id);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    if (campaign.status !== 'pending_approval') {
      throw new Error('Campaign is not pending approval');
    }

    const newStatus = decision === 'approved' ? 'active' : 'rejected';
    const now = new Date().toISOString();

    await this.db.run(
      `UPDATE ${this.tableName} 
       SET status = ?, approval_status = ?, approval_notes = ?, 
           approved_by = ?, approved_at = ?
       WHERE id = ?`,
      [newStatus, decision, notes, moderatorId, now, id]
    );

    return this.findById(id);
  }

  /**
   * Обновляет метрики производительности кампании
   * @param {number} id - ID кампании
   * @param {Object} metrics - Новые метрики
   * @returns {Promise<void>}
   */
  static async updatePerformanceMetrics(id, metrics) {
    const campaign = await this.findById(id);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Объединяем с существующими метриками
    const currentMetrics = campaign.performance_metrics || {};
    const updatedMetrics = { ...currentMetrics, ...metrics };

    // Вычисляем производные метрики
    if (updatedMetrics.impressions && updatedMetrics.clicks) {
      updatedMetrics.ctr = (updatedMetrics.clicks / updatedMetrics.impressions * 100).toFixed(2);
    }
    if (updatedMetrics.clicks && campaign.budget_spent) {
      updatedMetrics.cpc = (campaign.budget_spent / updatedMetrics.clicks).toFixed(2);
    }

    await this.db.run(
      `UPDATE ${this.tableName} SET performance_metrics = ? WHERE id = ?`,
      [JSON.stringify(updatedMetrics), id]
    );
  }

  /**
   * Обновляет потраченный бюджет
   * @param {number} id - ID кампании
   * @param {number} amount - Сумма к добавлению
   * @returns {Promise<void>}
   */
  static async addSpentBudget(id, amount) {
    await this.db.run(
      `UPDATE ${this.tableName} 
       SET budget_spent = budget_spent + ? 
       WHERE id = ?`,
      [amount, id]
    );

    // Проверяем, не превышен ли бюджет
    const campaign = await this.findById(id);
    if (campaign.budget_spent >= campaign.budget_total) {
      await this.updateStatus(id, 'completed', campaign.user_id);
    }
  }

  /**
   * Рассчитывает процент выполнения кампании
   * @param {Object} campaign - Объект кампании
   * @returns {number} Процент выполнения (0-100)
   */
  static calculateCompletionRate(campaign) {
    const now = new Date();
    const start = new Date(campaign.start_date);
    const end = new Date(campaign.end_date);

    // Процент по времени
    const totalDays = Math.max(1, (end - start) / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.max(0, (now - start) / (1000 * 60 * 60 * 24));
    const timeCompletion = Math.min(100, (elapsedDays / totalDays) * 100);

    // Процент по бюджету
    const budgetCompletion = Math.min(100, (campaign.budget_spent / campaign.budget_total) * 100);

    // Возвращаем максимальное значение
    return Math.round(Math.max(timeCompletion, budgetCompletion));
  }

  /**
   * Мягкое удаление кампании
   * @param {number} id - ID кампании
   * @param {number} userId - ID пользователя
   * @returns {Promise<boolean>} Успешность удаления
   */
  static async softDelete(id, userId) {
    const campaign = await this.findById(id);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Проверка прав
    const user = await this.db.get('SELECT is_Admin FROM users WHERE id = ?', [userId]);
    if (campaign.user_id !== userId && !user?.is_Admin) {
      throw new Error('Unauthorized to delete this campaign');
    }

    const result = await this.db.run(
      `UPDATE ${this.tableName} 
       SET deleted_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );

    return result.changes > 0;
  }

  /**
   * Парсит JSON строку в объект
   * @private
   * @param {string} jsonString - JSON строка
   * @returns {Object|Array|null} Распарсенный объект
   */
  static parseJSON(jsonString) {
    try {
      return jsonString ? JSON.parse(jsonString) : null;
    } catch (e) {
      console.error('Error parsing JSON:', e);
      return null;
    }
  }
}

module.exports = Campaign;