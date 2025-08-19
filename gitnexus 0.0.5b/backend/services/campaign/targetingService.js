/**
 * *project*\backend/services/campaign/targetingService.js
 * Сервис управления таргетингом кампаний
 */

const CampaignTargetingModel = require('../../models/campaign/campaignTargetingModel');
const TagService = require('../tag/tagService');
const { ValidationError, BusinessError } = require('../../utils/errors');

class TargetingService {
  /**
   * Обновляет таргетинг кампании
   * @param {number} campaignId - ID кампании
   * @param {Object} targetingData - Данные таргетинга
   * @returns {Promise<Object>} Обновленный таргетинг
   */
  static async updateTargeting(campaignId, targetingData) {
    // Валидация тегов
    if (targetingData.tags) {
      const validTags = await TagService.validateTags(targetingData.tags);
      if (!validTags.allValid) {
        throw new ValidationError('Invalid tags', validTags.invalid);
      }
      targetingData.tags = JSON.stringify(targetingData.tags);
    }

    // Валидация геолокаций
    if (targetingData.target_locations) {
      targetingData.target_locations = JSON.stringify(targetingData.target_locations);
    }

    if (targetingData.excluded_locations) {
      targetingData.excluded_locations = JSON.stringify(targetingData.excluded_locations);
    }

    // Обновляем таргетинг
    const success = await CampaignTargetingModel.update(campaignId, targetingData);
    
    if (!success) {
      throw new BusinessError('Failed to update targeting');
    }

    // Обновляем использование тегов
    if (targetingData.tags) {
      await TagService.incrementUsageCount(JSON.parse(targetingData.tags));
    }

    return await CampaignTargetingModel.findByCampaignId(campaignId);
  }

  /**
   * Находит подходящие площадки для таргетинга кампании
   * @param {number} campaignId - ID кампании
   * @param {Object} options - Опции поиска
   * @returns {Promise<Array>} Массив подходящих площадок
   */
  static async findMatchingPlatforms(campaignId, options = {}) {
    const targeting = await CampaignTargetingModel.findByCampaignId(campaignId);
    
    if (!targeting) {
      throw new BusinessError('Campaign targeting not found');
    }

    const { limit = 50, minMatchScore = 0.3 } = options;
    
    // Получаем площадки, соответствующие критериям
    const matchCriteria = {
      tags: JSON.parse(targeting.tags || '[]'),
      primaryTag: targeting.primary_tag,
      locations: JSON.parse(targeting.target_locations || '[]'),
      excludedLocations: JSON.parse(targeting.excluded_locations || '[]'),
      languages: JSON.parse(targeting.language_targeting || '[]'),
      gender: targeting.target_gender,
      ageRange: JSON.parse(targeting.target_age_range || '{}')
    };

    // Здесь должна быть логика поиска площадок
    // Временно возвращаем заглушку
    return [];
  }

  /**
   * Рассчитывает охват аудитории для таргетинга
   * @param {Object} targetingData - Данные таргетинга
   * @returns {Promise<Object>} Оценка охвата
   */
  static async estimateReach(targetingData) {
    // Базовая оценка охвата
    let baseReach = 1000000; // Базовая аудитория
    let multiplier = 1.0;

    // Корректировка по полу
    if (targetingData.target_gender && targetingData.target_gender !== 'all') {
      multiplier *= 0.5;
    }

    // Корректировка по возрасту
    if (targetingData.target_age_range) {
      const ageRange = JSON.parse(targetingData.target_age_range);
      if (ageRange.min && ageRange.max) {
        const ageSpan = ageRange.max - ageRange.min;
        multiplier *= (ageSpan / 70); // Примерная корректировка
      }
    }

    // Корректировка по локациям
    if (targetingData.target_locations) {
      const locations = JSON.parse(targetingData.target_locations);
      if (locations.length > 0) {
        multiplier *= Math.min(locations.length * 0.2, 1.0);
      }
    }

    // Корректировка по интересам
    if (targetingData.target_interests) {
      const interests = JSON.parse(targetingData.target_interests);
      if (interests.length > 0) {
        multiplier *= Math.max(0.1, 1.0 - (interests.length * 0.1));
      }
    }

    const estimatedReach = Math.round(baseReach * multiplier);

    return {
      estimated_reach: estimatedReach,
      reach_percentage: (multiplier * 100).toFixed(2),
      factors: {
        gender: targetingData.target_gender || 'all',
        has_age_targeting: !!targetingData.target_age_range,
        locations_count: JSON.parse(targetingData.target_locations || '[]').length,
        interests_count: JSON.parse(targetingData.target_interests || '[]').length
      }
    };
  }

  /**
   * Предлагает теги на основе описания кампании
   * @param {string} title - Заголовок кампании
   * @param {string} description - Описание кампании
   * @param {string} objective - Цель кампании
   * @returns {Promise<Array>} Предложенные теги
   */
  static async suggestTags(title, description, objective) {
    // Простая логика предложения тегов на основе ключевых слов
    const text = `${title} ${description} ${objective}`.toLowerCase();
    const suggestedTags = [];

    // Карта ключевых слов к тегам
    const keywordMap = {
      'fashion': ['fashion', 'style', 'clothing'],
      'tech': ['technology', 'gadgets', 'innovation'],
      'food': ['food', 'cuisine', 'restaurants'],
      'travel': ['travel', 'tourism', 'vacation'],
      'fitness': ['fitness', 'health', 'wellness'],
      'game': ['gaming', 'entertainment', 'esports'],
      'beauty': ['beauty', 'cosmetics', 'skincare'],
      'education': ['education', 'learning', 'courses'],
      'business': ['business', 'b2b', 'enterprise'],
      'finance': ['finance', 'investment', 'money']
    };

    // Поиск ключевых слов
    for (const [keyword, tags] of Object.entries(keywordMap)) {
      if (text.includes(keyword)) {
        suggestedTags.push(...tags);
      }
    }

    // Добавляем теги на основе цели
    const objectiveTags = {
      'brand_awareness': ['branding', 'awareness'],
      'traffic': ['website', 'traffic'],
      'conversions': ['sales', 'conversions'],
      'app_installs': ['mobile', 'app'],
      'video_views': ['video', 'content'],
      'lead_generation': ['leads', 'b2b']
    };

    if (objectiveTags[objective]) {
      suggestedTags.push(...objectiveTags[objective]);
    }

    // Убираем дубликаты
    const uniqueTags = [...new Set(suggestedTags)];

    // Проверяем существование тегов в БД
    const validatedTags = await TagService.validateTags(uniqueTags);
    
    return validatedTags.valid;
  }

  /**
   * Анализирует эффективность таргетинга
   * @param {number} campaignId - ID кампании
   * @returns {Promise<Object>} Анализ эффективности
   */
  static async analyzeTargetingPerformance(campaignId) {
    const targeting = await CampaignTargetingModel.findByCampaignId(campaignId);
    
    if (!targeting) {
      throw new BusinessError('Campaign targeting not found');
    }

    // Здесь должна быть логика анализа эффективности
    // Временно возвращаем заглушку
    return {
      overall_score: 75,
      recommendations: [
        {
          type: 'expand_locations',
          message: 'Consider adding more locations to increase reach',
          impact: 'high'
        },
        {
          type: 'refine_interests',
          message: 'Your interest targeting might be too broad',
          impact: 'medium'
        }
      ],
      performance_by_segment: {
        age_groups: {},
        locations: {},
        interests: {}
      }
    };
  }

  /**
   * Клонирует таргетинг из одной кампании в другую
   * @param {number} sourceCampaignId - ID исходной кампании
   * @param {number} targetCampaignId - ID целевой кампании
   * @returns {Promise<boolean>} Успешность операции
   */
  static async cloneTargeting(sourceCampaignId, targetCampaignId) {
    const sourceTargeting = await CampaignTargetingModel.findByCampaignId(sourceCampaignId);
    
    if (!sourceTargeting) {
      throw new BusinessError('Source campaign targeting not found');
    }

    // Удаляем campaign_id из данных
    const { campaign_id, created_at, updated_at, ...targetingData } = sourceTargeting;

    // Обновляем таргетинг целевой кампании
    return await CampaignTargetingModel.update(targetCampaignId, targetingData);
  }
}

module.exports = TargetingService;