/**
 * *project*\backend/models/campaign/campaignTargetingModel.js
 * Модель для работы с таблицей campaign_targeting
 */

const BaseModel = require('../BaseModel');

class CampaignTargetingModel extends BaseModel {
  static tableName = 'campaign_targeting';

  /**
   * Создает запись таргетинга для кампании
   * @param {number} campaignId - ID кампании
   * @param {Object} targetingData - Данные таргетинга
   * @returns {Promise<boolean>} Успешность операции
   */
  static async create(campaignId, targetingData = {}) {
    const {
      tags = '[]',
      primary_tag = null,
      target_interests = '[]',
      target_audience = '{}',
      target_age_range = '{}',
      target_gender = 'all',
      target_locations = '[]',
      excluded_locations = '[]',
      language_targeting = '[]',
      device_targeting = '[]',
      os_targeting = '[]',
      browser_targeting = '[]',
      behavioral_targeting = '{}',
      retargeting_enabled = false,
      retargeting_settings = '{}',
      brand_safety_enabled = true,
      blocked_categories = '[]',
      blocked_domains = '[]',
      content_category = null
    } = targetingData;

    const query = `
      INSERT INTO campaign_targeting (
        campaign_id, tags, primary_tag, target_interests,
        target_audience, target_age_range, target_gender,
        target_locations, excluded_locations, language_targeting,
        device_targeting, os_targeting, browser_targeting,
        behavioral_targeting, retargeting_enabled, retargeting_settings,
        brand_safety_enabled, blocked_categories, blocked_domains,
        content_category
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      await this.db.run(query, [
        campaignId, tags, primary_tag, target_interests,
        target_audience, target_age_range, target_gender,
        target_locations, excluded_locations, language_targeting,
        device_targeting, os_targeting, browser_targeting,
        behavioral_targeting, retargeting_enabled, retargeting_settings,
        brand_safety_enabled, blocked_categories, blocked_domains,
        content_category
      ]);
      return true;
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        // Запись уже существует
        return false;
      }
      throw error;
    }
  }

  /**
   * Находит таргетинг по ID кампании
   * @param {number} campaignId - ID кампании
   * @returns {Promise<Object|null>} Данные таргетинга
   */
  static async findByCampaignId(campaignId) {
    const query = `SELECT * FROM campaign_targeting WHERE campaign_id = ?`;
    return await this.db.get(query, [campaignId]);
  }

/**
   * Обновляет таргетинг кампании
   * @param {number} campaignId - ID кампании
   * @param {Object} updates - Обновляемые поля
   * @returns {Promise<boolean>} Успешность операции
   */
  static async update(campaignId, updates) {
    const allowedFields = [
      'tags', 'primary_tag', 'target_interests',
      'target_audience', 'target_age_range', 'target_gender',
      'target_locations', 'excluded_locations', 'language_targeting',
      'device_targeting', 'os_targeting', 'browser_targeting',
      'behavioral_targeting', 'retargeting_enabled', 'retargeting_settings',
      'brand_safety_enabled', 'blocked_categories', 'blocked_domains',
      'content_category'
    ];

    const fieldsToUpdate = Object.keys(updates)
      .filter(key => allowedFields.includes(key));

    if (fieldsToUpdate.length === 0) {
      return false;
    }

    const setClause = fieldsToUpdate.map(field => `${field} = ?`).join(', ');
    const values = fieldsToUpdate.map(field => updates[field]);
    values.push(campaignId);

    const query = `UPDATE campaign_targeting SET ${setClause} WHERE campaign_id = ?`;
    const result = await this.db.run(query, values);

    return result.changes > 0;
  }

  /**
   * Обновляет теги кампании
   * @param {number} campaignId - ID кампании
   * @param {Array} tags - Массив тегов
   * @param {string} primaryTag - Основной тег
   * @returns {Promise<boolean>} Успешность операции
   */
  static async updateTags(campaignId, tags, primaryTag = null) {
    const query = `
      UPDATE campaign_targeting 
      SET tags = ?, primary_tag = ?
      WHERE campaign_id = ?
    `;
    
    const result = await this.db.run(query, [
      JSON.stringify(tags),
      primaryTag,
      campaignId
    ]);

    return result.changes > 0;
  }

  /**
   * Находит кампании по тегам
   * @param {Array} tags - Массив тегов для поиска
   * @param {Object} options - Опции поиска
   * @returns {Promise<Array>} Массив ID кампаний
   */
  static async findByTags(tags, options = {}) {
    const { matchAll = false, limit = 100 } = options;

    if (!tags || tags.length === 0) {
      return [];
    }

    let conditions = [];
    let params = [];

    if (matchAll) {
      // Все теги должны присутствовать
      tags.forEach(tag => {
        conditions.push(`json_extract(tags, '$') LIKE ?`);
        params.push(`%"${tag}"%`);
      });
    } else {
      // Хотя бы один тег
      const orConditions = tags.map(() => `json_extract(tags, '$') LIKE ?`);
      conditions.push(`(${orConditions.join(' OR ')})`);
      tags.forEach(tag => params.push(`%"${tag}"%`));
    }

    const query = `
      SELECT campaign_id 
      FROM campaign_targeting
      WHERE ${conditions.join(' AND ')}
      LIMIT ?
    `;
    
    params.push(limit);

    const results = await this.db.all(query, params);
    return results.map(row => row.campaign_id);
  }

  /**
   * Находит кампании по геолокации
   * @param {string} location - Локация
   * @returns {Promise<Array>} Массив ID кампаний
   */
  static async findByLocation(location) {
    const query = `
      SELECT campaign_id
      FROM campaign_targeting
      WHERE json_extract(target_locations, '$') LIKE ?
        AND json_extract(excluded_locations, '$') NOT LIKE ?
    `;

    const results = await this.db.all(query, [
      `%"${location}"%`,
      `%"${location}"%`
    ]);

    return results.map(row => row.campaign_id);
  }

  /**
   * Находит кампании по демографии
   * @param {Object} demographics - Параметры демографии
   * @returns {Promise<Array>} Массив ID кампаний
   */
  static async findByDemographics(demographics) {
    const { age, gender } = demographics;
    let conditions = ['1=1'];
    let params = [];

    if (age) {
      conditions.push(`
        (json_extract(target_age_range, '$.min') IS NULL OR json_extract(target_age_range, '$.min') <= ?)
        AND (json_extract(target_age_range, '$.max') IS NULL OR json_extract(target_age_range, '$.max') >= ?)
      `);
      params.push(age, age);
    }

    if (gender) {
      conditions.push(`(target_gender = 'all' OR target_gender = ?)`);
      params.push(gender);
    }

    const query = `
      SELECT campaign_id
      FROM campaign_targeting
      WHERE ${conditions.join(' AND ')}
    `;

    const results = await this.db.all(query, params);
    return results.map(row => row.campaign_id);
  }
}

module.exports = CampaignTargetingModel;