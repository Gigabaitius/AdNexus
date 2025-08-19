/**
 * *project*\backend/services/campaign/performanceService.js
 * Сервис для работы с метриками производительности кампаний
 */

const CampaignPerformanceModel = require('../../models/campaign/campaignPerformanceModel');
const { BusinessError } = require('../../utils/errors');

class PerformanceService {
  /**
   * Обновляет метрики кампании
   * @param {number} campaignId - ID кампании
   * @param {Object} metrics - Новые метрики
   * @returns {Promise<Object>} Обновленные метрики
   */
  static async updateMetrics(campaignId, metrics) {
    const success = await CampaignPerformanceModel.updateMetrics(campaignId, metrics);
    
    if (!success) {
      throw new BusinessError('Failed to update campaign metrics');
    }

    // Добавляем в историю
    await this.addDailyMetrics(campaignId, metrics);

    return await CampaignPerformanceModel.findByCampaignId(campaignId);
  }

  /**
   * Добавляет дневные метрики в историю
   * @param {number} campaignId - ID кампании
   * @param {Object} metrics - Метрики за день
   * @returns {Promise<boolean>} Успешность операции
   */
  static async addDailyMetrics(campaignId, metrics) {
    const dailyData = {
      ...metrics,
      date: new Date().toISOString().split('T')[0]
    };

    return await CampaignPerformanceModel.addToHistory(campaignId, dailyData);
  }

  /**
   * Получает детальную аналитику кампании
   * @param {number} campaignId - ID кампании
   * @param {Object} options - Опции
   * @returns {Promise<Object>} Аналитика
   */
  static async getDetailedAnalytics(campaignId, options = {}) {
    const { period = 7 } = options; // По умолчанию за 7 дней

    const performance = await CampaignPerformanceModel.findByCampaignId(campaignId);
    
    if (!performance) {
      throw new BusinessError('Campaign performance data not found');
    }

    // Парсим историю метрик
    const history = JSON.parse(performance.metrics_history || '[]');
    const recentHistory = history.slice(-period);

    // Рассчитываем тренды
    const trends = this.calculateTrends(recentHistory);

    // Рассчитываем KPI
    const kpi = {
      ctr: performance.clicks_total > 0 
        ? (performance.clicks_total / performance.impressions_total * 100).toFixed(2) 
        : 0,
      conversion_rate: performance.conversions_total > 0
        ? (performance.conversions_total / performance.clicks_total * 100).toFixed(2)
        : 0,
      cpc: performance.cost_per_click || 0,
      cpa: performance.cost_per_conversion || 0,
      roi: performance.revenue_generated > 0
        ? ((performance.revenue_generated - performance.cost_per_click * performance.clicks_total) / 
           (performance.cost_per_click * performance.clicks_total) * 100).toFixed(2)
        : 0
    };

    return {
      current: {
        impressions: performance.impressions_total,
clicks: performance.clicks_total,
        conversions: performance.conversions_total,
        platforms: performance.active_platforms_count
      },
      kpi,
      trends,
      history: recentHistory,
      best_performing: {
        creative: performance.best_performing_creative,
        platform: performance.best_performing_platform
      }
    };
  }

  /**
   * Рассчитывает тренды на основе истории
   * @param {Array} history - История метрик
   * @returns {Object} Тренды
   */
  static calculateTrends(history) {
    if (history.length < 2) {
      return {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        ctr: 0
      };
    }

    const recent = history[history.length - 1];
    const previous = history[history.length - 2];

    const calculateChange = (current, prev) => {
      if (prev === 0) return current > 0 ? 100 : 0;
      return ((current - prev) / prev * 100).toFixed(2);
    };

    return {
      impressions: calculateChange(recent.impressions || 0, previous.impressions || 0),
      clicks: calculateChange(recent.clicks || 0, previous.clicks || 0),
      conversions: calculateChange(recent.conversions || 0, previous.conversions || 0),
      ctr: calculateChange(
        (recent.clicks / recent.impressions) || 0,
        (previous.clicks / previous.impressions) || 0
      )
    };
  }

  /**
   * Сравнивает производительность с другими кампаниями
   * @param {number} campaignId - ID кампании
   * @returns {Promise<Object>} Сравнительная аналитика
   */
  static async getBenchmarks(campaignId) {
    const performance = await CampaignPerformanceModel.findByCampaignId(campaignId);
    
    if (!performance) {
      throw new BusinessError('Campaign performance data not found');
    }

    // Получаем средние показатели
    const averages = await CampaignPerformanceModel.calculateAverageMetrics();

    const campaignCtr = performance.clicks_total / performance.impressions_total * 100;
    const campaignCvr = performance.conversions_total / performance.clicks_total * 100;

    return {
      ctr: {
        campaign: campaignCtr.toFixed(2),
        average: averages.avg_ctr ? averages.avg_ctr.toFixed(2) : 0,
        difference: (campaignCtr - (averages.avg_ctr || 0)).toFixed(2),
        performance: campaignCtr > (averages.avg_ctr || 0) ? 'above' : 'below'
      },
      conversion_rate: {
        campaign: campaignCvr.toFixed(2),
        average: averages.avg_conversion_rate ? averages.avg_conversion_rate.toFixed(2) : 0,
        difference: (campaignCvr - (averages.avg_conversion_rate || 0)).toFixed(2),
        performance: campaignCvr > (averages.avg_conversion_rate || 0) ? 'above' : 'below'
      },
      cpc: {
        campaign: performance.cost_per_click || 0,
        average: averages.avg_cpc || 0,
        difference: (performance.cost_per_click - (averages.avg_cpc || 0)).toFixed(4),
        performance: performance.cost_per_click < (averages.avg_cpc || 0) ? 'better' : 'worse'
      },
      cpa: {
        campaign: performance.cost_per_conversion || 0,
        average: averages.avg_cpa || 0,
        difference: (performance.cost_per_conversion - (averages.avg_cpa || 0)).toFixed(2),
        performance: performance.cost_per_conversion < (averages.avg_cpa || 0) ? 'better' : 'worse'
      }
    };
  }

  /**
   * Генерирует рекомендации по улучшению производительности
   * @param {number} campaignId - ID кампании
   * @returns {Promise<Array>} Массив рекомендаций
   */
  static async getPerformanceRecommendations(campaignId) {
    const performance = await CampaignPerformanceModel.findByCampaignId(campaignId);
    const benchmarks = await this.getBenchmarks(campaignId);
    
    const recommendations = [];

    // Рекомендации по CTR
    if (benchmarks.ctr.performance === 'below') {
      recommendations.push({
        type: 'improve_ctr',
        priority: 'high',
        title: 'Improve Click-Through Rate',
        description: `Your CTR is ${Math.abs(benchmarks.ctr.difference)}% below average`,
        actions: [
          'Review and update ad creatives',
          'Refine targeting to reach more relevant audience',
          'Test different ad formats',
          'Improve ad copy and call-to-action'
        ]
      });
    }

    // Рекомендации по конверсиям
    if (benchmarks.conversion_rate.performance === 'below' && performance.clicks_total > 100) {
      recommendations.push({
        type: 'improve_conversions',
        priority: 'high',
        title: 'Increase Conversion Rate',
        description: `Your conversion rate is ${Math.abs(benchmarks.conversion_rate.difference)}% below average`,
        actions: [
          'Optimize landing page experience',
          'Ensure message match between ads and landing pages',
          'Simplify conversion process',
          'Add trust signals and social proof'
        ]
      });
    }

    // Рекомендации по стоимости
    if (benchmarks.cpc.performance === 'worse' && performance.cost_per_click > benchmarks.cpc.average * 1.2) {
      recommendations.push({
        type: 'reduce_costs',
        priority: 'medium',
        title: 'Optimize Cost Efficiency',
        description: `Your CPC is ${((performance.cost_per_click / benchmarks.cpc.average - 1) * 100).toFixed(0)}% higher than average`,
        actions: [
          'Review bid strategy and adjust bids',
          'Improve quality score with better targeting',
          'Exclude underperforming placements',
          'Focus budget on best-performing segments'
        ]
      });
    }

    // Рекомендации по масштабированию
    if (benchmarks.ctr.performance === 'above' && benchmarks.conversion_rate.performance === 'above') {
      recommendations.push({
        type: 'scale_campaign',
        priority: 'medium',
        title: 'Scale Successful Campaign',
        description: 'Your campaign is performing above average',
        actions: [
          'Increase budget to capture more conversions',
          'Expand to similar audiences',
          'Test new platforms while maintaining current ones',
          'Create similar campaigns for other products/services'
        ]
      });
    }

    // Рекомендации по площадкам
    if (performance.active_platforms_count < 3) {
      recommendations.push({
        type: 'expand_platforms',
        priority: 'low',
        title: 'Diversify Platform Mix',
        description: `You're currently using only ${performance.active_platforms_count} platforms`,
        actions: [
          'Test additional platforms to find new opportunities',
          'Compare performance across different platform types',
          'Allocate budget based on platform performance'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Экспортирует данные производительности
   * @param {number} campaignId - ID кампании
   * @param {string} format - Формат экспорта (json, csv)
   * @param {Object} options - Опции экспорта
   * @returns {Promise<Object>} Данные для экспорта
   */
  static async exportPerformanceData(campaignId, format = 'json', options = {}) {
    const { includeHistory = true, period = 30 } = options;

    const performance = await CampaignPerformanceModel.findByCampaignId(campaignId);
    
    if (!performance) {
      throw new BusinessError('Campaign performance data not found');
    }

    const data = {
      campaign_id: campaignId,
      export_date: new Date().toISOString(),
      summary: {
        impressions: performance.impressions_total,
        clicks: performance.clicks_total,
        conversions: performance.conversions_total,
        ctr: (performance.clicks_total / performance.impressions_total * 100).toFixed(2),
        conversion_rate: (performance.conversions_total / performance.clicks_total * 100).toFixed(2),
        cost_per_click: performance.cost_per_click,
        cost_per_conversion: performance.cost_per_conversion,
        platforms_active: performance.active_platforms_count
      }
    };

    if (includeHistory) {
      const history = JSON.parse(performance.metrics_history || '[]');
      data.history = history.slice(-period);
    }

    if (format === 'csv') {
      // Преобразуем в CSV формат
      return this.convertToCSV(data);
    }

    return data;
  }

  /**
   * Преобразует данные в CSV формат
   * @param {Object} data - Данные для преобразования
   * @returns {string} CSV строка
   */
  static convertToCSV(data) {
    const headers = ['Date', 'Impressions', 'Clicks', 'Conversions', 'CTR', 'CVR', 'CPC', 'CPA'];
    const rows = [headers.join(',')];

    if (data.history) {
      data.history.forEach(day => {
        const row = [
          day.date,
          day.impressions || 0,
          day.clicks || 0,
          day.conversions || 0,
          ((day.clicks / day.impressions) * 100).toFixed(2) || 0,
          ((day.conversions / day.clicks) * 100).toFixed(2) || 0,
          day.cost_per_click || 0,
          day.cost_per_conversion || 0
        ];
        rows.push(row.join(','));
      });
    }

    return rows.join('\n');
  }

  /**
   * Проверяет аномалии в производительности
   * @param {number} campaignId - ID кампании
   * @returns {Promise<Array>} Обнаруженные аномалии
   */
  static async detectAnomalies(campaignId) {
    const performance = await CampaignPerformanceModel.findByCampaignId(campaignId);
    
    if (!performance) {
      throw new BusinessError('Campaign performance data not found');
    }

    const history = JSON.parse(performance.metrics_history || '[]');
    const anomalies = [];

    if (history.length < 7) {
      return anomalies; // Недостаточно данных для анализа
    }

    // Анализируем последние 7 дней
    const recentDays = history.slice(-7);
    
    // Рассчитываем средние показатели
    const avgImpressions = recentDays.reduce((sum, day) => sum + (day.impressions || 0), 0) / 7;
    const avgClicks = recentDays.reduce((sum, day) => sum + (day.clicks || 0), 0) / 7;
    const avgCtr = avgClicks / avgImpressions * 100;

    // Проверяем последний день на аномалии
    const lastDay = recentDays[recentDays.length - 1];
    
    // Резкое падение показов
    if (lastDay.impressions < avgImpressions * 0.5) {
      anomalies.push({
        type: 'impressions_drop',
        severity: 'high',
        message: `Impressions dropped by ${Math.round((1 - lastDay.impressions / avgImpressions) * 100)}%`,
        value: lastDay.impressions,
        average: Math.round(avgImpressions),
        date: lastDay.date
      });
    }

    // Аномальный CTR
    const lastDayCtr = lastDay.clicks / lastDay.impressions * 100;
    if (lastDayCtr < avgCtr * 0.5 || lastDayCtr > avgCtr * 2) {
      anomalies.push({
        type: lastDayCtr < avgCtr ? 'ctr_drop' : 'ctr_spike',
        severity: 'medium',
        message: `CTR ${lastDayCtr < avgCtr ? 'dropped' : 'spiked'} significantly`,
        value: lastDayCtr.toFixed(2),
        average: avgCtr.toFixed(2),
        date: lastDay.date
      });
    }

    // Нулевые конверсии при наличии кликов
    if (lastDay.clicks > 50 && lastDay.conversions === 0) {
      anomalies.push({
        type: 'zero_conversions',
        severity: 'high',
        message: 'No conversions despite significant clicks',
        clicks: lastDay.clicks,
        date: lastDay.date
      });
    }

    return anomalies;
  }
}

module.exports = PerformanceService;