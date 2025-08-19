/**
 * *project*\backend/models/campaign/campaignCreativeModel.js
 * Модель для работы с таблицей campaign_creatives
 */

const BaseModel = require('../BaseModel');

class CampaignCreativeModel extends BaseModel {
  static tableName = 'campaign_creatives';

  /**
   * Создает запись креативов для кампании
   * @param {number} campaignId - ID кампании
   * @param {Object} creativeData - Данные креативов
   * @returns {Promise<boolean>} Успешность операции
   */
  static async create(campaignId, creativeData = {}) {
    const {
      creative_assets = '[]',
      creative_rotation = 'even',
      landing_url = null,
      utm_parameters = '{}',
      deep_links = '{}',
      ab_testing_enabled = false,
      ab_variants = '[]',
      ad_formats = '[]',
      video_settings = '{}'
    } = creativeData;

    const query = `
      INSERT INTO campaign_creatives (
        campaign_id, creative_assets, creative_rotation,
        landing_url, utm_parameters, deep_links,
        ab_testing_enabled, ab_variants,
        ad_formats, video_settings
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      await this.db.run(query, [
        campaignId, creative_assets, creative_rotation,
        landing_url, utm_parameters, deep_links,
        ab_testing_enabled, ab_variants,
        ad_formats, video_settings
      ]);
      return true;
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Находит креативы по ID кампании
   * @param {number} campaignId - ID кампании
   * @returns {Promise<Object|null>} Данные креативов
   */
  static async findByCampaignId(campaignId) {
    const query = `SELECT * FROM campaign_creatives WHERE campaign_id = ?`;
    return await this.db.get(query, [campaignId]);
  }

  /**
   * Обновляет креативы кампании
   * @param {number} campaignId - ID кампании
   * @param {Object} updates - Обновляемые поля
   * @returns {Promise<boolean>} Успешность операции
   */
  static async update(campaignId, updates) {
    const allowedFields = [
      'creative_assets', 'creative_rotation',
      'landing_url', 'utm_parameters', 'deep_links',
      'ab_testing_enabled', 'ab_variants',
      'ab_winner_variant', 'ab_confidence_level', 'ab_test_end_date',
      'ad_formats', 'video_settings'
    ];

    const fieldsToUpdate = Object.keys(updates)
      .filter(key => allowedFields.includes(key));

    if (fieldsToUpdate.length === 0) {
      return false;
    }

    const setClause = fieldsToUpdate.map(field => `${field} = ?`).join(', ');
    const values = fieldsToUpdate.map(field => updates[field]);
    values.push(campaignId);

    const query = `UPDATE campaign_creatives SET ${setClause} WHERE campaign_id = ?`;
    const result = await this.db.run(query, values);

    return result.changes > 0;
  }

  /**
   * Добавляет креатив к кампании
   * @param {number} campaignId - ID кампании
   * @param {Object} creative - Данные креатива
   * @returns {Promise<boolean>} Успешность операции
   */
  static async addCreative(campaignId, creative) {
    const current = await this.findByCampaignId(campaignId);
    if (!current) return false;

    const assets = JSON.parse(current.creative_assets);
    assets.push(creative);

    return await this.update(campaignId, {
      creative_assets: JSON.stringify(assets)
    });
  }

  /**
   * Устанавливает победителя A/B теста
   * @param {number} campaignId - ID кампании
   * @param {string} variantId - ID варианта-победителя
   * @param {number} confidence - Уровень доверия
   * @returns {Promise<boolean>} Успешность операции
   */
  static async setAbTestWinner(campaignId, variantId, confidence) {
    const query = `
      UPDATE campaign_creatives
      SET ab_winner_variant = ?,
          ab_confidence_level = ?,
          ab_test_end_date = date('now')
      WHERE campaign_id = ?
    `;

    const result = await this.db.run(query, [variantId, confidence, campaignId]);
    return result.changes > 0;
  }

  /**
   * Находит активные A/B тесты
   * @returns {Promise<Array>} Массив кампаний с активными тестами
   */
  static async findActiveAbTests() {
    const query = `
      SELECT campaign_id, ab_variants, ab_test_end_date
      FROM campaign_creatives
      WHERE ab_testing_enabled = 1
        AND ab_winner_variant IS NULL
        AND (ab_test_end_date IS NULL OR ab_test_end_date > date('now'))
    `;

    return await this.db.all(query);
  }
}

module.exports = CampaignCreativeModel;