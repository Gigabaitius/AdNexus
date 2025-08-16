// *project*\backend\models\platformModel.js

const BaseModel = require('./baseModel');
const { databases } = require('../config/database');

/**
 * @typedef {Object} PlatformData
 * @property {string} name - Название площадки
 * @property {string} type - Тип площадки (website, telegram_channel, etc.)
 * @property {string} url - URL площадки
 * @property {string} [description] - Описание площадки
 * @property {number} [audience_size] - Размер аудитории
 * @property {Object} [audience_demographics] - Демографические данные
 * @property {string} pricing_model - Модель ценообразования (cpm, cpc, cpa, flat_rate, hybrid)
 * @property {Object} [pricing] - Цены для разных моделей
 * @property {string} [currency] - Валюта
 */

/**
 * Модель для работы с рекламными площадками
 * @extends BaseModel
 */
class Platform extends BaseModel {
  static tableName = 'adPlatforms';

  /**
   * Создает новую площадку
   * @param {number} userId - ID владельца площадки
   * @param {PlatformData} platformData - Данные площадки
   * @returns {Promise<Object>} Созданная площадка
   */
  static async create(userId, platformData) {
    const {
      name,
      type,
      url,
      description,
      audience_size = 0,
      audience_demographics = {},
      pricing_model,
      pricing = {},
      currency = 'USD'
    } = platformData;

    // Валидация типа площадки
    const validTypes = ['website', 'telegram_channel', 'telegram_group', 'instagram',
      'youtube', 'tiktok', 'facebook', 'vk', 'email_newsletter',
      'mobile_app', 'podcast', 'other'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid platform type: ${type}`);
    }

    // Валидация модели ценообразования
    const validPricingModels = ['cpm', 'cpc', 'cpa', 'flat_rate', 'hybrid'];
    if (!validPricingModels.includes(pricing_model)) {
      throw new Error(`Invalid pricing model: ${pricing_model}`);
    }

    const result = await this.db.run(
      `INSERT INTO ${this.tableName} (
        user_id, name, type, url, description,
        audience_size, audience_demographics,
        pricing_model, pricing, currency
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        name,
        type,
        url,
        description,
        audience_size,
        JSON.stringify(audience_demographics),
        pricing_model,
        JSON.stringify(pricing),
        currency
      ]
    );

    return this.findById(result.lastID);
  }

  /**
   * Находит площадку по ID с дополнительной информацией
   * @param {number} id - ID площадки
   * @returns {Promise<Object|null>} Площадка с расчетными полями
   */
  static async findById(id) {
    const platform = await this.db.get(`
      SELECT 
        p.*,
        u.username as owner_username,
        u.email as owner_email,
        CASE 
          WHEN p.audience_size < 1000 THEN 'micro'
          WHEN p.audience_size < 10000 THEN 'small'
          WHEN p.audience_size < 100000 THEN 'medium'
          ELSE 'large'
        END as audience_size_category,
        CASE 
          WHEN p.verification_status = 'verified' THEN 1
          ELSE 0
        END as is_verified
      FROM ${this.tableName} p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `, [id]);

    if (platform) {
      // Парсим JSON поля
      platform.audience_demographics = this.parseJSON(platform.audience_demographics);
      platform.pricing = this.parseJSON(platform.pricing);
    }

    return platform;
  }

  /**
   * Получает все площадки с фильтрацией
   * @param {Object} options - Опции фильтрации
   * @returns {Promise<{data: Array, pagination: Object}>}
   */
  static async findAll(options = {}) {
    const {
      user_id,
      type,
      status,
      moderation_status,
      verification_status,
      pricing_model,
      currency,
      audience_min,
      audience_max,
      price_max,
      search,
      sort = 'created_at:desc',
      page = 1,
      limit = 20
    } = options;

    let whereConditions = ['1=1'];
    const params = [];

    // Фильтры
    if (user_id) {
      whereConditions.push('p.user_id = ?');
      params.push(user_id);
    }

    if (type) {
      if (Array.isArray(type)) {
        whereConditions.push(`p.type IN (${type.map(() => '?').join(',')})`);
        params.push(...type);
      } else {
        whereConditions.push('p.type = ?');
        params.push(type);
      }
    }

    if (status) {
      whereConditions.push('p.status = ?');
      params.push(status);
    }

    if (moderation_status) {
      whereConditions.push('p.moderation_status = ?');
      params.push(moderation_status);
    }

    if (verification_status) {
      whereConditions.push('p.verification_status = ?');
      params.push(verification_status);
    }

    if (pricing_model) {
      whereConditions.push('p.pricing_model = ?');
      params.push(pricing_model);
    }

    if (currency) {
      whereConditions.push('p.currency = ?');
      params.push(currency);
    }

    if (audience_min) {
      whereConditions.push('p.audience_size >= ?');
      params.push(audience_min);
    }

    if (audience_max) {
      whereConditions.push('p.audience_size <= ?');
      params.push(audience_max);
    }

    if (search) {
      whereConditions.push('(p.name LIKE ? OR p.description LIKE ? OR p.url LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Фильтр по максимальной цене (для любой модели ценообразования)
    if (price_max) {
      // Это потребует более сложной логики с JSON
      // Пока упрощенная версия - будет доработано при расширении
    }

    const whereClause = whereConditions.join(' AND ');

    // Подсчет общего количества
    const countResult = await this.db.get(
      `SELECT COUNT(*) as total FROM ${this.tableName} p WHERE ${whereClause}`,
      params
    );

    // Сортировка и пагинация
    const [sortField, sortOrder] = sort.split(':');
    const offset = (page - 1) * limit;

    // Получение данных
    const platforms = await this.db.all(`
      SELECT 
        p.*,
        u.username as owner_username,
        CASE 
          WHEN p.audience_size < 1000 THEN 'micro'
          WHEN p.audience_size < 10000 THEN 'small'
          WHEN p.audience_size < 100000 THEN 'medium'
          ELSE 'large'
        END as audience_size_category
      FROM ${this.tableName} p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE ${whereClause}
      ORDER BY p.${sortField} ${sortOrder.toUpperCase()}
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // Парсим JSON поля для каждой площадки
    platforms.forEach(platform => {
      platform.audience_demographics = this.parseJSON(platform.audience_demographics);
      platform.pricing = this.parseJSON(platform.pricing);
    });

    return {
      data: platforms,
      pagination: {
        total: countResult.total,
        page,
        limit,
        pages: Math.ceil(countResult.total / limit)
      }
    };
  }

  /**
   * Обновляет площадку
   * @param {number} id - ID площадки
   * @param {number} userId - ID пользователя (для проверки прав)
   * @param {Object} updates - Данные для обновления
   * @returns {Promise<Object>} Обновленная площадка
   */
  static async update(id, userId, updates) {
    // Проверяем права на редактирование
    const platform = await this.findById(id);
    if (!platform) {
      throw new Error('Platform not found');
    }

    // Только владелец или админ может редактировать
    const user = await this.db.get('SELECT is_Admin FROM users WHERE id = ?', [userId]);
    if (platform.user_id !== userId && !user?.is_Admin) {
      throw new Error('Unauthorized to edit this platform');
    }

    // Фильтруем разрешенные поля для обновления
    const allowedFields = [
      'name', 'type', 'url', 'description',
      'audience_size', 'audience_demographics',
      'pricing_model', 'pricing', 'currency'
    ];

    const updateFields = [];
    const updateValues = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updateFields.push(`${key} = ?`);
        // JSON поля нужно сериализовать
        if (['audience_demographics', 'pricing'].includes(key)) {
          updateValues.push(JSON.stringify(value));
        } else {
          updateValues.push(value);
        }
      }
    }

    if (updateFields.length === 0) {
      return platform; // Нечего обновлять
    }

    // При изменении ключевых полей сбрасываем статус модерации
    if (['name', 'url', 'description', 'pricing'].some(field => field in updates)) {
      updateFields.push('moderation_status = ?');
      updateValues.push('pending');
    }

    updateValues.push(id);
    await this.db.run(
      `UPDATE ${this.tableName} SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    return this.findById(id);
  }

  /**
   * Изменяет статус площадки
   * @param {number} id - ID площадки
   * @param {string} newStatus - Новый статус
   * @param {number} userId - ID пользователя
   * @returns {Promise<Object>} Обновленная площадка
   */
  static async updateStatus(id, newStatus, userId) {
    const platform = await this.findById(id);
    if (!platform) {
      throw new Error('Platform not found');
    }

    // Проверка прав
    const user = await this.db.get('SELECT is_Admin FROM users WHERE id = ?', [userId]);
    if (platform.user_id !== userId && !user?.is_Admin) {
      throw new Error('Unauthorized to change platform status');
    }

    // Валидация статуса
    const validStatuses = ['draft', 'pending_review', 'active', 'paused', 'suspended', 'rejected', 'archived'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }

    await this.db.run(
      `UPDATE ${this.tableName} SET status = ? WHERE id = ?`,
      [newStatus, id]
    );

    return this.findById(id);
  }

  /**
   * Обрабатывает модерацию площадки
   * @param {number} id - ID площадки
   * @param {string} decision - 'approved', 'rejected' или 'requires_changes'
   * @param {number} moderatorId - ID модератора
   * @param {string} [notes] - Заметки модератора
   * @returns {Promise<Object>} Обновленная площадка
   */
  static async moderate(id, decision, moderatorId, notes = null) {
    const platform = await this.findById(id);
    if (!platform) {
      throw new Error('Platform not found');
    }

    const validDecisions = ['approved', 'rejected', 'requires_changes'];
    if (!validDecisions.includes(decision)) {
      throw new Error(`Invalid moderation decision: ${decision}`);
    }

    // Обновляем статус в зависимости от решения
    let newStatus = platform.status;
    if (decision === 'approved') {
      newStatus = 'active';
    } else if (decision === 'rejected') {
      newStatus = 'rejected';
    }

    await this.db.run(
      `UPDATE ${this.tableName} 
       SET moderation_status = ?, status = ?, moderation_notes = ?
       WHERE id = ?`,
      [decision, newStatus, notes, id]
    );

    return this.findById(id);
  }

  /**
   * Обновляет статус верификации площадки
   * @param {number} id - ID площадки
   * @param {string} verificationStatus - Новый статус верификации
   * @returns {Promise<Object>} Обновленная площадка
   */
  static async updateVerificationStatus(id, verificationStatus) {
    const validStatuses = ['unverified', 'pending', 'verified', 'failed', 'expired'];
    if (!validStatuses.includes(verificationStatus)) {
      throw new Error(`Invalid verification status: ${verificationStatus}`);
    }

    await this.db.run(
      `UPDATE ${this.tableName} SET verification_status = ? WHERE id = ?`,
      [verificationStatus, id]
    );

    return this.findById(id);
  }

  /**
   * Обновляет метрики качества площадки
   * @param {number} id - ID площадки
   * @param {number} rating - Новый рейтинг (0-5)
   * @param {number} qualityScore - Новый показатель качества (0-10)
   * @returns {Promise<void>}
   */
  static async updateQualityMetrics(id, rating = null, qualityScore = null) {
    const updates = [];
    const values = [];

    if (rating !== null) {
      if (rating < 0 || rating > 5) {
        throw new Error('Rating must be between 0 and 5');
      }
      updates.push('rating = ?');
      values.push(rating);
    }

    if (qualityScore !== null) {
      if (qualityScore < 0 || qualityScore > 10) {
        throw new Error('Quality score must be between 0 and 10');
      }
      updates.push('quality_score = ?');
      values.push(qualityScore);
    }

    if (updates.length === 0) {
      return;
    }

    values.push(id);
    await this.db.run(
      `UPDATE ${this.tableName} SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
  }

  /**
   * Рассчитывает качественный показатель площадки
   * @param {Object} platform - Объект площадки
   * @returns {number} Качественный показатель (0-10)
   */
  static calculateQualityScore(platform) {
    let score = 0;

    // Верификация (3 балла)
    if (platform.verification_status === 'verified') score += 3;
    else if (platform.verification_status === 'pending') score += 1;

    // Размер аудитории (2 балла)
    if (platform.audience_size >= 100000) score += 2;
    else if (platform.audience_size >= 10000) score += 1.5;
    else if (platform.audience_size >= 1000) score += 1;
    else if (platform.audience_size > 0) score += 0.5;

    // Заполненность профиля (2 балла)
    if (platform.description && platform.description.length > 100) score += 1;
    if (platform.audience_demographics && Object.keys(platform.audience_demographics).length > 0) score += 1;

    // Рейтинг (3 балла)
    if (platform.rating > 0) {
      score += (platform.rating / 5) * 3;
    }

    return Math.min(10, Math.round(score * 10) / 10);
  }

  /**
   * Получает похожие площадки
   * @param {number} platformId - ID площадки
   * @param {number} [limit=5] - Количество результатов
   * @returns {Promise<Array>} Массив похожих площадок
   */
  static async findSimilar(platformId, limit = 5) {
    const platform = await this.findById(platformId);
    if (!platform) {
      throw new Error('Platform not found');
    }

    // Ищем площадки того же типа с похожей аудиторией
    const audienceMin = platform.audience_size * 0.5;
    const audienceMax = platform.audience_size * 2;

    const similar = await this.db.all(`
      SELECT 
        p.*,
        u.username as owner_username,
        ABS(p.audience_size - ?) as audience_diff
      FROM ${this.tableName} p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id != ?
        AND p.type = ?
        AND p.status = 'active'
        AND p.audience_size BETWEEN ? AND ?
      ORDER BY audience_diff ASC
      LIMIT ?
    `, [platform.audience_size, platformId, platform.type, audienceMin, audienceMax, limit]);

    // Парсим JSON поля
    similar.forEach(p => {
      p.audience_demographics = this.parseJSON(p.audience_demographics);
      p.pricing = this.parseJSON(p.pricing);
    });

    return similar;
  }

  /**
   * Получает статистику по площадкам пользователя
   * @param {number} userId - ID пользователя
   * @returns {Promise<Object>} Объект со статистикой
   */
  static async getUserPlatformsStats(userId) {
    const stats = await this.db.get(`
      SELECT 
        COUNT(*) as total_platforms,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_platforms,
        COUNT(CASE WHEN verification_status = 'verified' THEN 1 END) as verified_platforms,
        AVG(rating) as average_rating,
        SUM(audience_size) as total_audience,
        AVG(quality_score) as average_quality_score
      FROM ${this.tableName}
      WHERE user_id = ?
    `, [userId]);

    return {
      totalPlatforms: stats.total_platforms || 0,
      activePlatforms: stats.active_platforms || 0,
      verifiedPlatforms: stats.verified_platforms || 0,
      averageRating: parseFloat(stats.average_rating || 0).toFixed(2),
      totalAudience: stats.total_audience || 0,
      averageQualityScore: parseFloat(stats.average_quality_score || 0).toFixed(2)
    };
  }

  /**
   * Проверяет доступность URL площадки
   * @param {string} url - URL для проверки
   * @returns {Promise<boolean>} Доступен ли URL
   */
  static async checkUrlAvailability(url) {
    const existing = await this.db.get(
      `SELECT id FROM ${this.tableName} WHERE url = ? AND status != 'archived'`,
      [url]
    );
    return !existing;
  }

  /**
   * Получает площадки для модерации
   * @param {Object} options - Опции фильтрации
   * @returns {Promise<{data: Array, pagination: Object}>}
   */
  static async getPendingModeration(options = {}) {
    return this.findAll({
      ...options,
      moderation_status: 'pending',
      sort: 'created_at:asc' // Старые первыми
    });
  }

  /**
   * Архивирует площадку
   * @param {number} id - ID площадки
   * @param {number} userId - ID пользователя
   * @returns {Promise<boolean>} Успешность архивации
   */
  static async archive(id, userId) {
    const platform = await this.findById(id);
    if (!platform) {
      throw new Error('Platform not found');
    }

    // Проверка прав
    const user = await this.db.get('SELECT is_Admin FROM users WHERE id = ?', [userId]);
    if (platform.user_id !== userId && !user?.is_Admin) {
      throw new Error('Unauthorized to archive this platform');
    }

    const result = await this.db.run(
      `UPDATE ${this.tableName} SET status = 'archived' WHERE id = ?`,
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

  /**
  * Обновляет информацию о владельце (денормализация)
  * @param {number} platformId - ID площадки
  * @param {Object} ownerData - Данные владельца
  */
  static async updateOwnerInfo(platformId, ownerData) {
    const { username, verified } = ownerData;
    await this.db.run(
      `UPDATE ${this.tableName} 
       SET owner_username = ?, owner_verified = ?
       WHERE id = ?`,
      [username, verified, platformId]
    );
  }

  /**
   * Обновляет детальную информацию об аудитории
   * @param {number} platformId - ID площадки
   * @param {Object} audienceData - Данные аудитории
   */
  static async updateAudienceDetails(platformId, audienceData) {
    const {
      daily_active,
      interests,
      verified,
      demographics
    } = audienceData;

    const updates = [];
    const values = [];

    if (daily_active !== undefined) {
      updates.push('audience_daily_active = ?');
      values.push(daily_active);
    }

    if (interests) {
      updates.push('audience_interests = ?');
      values.push(JSON.stringify(interests));
    }

    if (verified !== undefined) {
      updates.push('audience_verified = ?');
      values.push(verified);
    }

    if (demographics) {
      updates.push('audience_demographics = ?');
      values.push(JSON.stringify(demographics));
    }

    updates.push('audience_last_updated = CURRENT_TIMESTAMP');

    values.push(platformId);
    await this.db.run(
      `UPDATE ${this.tableName} 
       SET ${updates.join(', ')}
       WHERE id = ?`,
      values
    );
  }

  /**
   * Добавляет запись в историю производительности
   * @param {number} platformId - ID площадки
   * @param {Object} performanceData - Данные производительности
   */
  static async addPerformanceHistory(platformId, performanceData) {
    const platform = await this.findById(platformId);
    if (!platform) throw new Error('Platform not found');

    const history = this.parseJSON(platform.historical_performance) || [];
    history.push({
      date: new Date().toISOString(),
      ...performanceData
    });

    // Ограничиваем историю последними 12 месяцами
    if (history.length > 12) {
      history.shift();
    }

    await this.db.run(
      `UPDATE ${this.tableName} 
       SET historical_performance = ?
       WHERE id = ?`,
      [JSON.stringify(history), platformId]
    );
  }

  /**
   * Управляет календарем бронирований
   * @param {number} platformId - ID площадки
   * @param {Object} booking - Данные бронирования
   */
  static async addBooking(platformId, booking) {
    const platform = await this.findById(platformId);
    if (!platform) throw new Error('Platform not found');

    const calendar = this.parseJSON(platform.booking_calendar) || [];

    // Проверяем пересечения с существующими бронированиями
    const hasConflict = calendar.some(existingBooking => {
      const existingStart = new Date(existingBooking.start_date);
      const existingEnd = new Date(existingBooking.end_date);
      const newStart = new Date(booking.start_date);
      const newEnd = new Date(booking.end_date);

      return (newStart <= existingEnd && newEnd >= existingStart);
    });

    if (hasConflict) {
      throw new Error('Booking dates conflict with existing bookings');
    }

    calendar.push({
      campaign_id: booking.campaign_id,
      start_date: booking.start_date,
      end_date: booking.end_date,
      created_at: new Date().toISOString()
    });

    await this.db.run(
      `UPDATE ${this.tableName} 
       SET booking_calendar = ?,
           active_campaigns_count = active_campaigns_count + 1,
           total_campaigns_count = total_campaigns_count + 1,
           last_campaign_date = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [JSON.stringify(calendar), platformId]
    );
  }

  /**
   * Обновляет метрики производительности
   * @param {number} platformId - ID площадки
   * @param {Object} metrics - Новые метрики
   */
  static async updatePerformanceMetrics(platformId, metrics) {
    await this.db.run(
      `UPDATE ${this.tableName} 
       SET metrics = ?
       WHERE id = ?`,
      [JSON.stringify(metrics), platformId]
    );
  }

  /**
   * Обновляет настройки интеграции
   * @param {number} platformId - ID площадки
   * @param {string} integrationType - Тип интеграции
   * @param {Object} settings - Настройки
   */
  static async updateIntegrationSettings(platformId, integrationType, settings) {
    await this.db.run(
      `UPDATE ${this.tableName} 
       SET integration_type = ?,
           integration_settings = ?
       WHERE id = ?`,
      [integrationType, JSON.stringify(settings), platformId]
    );
  }

  /**
   * Подключает внешнюю аналитику
   * @param {number} platformId - ID площадки
   * @param {string} service - Название сервиса (google_analytics, facebook_pixel и т.д.)
   * @param {Object} connectionData - Данные подключения
   */
  static async connectAnalytics(platformId, service, connectionData) {
    const platform = await this.findById(platformId);
    if (!platform) throw new Error('Platform not found');

    const analytics = this.parseJSON(platform.analytics_connected) || {};
    analytics[service] = {
      connected: true,
      connected_at: new Date().toISOString(),
      ...connectionData
    };

    await this.db.run(
      `UPDATE ${this.tableName} 
       SET analytics_connected = ?
       WHERE id = ?`,
      [JSON.stringify(analytics), platformId]
    );
  }

  /**
   * Устанавливает премиум статус
   * @param {number} platformId - ID площадки
   * @param {Date} until - До какой даты действует премиум
   */
  static async setPremiumStatus(platformId, until) {
    await this.db.run(
      `UPDATE ${this.tableName} 
       SET is_premium = TRUE,
           premium_until = ?
       WHERE id = ?`,
      [until.toISOString(), platformId]
    );
  }

  /**
   * Soft delete площадки
   * @param {number} platformId - ID площадки
   */
  static async softDelete(platformId) {
    await this.db.run(
      `UPDATE ${this.tableName} 
       SET deleted_at = CURRENT_TIMESTAMP,
           status = 'archived'
       WHERE id = ?`,
      [platformId]
    );
  }

  /**
   * Восстанавливает удаленную площадку
   * @param {number} platformId - ID площадки
   */
  static async restore(platformId) {
    await this.db.run(
      `UPDATE ${this.tableName} 
       SET deleted_at = NULL,
           status = 'draft'
       WHERE id = ?`,
      [platformId]
    );
  }

  /**
   * Обновляет категории и теги для поиска
   * @param {number} platformId - ID площадки
   * @param {Object} searchData - Данные для поиска
   */
  static async updateSearchData(platformId, searchData) {
    const {
      primary_category,
      categories,
      keywords,
      tags_count
    } = searchData;

    const updates = [];
    const values = [];

    if (primary_category) {
      updates.push('primary_category = ?');
      values.push(primary_category);
    }

    if (categories) {
      updates.push('categories = ?');
      values.push(JSON.stringify(categories));
    }

    if (keywords) {
      updates.push('keywords = ?');
      values.push(keywords);
    }

    if (tags_count !== undefined) {
      updates.push('tags_count = ?');
      values.push(tags_count);
    }

    values.push(platformId);
    await this.db.run(
      `UPDATE ${this.tableName} 
       SET ${updates.join(', ')}
       WHERE id = ?`,
      values
    );
  }

  /**
   * Полнотекстовый поиск по площадкам
   * @param {string} query - Поисковый запрос
   * @param {Object} options - Опции поиска
   */
  static async searchFullText(query, options = {}) {
    const { limit = 20, offset = 0 } = options;

    const results = await this.db.all(`
      SELECT 
        p.*,
        u.username as owner_username,
        snippet(adPlatforms_fts, 1, '<mark>', '</mark>', '...', 32) as description_snippet
      FROM adPlatforms p
      JOIN adPlatforms_fts ON p.id = adPlatforms_fts.rowid
      LEFT JOIN users u ON p.user_id = u.id
      WHERE adPlatforms_fts MATCH ?
        AND p.deleted_at IS NULL
        AND p.status = 'active'
      ORDER BY rank
      LIMIT ? OFFSET ?
    `, [query, limit, offset]);

    // Парсим JSON поля
    results.forEach(platform => {
      platform.audience_demographics = this.parseJSON(platform.audience_demographics);
      platform.pricing = this.parseJSON(platform.pricing);
      platform.metrics = this.parseJSON(platform.metrics);
      platform.categories = this.parseJSON(platform.categories);
    });

    return results;
  }

  /**
 * Устанавливает метод верификации
 * @param {number} platformId - ID площадки
 * @param {string} method - Метод верификации
 */
  static async setVerificationMethod(platformId, method) {
    const validMethods = ['meta_tag', 'dns_record', 'file_upload', 'oauth', 'manual'];
    if (!validMethods.includes(method)) {
      throw new Error(`Invalid verification method: ${method}`);
    }

    await this.db.run(
      `UPDATE ${this.tableName} SET verification_method = ? WHERE id = ?`,
      [method, platformId]
    );
  }

  /**
   * Обновляет время последнего обновления аудитории
   * @param {number} platformId - ID площадки
   */
  static async touchAudienceLastUpdated(platformId) {
    await this.db.run(
      `UPDATE ${this.tableName} 
     SET audience_last_updated = CURRENT_TIMESTAMP 
     WHERE id = ?`,
      [platformId]
    );
  }

  /**
   * Получает площадки по подтипу
   * @param {string} subtype - Подтип площадки
   * @returns {Promise<Array>} Массив площадок
   */
  static async getPlatformsBySubtype(subtype) {
    return await this.db.all(`
    SELECT * FROM ${this.tableName}
    WHERE subtype = ? AND deleted_at IS NULL
    ORDER BY quality_score DESC
  `, [subtype]);
  }

  /**
   * Получает площадки с возможностью торга
   * @returns {Promise<Array>} Массив площадок
   */
  static async getNegotiablePlatforms() {
    return await this.db.all(`
    SELECT * FROM ${this.tableName}
    WHERE price_negotiable = TRUE 
      AND status = 'active' 
      AND deleted_at IS NULL
    ORDER BY audience_size DESC
  `);
  }
}
module.exports = Platform;