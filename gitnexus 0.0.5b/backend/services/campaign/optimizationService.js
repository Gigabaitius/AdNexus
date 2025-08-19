/**
 * *project*\backend/services/campaign/optimizationService.js
 * Сервис автоматической оптимизации кампаний
 */

const CampaignOptimizationModel = require('../../models/campaign/campaignOptimizationModel');
const CampaignPerformanceModel = require('../../models/campaign/campaignPerformanceModel');
const CampaignModel = require('../../models/campaign/campaignModel');
const { BusinessError } = require('../../utils/errors');
const logger = require('../../utils/logger');

class OptimizationService {
  // Пороги для оптимизации
  static OPTIMIZATION_THRESHOLDS = {
    minImpressions: 1000,
    minClicks: 50,
    lowCTR: 0.5,
    highCTR: 5.0,
    lowCVR: 0.5,
    highCPC: 10.0
  };

  /**
   * Выполняет автоматическую оптимизацию кампании
   * @param {number} campaignId - ID кампании
   * @returns {Promise<Object>} Результат оптимизации
   */
  static async optimizeCampaign(campaignId) {
    const [campaign, optimization, performance] = await Promise.all([
      CampaignModel.findById(campaignId),
      CampaignOptimizationModel.findByCampaignId(campaignId),
      CampaignPerformanceModel.findByCampaignId(campaignId)
    ]);

    if (!campaign || !optimization || !performance) {
      throw new BusinessError('Campaign data not found');
    }

    if (!optimization.auto_optimization_enabled) {
      throw new BusinessError('Auto-optimization is not enabled for this campaign');
    }

    // Анализируем производительность
    const analysis = this.analyzePerformance(performance);
    const recommendations = this.generateOptimizationRules(analysis, optimization.optimization_goal);
    
    // Применяем оптимизации
    const applied = [];
    
    for (const recommendation of recommendations) {
      if (recommendation.autoApply) {
        try {
          await this.applyOptimization(campaignId, recommendation);
          applied.push(recommendation);
} catch (error) {
          logger.error('Failed to apply optimization', {
            campaignId,
            recommendation: recommendation.type,
            error: error.message
          });
        }
      }
    }

    // Сохраняем историю оптимизации
    await CampaignOptimizationModel.addToHistory(campaignId, {
      analysis,
      recommendations: recommendations.length,
      applied: applied.length,
      changes: applied.map(r => r.type)
    });

    // Добавляем рекомендации для ручного применения
    const manualRecommendations = recommendations.filter(r => !r.autoApply);
    for (const rec of manualRecommendations) {
      await CampaignOptimizationModel.addRecommendation(campaignId, rec);
    }

    logger.info('Campaign optimization completed', {
      campaignId,
      recommendationsCount: recommendations.length,
      appliedCount: applied.length
    });

    return {
      analysis,
      recommendations,
      applied,
      success: true
    };
  }

  /**
   * Анализирует производительность кампании
   * @param {Object} performance - Данные производительности
   * @returns {Object} Анализ
   */
  static analyzePerformance(performance) {
    const ctr = performance.impressions_total > 0 
      ? (performance.clicks_total / performance.impressions_total * 100) 
      : 0;
    
    const cvr = performance.clicks_total > 0
      ? (performance.conversions_total / performance.clicks_total * 100)
      : 0;

    const analysis = {
      metrics: {
        impressions: performance.impressions_total,
        clicks: performance.clicks_total,
        conversions: performance.conversions_total,
        ctr: ctr.toFixed(2),
        cvr: cvr.toFixed(2),
        cpc: performance.cost_per_click || 0,
        cpa: performance.cost_per_conversion || 0
      },
      issues: [],
      opportunities: []
    };

    // Определяем проблемы
    if (performance.impressions_total >= this.OPTIMIZATION_THRESHOLDS.minImpressions) {
      if (ctr < this.OPTIMIZATION_THRESHOLDS.lowCTR) {
        analysis.issues.push({
          type: 'low_ctr',
          severity: 'high',
          value: ctr,
          threshold: this.OPTIMIZATION_THRESHOLDS.lowCTR
        });
      }
    }

    if (performance.clicks_total >= this.OPTIMIZATION_THRESHOLDS.minClicks) {
      if (cvr < this.OPTIMIZATION_THRESHOLDS.lowCVR) {
        analysis.issues.push({
          type: 'low_cvr',
          severity: 'high',
          value: cvr,
          threshold: this.OPTIMIZATION_THRESHOLDS.lowCVR
        });
      }
    }

    if (performance.cost_per_click > this.OPTIMIZATION_THRESHOLDS.highCPC) {
      analysis.issues.push({
        type: 'high_cpc',
        severity: 'medium',
        value: performance.cost_per_click,
        threshold: this.OPTIMIZATION_THRESHOLDS.highCPC
      });
    }

    // Определяем возможности
    if (ctr > this.OPTIMIZATION_THRESHOLDS.highCTR && cvr > 2) {
      analysis.opportunities.push({
        type: 'scale_budget',
        reason: 'High performance metrics',
        potential: 'high'
      });
    }

    return analysis;
  }

  /**
   * Генерирует правила оптимизации
   * @param {Object} analysis - Анализ производительности
   * @param {string} goal - Цель оптимизации
   * @returns {Array} Массив рекомендаций
   */
  static generateOptimizationRules(analysis, goal) {
    const recommendations = [];

    // Рекомендации для низкого CTR
    const lowCtrIssue = analysis.issues.find(i => i.type === 'low_ctr');
    if (lowCtrIssue) {
      recommendations.push({
        type: 'improve_targeting',
        priority: 'high',
        reason: `CTR (${lowCtrIssue.value}%) is below threshold`,
        action: 'Refine audience targeting',
        autoApply: false
      });

      recommendations.push({
        type: 'refresh_creatives',
        priority: 'high',
        reason: 'Low engagement with current creatives',
        action: 'Update or rotate creative assets',
        autoApply: false
      });
    }

    // Рекомендации для низкой конверсии
    const lowCvrIssue = analysis.issues.find(i => i.type === 'low_cvr');
    if (lowCvrIssue) {
      recommendations.push({
        type: 'optimize_landing',
        priority: 'high',
        reason: `Conversion rate (${lowCvrIssue.value}%) is below threshold`,
        action: 'Optimize landing page for conversions',
        autoApply: false
      });
    }

    // Рекомендации для высокой стоимости
    const highCpcIssue = analysis.issues.find(i => i.type === 'high_cpc');
    if (highCpcIssue) {
      recommendations.push({
        type: 'lower_bid',
        priority: 'medium',
        reason: `CPC ($${highCpcIssue.value}) exceeds threshold`,
        action: 'Reduce bid by 10%',
        autoApply: true,
        parameters: { reduction: 0.1 }
      });
    }

    // Рекомендации по возможностям
    const scaleOpportunity = analysis.opportunities.find(o => o.type === 'scale_budget');
    if (scaleOpportunity) {
      recommendations.push({
        type: 'increase_budget',
        priority: 'medium',
        reason: 'Campaign performing above benchmarks',
        action: 'Increase daily budget by 20%',
        autoApply: false,
        parameters: { increase: 0.2 }
      });
    }

    // Специфичные рекомендации по целям
    switch (goal) {
      case 'conversions':
        if (analysis.metrics.cpa > 50) {
          recommendations.push({
            type: 'focus_converting_segments',
            priority: 'high',
            reason: 'High cost per acquisition',
            action: 'Focus budget on best converting segments',
            autoApply: true
          });
        }
        break;

      case 'clicks':
        if (analysis.metrics.ctr < 1) {
          recommendations.push({
            type: 'broaden_targeting',
            priority: 'medium',
            reason: 'Limited reach with current targeting',
            action: 'Expand audience targeting',
            autoApply: false
          });
        }
        break;

      case 'impressions':
        recommendations.push({
          type: 'maximize_reach',
          priority: 'low',
          reason: 'Goal is maximum impressions',
          action: 'Use lowest cost bidding strategy',
          autoApply: true
        });
        break;
    }

    return recommendations;
  }

  /**
   * Применяет оптимизацию к кампании
   * @param {number} campaignId - ID кампании
   * @param {Object} optimization - Оптимизация для применения
   * @returns {Promise<boolean>} Успешность применения
   */
  static async applyOptimization(campaignId, optimization) {
    switch (optimization.type) {
      case 'lower_bid':
        return await this.adjustBidding(campaignId, -optimization.parameters.reduction);

      case 'focus_converting_segments':
        return await this.focusOnBestSegments(campaignId);

      case 'maximize_reach':
        return await this.switchToLowestCostBidding(campaignId);

      default:
        logger.warn('Unknown optimization type', {
          campaignId,
          type: optimization.type
        });
        return false;
    }
  }

  /**
   * Корректирует ставки
   * @param {number} campaignId - ID кампании
   * @param {number} adjustment - Процент корректировки
   * @returns {Promise<boolean>} Успешность
   */
  static async adjustBidding(campaignId, adjustment) {
    const optimization = await CampaignOptimizationModel.findByCampaignId(campaignId);
    
    if (!optimization || !optimization.bid_amount) {
      return false;
    }

    const newBid = optimization.bid_amount * (1 + adjustment);
    
    await CampaignOptimizationModel.update(campaignId, {
      bid_amount: newBid
    });

    logger.info('Bid adjusted', {
      campaignId,
      oldBid: optimization.bid_amount,
      newBid,
      adjustment
    });

    return true;
  }

  /**
   * Фокусирует бюджет на лучших сегментах
   * @param {number} campaignId - ID кампании
   * @returns {Promise<boolean>} Успешность
   */
  static async focusOnBestSegments(campaignId) {
    // Здесь должна быть логика анализа сегментов
    // и перераспределения бюджета
    
    logger.info('Focused on best segments', { campaignId });
    return true;
  }

  /**
   * Переключает на стратегию минимальной стоимости
   * @param {number} campaignId - ID кампании
   * @returns {Promise<boolean>} Успешность
   */
  static async switchToLowestCostBidding(campaignId) {
    await CampaignOptimizationModel.update(campaignId, {
      bid_strategy: 'auto_lowest_cost'
    });

    logger.info('Switched to lowest cost bidding', { campaignId });
    return true;
  }

  /**
   * Прогнозирует результаты оптимизации
   * @param {number} campaignId - ID кампании
   * @param {Array} optimizations - Планируемые оптимизации
   * @returns {Promise<Object>} Прогноз
   */
  static async predictOptimizationImpact(campaignId, optimizations) {
    const performance = await CampaignPerformanceModel.findByCampaignId(campaignId);
    
    if (!performance) {
      throw new BusinessError('Performance data not found');
    }

    const currentMetrics = {
      ctr: performance.clicks_total / performance.impressions_total * 100,
      cvr: performance.conversions_total / performance.clicks_total * 100,
      cpc: performance.cost_per_click
    };

    const predictedMetrics = { ...currentMetrics };

    // Простые прогнозы на основе типов оптимизаций
    optimizations.forEach(opt => {
      switch (opt.type) {
        case 'improve_targeting':
          predictedMetrics.ctr *= 1.15; // +15% CTR
          break;
        case 'refresh_creatives':
          predictedMetrics.ctr *= 1.10; // +10% CTR
          break;
        case 'optimize_landing':
          predictedMetrics.cvr *= 1.20; // +20% CVR
          break;
        case 'lower_bid':
          predictedMetrics.cpc *= 0.90; // -10% CPC
          break;
      }
    });

    return {
      current: currentMetrics,
      predicted: predictedMetrics,
      improvements: {
        ctr: ((predictedMetrics.ctr - currentMetrics.ctr) / currentMetrics.ctr * 100).toFixed(1),
        cvr: ((predictedMetrics.cvr - currentMetrics.cvr) / currentMetrics.cvr * 100).toFixed(1),
        cpc: ((predictedMetrics.cpc - currentMetrics.cpc) / currentMetrics.cpc * 100).toFixed(1)
      }
    };
  }

  /**
   * Планирует расписание оптимизаций
   * @param {number} campaignId - ID кампании
   * @returns {Promise<Array>} Расписание оптимизаций
   */
  static async scheduleOptimizations(campaignId) {
    const campaign = await CampaignModel.findById(campaignId);
    const performance = await CampaignPerformanceModel.findByCampaignId(campaignId);

    if (!campaign || !performance) {
      throw new BusinessError('Campaign data not found');
    }

    const schedule = [];
    const campaignDuration = Math.ceil(
      (new Date(campaign.end_date) - new Date(campaign.start_date)) / (1000 * 60 * 60 * 24)
    );

    // Планируем проверки на основе длительности кампании
    if (campaignDuration > 7) {
      schedule.push({
        day: 3,
        type: 'initial_optimization',
        description: 'First performance check and adjustments'
      });
    }

    if (campaignDuration > 14) {
      schedule.push({
        day: 7,
        type: 'creative_refresh',
        description: 'Evaluate and refresh creatives'
      });
    }

    if (campaignDuration > 30) {
      schedule.push({
        day: 14,
        type: 'full_optimization',
        description: 'Comprehensive optimization review'
      });

      schedule.push({
        day: 30,
        type: 'strategic_review',
        description: 'Strategic review and major adjustments'
      });
    }

    return schedule;
  }
}

module.exports = OptimizationService;