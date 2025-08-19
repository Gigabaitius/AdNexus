/**
 * *project*\backend/models/campaign/campaignOptimizationModel.js
 * Модель для работы с таблицей campaign_optimization
 */

const BaseModel = require('../BaseModel');

class CampaignOptimizationModel extends BaseModel {
  static tableName = 'campaign_optimization';

  /**
   * Создает запись оптимизации для кампании
   * @param {number} campaignId - ID кампании
   * @param {Object} optimizationData - Данные оптимизации
   * @returns {Promise<boolean>} Успешность операции
   */
  static async create(campaignId, optimizationData = {}) {
    const {
      auto_optimization_enabled = false,
      optimization_goal = null,
      bid_strategy = 'manual',
      bid_amount = null,
      optimization_rules = '[]',
      ai_recommendations = '[]'
    } = optimizationData;

    const query = `
      INSERT INTO campaign_optimization (
        campaign_id, auto_optimization_enabled, optimization_goal,
        bid_strategy, bid_amount, optimization_rules,
        ai_recommendations
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      await this.db.run(query, [
        campaignId, auto_optimization_enabled, optimization_goal,
        bid_strategy, bid_amount, optimization_rules,
        ai_recommendations
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
   * Находит настройки оптимизации по ID кампании
   * @param {number} campaignId - ID кампании
   * @returns {Promise<Object|null>} Данные оптимизации
   */
  static async findByCampaignId(campaignId) {
    const query = `SELECT * FROM campaign_optimization WHERE campaign_id = ?`;
    return await this.db.get(query, [campaignId]);
  }

  /**
   * Обновляет настройки оптимизации
   * @param {number} campaignId - ID кампании
   * @param {Object} updates - Обновляемые поля
   * @returns {Promise<boolean>} Успешность операции
   */
  static async update(campaignId, updates) {
    const allowedFields = [
      'auto_optimization_enabled', 'optimization_goal',
      'bid_strategy', 'bid_amount',
      'target_cpa', 'target_roas',
      'optimization_rules', 'ml_optimization_enabled',
      'ml_model_version', 'ai_recommendations'
    ];

    const fieldsToUpdate = Object.keys(updates)
      .filter(key => allowedFields.includes(key));

    if (fieldsToUpdate.length === 0) {
      return false;
    }

    const setClause = fieldsToUpdate.map(field => `${field} = ?`).join(', ');
    const values = fieldsToUpdate.map(field => updates[field]);
    values.push(campaignId);

    const query = `UPDATE campaign_optimization SET ${setClause} WHERE campaign_id = ?`;
    const result = await this.db.run(query, values);

    return result.changes > 0;
  }

  /**
   * Добавляет запись в историю оптимизаций
   * @param {number} campaignId - ID кампании
   * @param {Object} optimization - Данные оптимизации
   * @returns {Promise<boolean>} Успешность операции
   */
  static async addToHistory(campaignId, optimization) {
    const current = await this.findByCampaignId(campaignId);
    if (!current) return false;

    const history = JSON.parse(current.optimization_history || '[]');
    history.push({
      timestamp: new Date().toISOString(),
      ...optimization
    });

    // Храним только последние 50 записей
    if (history.length > 50) {
      history.shift();
    }

    const query = `
      UPDATE campaign_optimization
      SET optimization_history = ?,
          last_optimization_at = CURRENT_TIMESTAMP
      WHERE campaign_id = ?
    `;

    const result = await this.db.run(query, [JSON.stringify(history), campaignId]);
    return result.changes > 0;
  }

/**
   * Добавляет AI рекомендацию
   * @param {number} campaignId - ID кампании
   * @param {Object} recommendation - Рекомендация
   * @returns {Promise<boolean>} Успешность операции
   */
  static async addRecommendation(campaignId, recommendation) {
    const current = await this.findByCampaignId(campaignId);
    if (!current) return false;

    const recommendations = JSON.parse(current.ai_recommendations || '[]');
    recommendations.push({
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      status: 'pending',
      ...recommendation
    });

    // Храним только последние 20 рекомендаций
    if (recommendations.length > 20) {
      recommendations.shift();
    }

    const query = `
      UPDATE campaign_optimization
      SET ai_recommendations = ?
      WHERE campaign_id = ?
    `;

    const result = await this.db.run(query, [JSON.stringify(recommendations), campaignId]);
    return result.changes > 0;
  }

  /**
   * Отмечает рекомендацию как примененную
   * @param {number} campaignId - ID кампании
   * @param {string} recommendationId - ID рекомендации
   * @returns {Promise<boolean>} Успешность операции
   */
  static async applyRecommendation(campaignId, recommendationId) {
    const current = await this.findByCampaignId(campaignId);
    if (!current) return false;

    const recommendations = JSON.parse(current.ai_recommendations || '[]');
    const applied = JSON.parse(current.recommendations_applied || '[]');

    const recommendation = recommendations.find(r => r.id === recommendationId);
    if (!recommendation) return false;

    recommendation.status = 'applied';
    recommendation.applied_at = new Date().toISOString();
    applied.push(recommendation);

    const query = `
      UPDATE campaign_optimization
      SET ai_recommendations = ?,
          recommendations_applied = ?
      WHERE campaign_id = ?
    `;

    const result = await this.db.run(query, [
      JSON.stringify(recommendations),
      JSON.stringify(applied),
      campaignId
    ]);

    return result.changes > 0;
  }

  /**
   * Находит кампании для автоматической оптимизации
   * @returns {Promise<Array>} Массив кампаний
   */
  static async findForOptimization() {
    const query = `
      SELECT co.*, c.status, cp.impressions_total, cp.clicks_total
      FROM campaign_optimization co
      JOIN campaigns c ON co.campaign_id = c.id
      JOIN campaign_performance cp ON co.campaign_id = cp.campaign_id
      WHERE co.auto_optimization_enabled = 1
        AND c.status = 'active'
        AND c.deleted_at IS NULL
        AND cp.impressions_total > 1000
        AND (
          co.last_optimization_at IS NULL
          OR co.last_optimization_at < datetime('now', '-6 hours')
        )
    `;

    return await this.db.all(query);
  }

  /**
   * Находит кампании с низкой производительностью
   * @param {Object} thresholds - Пороговые значения
   * @returns {Promise<Array>} Массив кампаний
   */
  static async findUnderperforming(thresholds = {}) {
    const {
      minCtr = 0.5,
      minConversionRate = 1.0,
      minImpressions = 1000
    } = thresholds;

    const query = `
      SELECT 
        co.campaign_id,
        c.title,
        cp.impressions_total,
        cp.clicks_total,
        cp.conversions_total,
        CAST(cp.clicks_total AS REAL) / NULLIF(cp.impressions_total, 0) * 100 as ctr,
        CAST(cp.conversions_total AS REAL) / NULLIF(cp.clicks_total, 0) * 100 as conversion_rate
      FROM campaign_optimization co
      JOIN campaigns c ON co.campaign_id = c.id
      JOIN campaign_performance cp ON co.campaign_id = cp.campaign_id
      WHERE c.status = 'active'
        AND c.deleted_at IS NULL
        AND cp.impressions_total >= ?
        AND (
          CAST(cp.clicks_total AS REAL) / NULLIF(cp.impressions_total, 0) * 100 < ?
          OR CAST(cp.conversions_total AS REAL) / NULLIF(cp.clicks_total, 0) * 100 < ?
        )
    `;

    return await this.db.all(query, [minImpressions, minCtr, minConversionRate]);
  }
}

module.exports = CampaignOptimizationModel;