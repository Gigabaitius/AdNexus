/**
 * *project*\backend/models/campaign/campaignPerformanceModel.js
 * Модель для работы с таблицей campaign_performance
 */

const BaseModel = require('../BaseModel');

class CampaignPerformanceModel extends BaseModel {
  static tableName = 'campaign_performance';

  /**
   * Создает запись производительности для кампании
   * @param {number} campaignId - ID кампании
   * @param {Object} performanceData - Начальные данные
   * @returns {Promise<boolean>} Успешность операции
   */
  static async create(campaignId, performanceData = {}) {
    const {
      conversion_tracking_enabled = false,
      conversion_goal = null,
      conversion_value = null,
      performance_metrics = '{}'
    } = performanceData;

    const query = `
      INSERT INTO campaign_performance (
        campaign_id, conversion_tracking_enabled,
        conversion_goal, conversion_value,
        performance_metrics
      ) VALUES (?, ?, ?, ?, ?)
    `;

    try {
      await this.db.run(query, [
        campaignId, conversion_tracking_enabled,
        conversion_goal, conversion_value,
        performance_metrics
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
   * Находит метрики по ID кампании
   * @param {number} campaignId - ID кампании
   * @returns {Promise<Object|null>} Данные производительности
   */
  static async findByCampaignId(campaignId) {
    const query = `SELECT * FROM campaign_performance WHERE campaign_id = ?`;
    return await this.db.get(query, [campaignId]);
  }

  /**
   * Обновляет метрики кампании
   * @param {number} campaignId - ID кампании
   * @param {Object} metrics - Новые метрики
   * @returns {Promise<boolean>} Успешность операции
   */
  static async updateMetrics(campaignId, metrics) {
    const {
      impressions = 0,
      clicks = 0,
      conversions = 0,
      spent = 0
    } = metrics;

    const query = `
      UPDATE campaign_performance
      SET impressions_total = impressions_total + ?,
          clicks_total = clicks_total + ?,
          conversions_total = conversions_total + ?,
          cost_per_click = CASE 
            WHEN clicks_total + ? > 0 
            THEN ROUND((
              SELECT budget_spent FROM campaigns WHERE id = ?
            ) / (clicks_total + ?), 4)
            ELSE 0
          END,
          cost_per_conversion = CASE
            WHEN conversions_total + ? > 0
            THEN ROUND((
              SELECT budget_spent FROM campaigns WHERE id = ?
            ) / (conversions_total + ?), 2)
            ELSE 0
          END,
          last_updated = CURRENT_TIMESTAMP
      WHERE campaign_id = ?
    `;

    const result = await this.db.run(query, [
      impressions, clicks, conversions,
      clicks, campaignId, clicks,
      conversions, campaignId, conversions,
      campaignId
    ]);

    // Обновляем потраченный бюджет в основной таблице
    if (spent > 0) {
      await this.db.run(
        `UPDATE campaigns SET budget_spent = budget_spent + ? WHERE id = ?`,
        [spent, campaignId]
      );
    }

    return result.changes > 0;
  }

  /**
   * Добавляет запись в историю метрик
   * @param {number} campaignId - ID кампании
   * @param {Object} dailyMetrics - Метрики за день
   * @returns {Promise<boolean>} Успешность операции
   */
  static async addToHistory(campaignId, dailyMetrics) {
    const current = await this.findByCampaignId(campaignId);
    if (!current) return false;

    const history = JSON.parse(current.metrics_history || '[]');
    history.push({
      date: new Date().toISOString().split('T')[0],
      ...dailyMetrics
    });

// Храним только последние 90 дней
    if (history.length > 90) {
      history.shift();
    }

    const query = `
      UPDATE campaign_performance
      SET metrics_history = ?
      WHERE campaign_id = ?
    `;

    const result = await this.db.run(query, [JSON.stringify(history), campaignId]);
    return result.changes > 0;
  }

  /**
   * Обновляет количество связанных площадок
   * @param {number} campaignId - ID кампании
   * @returns {Promise<boolean>} Успешность операции
   */
  static async updatePlatformCounts(campaignId) {
    const query = `
      UPDATE campaign_performance
      SET total_platforms_count = (
            SELECT COUNT(*) FROM campaign_platforms WHERE campaign_id = ?
          ),
          active_platforms_count = (
            SELECT COUNT(*) FROM campaign_platforms 
            WHERE campaign_id = ? AND status = 'active'
          ),
          pending_platforms_count = (
            SELECT COUNT(*) FROM campaign_platforms 
            WHERE campaign_id = ? AND status = 'pending'
          )
      WHERE campaign_id = ?
    `;

    const result = await this.db.run(query, [
      campaignId, campaignId, campaignId, campaignId
    ]);

    return result.changes > 0;
  }

  /**
   * Находит топ-кампании по метрике
   * @param {string} metric - Метрика (ctr, conversions, roi)
   * @param {Object} options - Опции
   * @returns {Promise<Array>} Массив кампаний
   */
  static async findTopPerformers(metric, options = {}) {
    const { limit = 10, minImpressions = 1000 } = options;

    let orderBy;
    switch (metric) {
      case 'ctr':
        orderBy = 'CAST(clicks_total AS REAL) / NULLIF(impressions_total, 0) DESC';
        break;
      case 'conversions':
        orderBy = 'conversions_total DESC';
        break;
      case 'roi':
        orderBy = 'revenue_generated - (SELECT budget_spent FROM campaigns WHERE id = cp.campaign_id) DESC';
        break;
      default:
        orderBy = 'impressions_total DESC';
    }

    const query = `
      SELECT cp.*, c.title, c.user_id
      FROM campaign_performance cp
      JOIN campaigns c ON cp.campaign_id = c.id
      WHERE cp.impressions_total >= ?
        AND c.status = 'active'
        AND c.deleted_at IS NULL
      ORDER BY ${orderBy}
      LIMIT ?
    `;

    return await this.db.all(query, [minImpressions, limit]);
  }

  /**
   * Рассчитывает средние метрики по всем активным кампаниям
   * @returns {Promise<Object>} Средние показатели
   */
  static async calculateAverageMetrics() {
    const query = `
      SELECT 
        AVG(CAST(clicks_total AS REAL) / NULLIF(impressions_total, 0)) * 100 as avg_ctr,
        AVG(CAST(conversions_total AS REAL) / NULLIF(clicks_total, 0)) * 100 as avg_conversion_rate,
        AVG(cost_per_click) as avg_cpc,
        AVG(cost_per_conversion) as avg_cpa
      FROM campaign_performance cp
      JOIN campaigns c ON cp.campaign_id = c.id
      WHERE c.status = 'active'
        AND c.deleted_at IS NULL
        AND cp.impressions_total > 1000
    `;

    return await this.db.get(query);
  }
}

module.exports = CampaignPerformanceModel;