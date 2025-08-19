/**
 * *project*\backend/services/campaign/campaignValidationService.js
 * Сервис валидации данных кампаний
 */

const Joi = require('joi');
const { ValidationError } = require('../../utils/errors');

class CampaignValidationService {
  /**
   * Схема валидации для создания кампании
   */
  static campaignCreateSchema = Joi.object({
    title: Joi.string().min(3).max(100).required(),
    description: Joi.string().max(1000).allow('', null),
    objective: Joi.string().valid(
      'brand_awareness', 'traffic', 'conversions', 
      'engagement', 'app_installs', 'video_views', 'lead_generation'
    ).required(),
    budget_total: Joi.number().min(10).required(),
    budget_daily: Joi.number().min(1).max(Joi.ref('budget_total')).allow(null),
    currency: Joi.string().valid('USD', 'EUR', 'RUB', 'GBP', 'CNY', 'JPY').default('USD'),
    start_date: Joi.date().min('now').required(),
    end_date: Joi.date().greater(Joi.ref('start_date')).required(),
    
    // Вложенные объекты
    targeting: Joi.object({
      tags: Joi.array().items(Joi.string()).default([]),
      primary_tag: Joi.string().allow(null),
      target_gender: Joi.string().valid('all', 'male', 'female', 'other').default('all'),
      target_age_range: Joi.object({
        min: Joi.number().min(13).max(100),
        max: Joi.number().min(Joi.ref('min')).max(100)
      }).default({}),
      target_locations: Joi.array().items(Joi.string()).default([]),
      language_targeting: Joi.array().items(Joi.string()).default([])
    }),
    
    creatives: Joi.object({
      creative_assets: Joi.array().items(Joi.object({
        type: Joi.string().valid('image', 'video', 'carousel', 'text').required(),
        url: Joi.string().uri().when('type', {
          is: Joi.valid('image', 'video'),
          then: Joi.required()
        }),
        text: Joi.string().when('type', {
          is: 'text',
          then: Joi.required()
        }),
        title: Joi.string().max(100),
        description: Joi.string().max(500)
      })).default([]),
      landing_url: Joi.string().uri().allow(null),
      utm_parameters: Joi.object().default({})
    }),
    
    scheduling: Joi.object({
      schedule_type: Joi.string().valid('continuous', 'dayparting', 'custom').default('continuous'),
      frequency_cap_enabled: Joi.boolean().default(false),
      frequency_cap_amount: Joi.number().min(1).when('frequency_cap_enabled', {
        is: true,
        then: Joi.required()
      }),
      frequency_cap_period: Joi.string().valid('hour', 'day', 'week', 'month').when('frequency_cap_enabled', {
        is: true,
        then: Joi.required()
      })
    }),
    
    optimization: Joi.object({
      auto_optimization_enabled: Joi.boolean().default(false),
      optimization_goal: Joi.string().valid(
        'clicks', 'conversions', 'impressions', 
        'reach', 'engagement', 'video_views'
      ).when('auto_optimization_enabled', {
        is: true,
        then: Joi.required()
      }),
      bid_strategy: Joi.string().valid(
        'manual', 'auto_lowest_cost', 'auto_target_cost', 
        'maximize_conversions', 'target_roas'
      ).default('manual')
    })
  });

  /**
   * Валидирует данные для создания кампании
   * @param {Object} campaignData - Данные кампании
   * @returns {Promise<Object>} Результат валидации
   */
  static async validateCampaignData(campaignData) {
    try {
      const validated = await this.campaignCreateSchema.validateAsync(campaignData, {
        abortEarly: false,
        stripUnknown: true
      });
      
      // Дополнительная бизнес-валидация
      const businessErrors = await this.validateBusinessRules(validated);
      
      if (businessErrors.length > 0) {
        return {
          isValid: false,
          errors: businessErrors,
          data: validated
        };
      }
      
      return {
        isValid: true,
        errors: [],
        data: validated
      };
    } catch (error) {
      if (error.isJoi) {
        return {
          isValid: false,
          errors: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          })),
          data: null
        };
      }
      throw error;
    }
  }

  /**
   * Валидирует обновление кампании
   * @param {Object} currentCampaign - Текущие данные кампании
   * @param {Object} updates - Обновления
   * @returns {Promise<Object>} Результат валидации
   */
  static async validateCampaignUpdate(currentCampaign, updates) {
    const errors = [];

    // Нельзя изменять некоторые поля активной кампании
    if (currentCampaign.status === 'active') {
      const restrictedFields = ['budget_total', 'start_date', 'currency'];
      const attemptedChanges = Object.keys(updates.campaign || {})
        .filter(field => restrictedFields.includes(field));
      
      if (attemptedChanges.length > 0) {
        errors.push({
          field: attemptedChanges.join(', '),
          message: 'Cannot modify these fields for active campaign'
        });
      }
    }

    // Нельзя уменьшать бюджет ниже потраченного
    if (updates.campaign?.budget_total && 
        updates.campaign.budget_total < currentCampaign.budget_spent) {
      errors.push({
        field: 'budget_total',
        message: 'New budget cannot be less than already spent amount'
      });
    }

    // Валидация дат
    if (updates.campaign?.end_date) {
      const newEndDate = new Date(updates.campaign.end_date);
      const startDate = new Date(currentCampaign.start_date);
      
      if (newEndDate <= startDate) {
        errors.push({
          field: 'end_date',
          message: 'End date must be after start date'
        });
      }
      
      if (currentCampaign.status === 'active' && newEndDate < new Date()) {
        errors.push({
          field: 'end_date',
          message: 'Cannot set end date in the past for active campaign'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Валидирует бизнес-правила
   * @param {Object} campaignData - Данные кампании
   * @returns {Promise<Array>} Массив ошибок
   */
  static async validateBusinessRules(campaignData) {
    const errors = [];

    // Минимальная длительность кампании
    const startDate = new Date(campaignData.start_date);
    const endDate = new Date(campaignData.end_date);
    const durationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    if (durationDays < 1) {
      errors.push({
        field: 'dates',
        message: 'Campaign must run for at least 1 day'
      });
    }

    // Проверка дневного бюджета
    if (campaignData.budget_daily) {
      const maxPossibleSpend = campaignData.budget_daily * durationDays;
      if (maxPossibleSpend < campaignData.budget_total * 0.8) {
        errors.push({
          field: 'budget_daily',
          message: 'Daily budget is too low to spend total budget within campaign duration'
        });
      }
    }

    // Проверка креативов для определенных целей
    if (['video_views'].includes(campaignData.objective)) {
      const hasVideo = campaignData.creatives?.creative_assets?.some(
        asset => asset.type === 'video'
      );
      if (!hasVideo) {
        errors.push({
          field: 'creatives',
          message: 'Video creative is required for video views objective'
        });
      }
    }

    return errors;
  }

  /**
   * Валидирует креатив
   * @param {Object} creative - Данные креатива
   * @returns {Object} Результат валидации
   */
  static validateCreative(creative) {
    const schema = Joi.object({
      type: Joi.string().valid('image', 'video', 'carousel', 'text').required(),
      url: Joi.string().uri().when('type', {
        is: Joi.valid('image', 'video'),
        then: Joi.required()
      }),
      text: Joi.object({
        headline: Joi.string().max(100),
        body: Joi.string().max(500),
cta: Joi.string().max(30)
      }).when('type', {
        is: 'text',
        then: Joi.required()
      }),
      dimensions: Joi.object({
        width: Joi.number().positive(),
        height: Joi.number().positive()
      }),
      file_size: Joi.number().max(10 * 1024 * 1024), // 10MB max
      duration: Joi.number().when('type', {
        is: 'video',
        then: Joi.max(120) // 2 minutes max
      })
    });

    try {
      const validated = schema.validateSync(creative);
      return { isValid: true, data: validated };
    } catch (error) {
      return { 
        isValid: false, 
        error: error.message 
      };
    }
  }

  /**
   * Валидирует таргетинг
   * @param {Object} targeting - Данные таргетинга
   * @returns {boolean} Валидность таргетинга
   */
  static validateTargeting(targeting) {
    // Проверка, что хотя бы один параметр таргетинга задан
    const hasTargeting = 
      (targeting.tags && targeting.tags.length > 0) ||
      targeting.primary_tag ||
      (targeting.target_locations && targeting.target_locations.length > 0) ||
      (targeting.target_interests && targeting.target_interests.length > 0) ||
      (targeting.language_targeting && targeting.language_targeting.length > 0) ||
      targeting.target_gender !== 'all' ||
      (targeting.target_age_range && (targeting.target_age_range.min || targeting.target_age_range.max));

    return hasTargeting;
  }
}

module.exports = CampaignValidationService;