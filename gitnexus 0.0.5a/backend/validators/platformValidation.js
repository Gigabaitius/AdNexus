// *project*\backend\validators\platformValidation.js

const Joi = require('joi');

/**
 * Схемы валидации для операций с площадками
 * @module validators/platformValidation
 */
const platformValidation = {
  /**
   * Схема валидации для создания площадки
   * @type {import('joi').ObjectSchema}
   */
  createPlatform: Joi.object({
    name: Joi.string()
      .min(3)
      .max(100)
      .required()
      .messages({
        'string.min': 'Platform name must be at least 3 characters long',
        'string.max': 'Platform name cannot exceed 100 characters',
        'any.required': 'Platform name is required'
      }),
    
    type: Joi.string()
      .valid('website', 'telegram_channel', 'telegram_group', 'instagram', 
             'youtube', 'tiktok', 'facebook', 'vk', 'email_newsletter', 
             'mobile_app', 'podcast', 'other')
      .required()
      .messages({
        'any.required': 'Platform type is required',
        'any.only': 'Invalid platform type'
      }),
    
    url: Joi.string()
      .uri()
      .required()
      .messages({
        'string.uri': 'Please provide a valid URL',
        'any.required': 'Platform URL is required'
      }),
    
    description: Joi.string()
      .max(1000)
      .allow('', null),
    
    audience_size: Joi.number()
      .integer()
      .min(0)
      .default(0)
      .messages({
        'number.min': 'Audience size cannot be negative'
      }),
    
    audience_demographics: Joi.object({
      age_groups: Joi.object().pattern(
        Joi.string(),
        Joi.number().min(0).max(100)
      ),
      gender: Joi.object({
        male: Joi.number().min(0).max(100),
        female: Joi.number().min(0).max(100),
        other: Joi.number().min(0).max(100)
      }),
      geo: Joi.object().pattern(
        Joi.string().length(2), // Country codes
        Joi.number().min(0).max(100)
      ),
      devices: Joi.object({
        mobile: Joi.number().min(0).max(100),
        desktop: Joi.number().min(0).max(100),
        tablet: Joi.number().min(0).max(100)
      })
    }).default({}),
    
    pricing_model: Joi.string()
      .valid('cpm', 'cpc', 'cpa', 'flat_rate', 'hybrid')
      .required()
      .messages({
        'any.required': 'Pricing model is required',
        'any.only': 'Invalid pricing model'
      }),
    
    pricing: Joi.object({
      cpm: Joi.number().positive().precision(2),
      cpc: Joi.number().positive().precision(2),
      cpa: Joi.number().positive().precision(2),
      flat_daily: Joi.number().positive().precision(2),
      flat_weekly: Joi.number().positive().precision(2),
      flat_monthly: Joi.number().positive().precision(2)
    }).default({})
      .when('pricing_model', {
        is: 'cpm',
        then: Joi.object({ cpm: Joi.required() }).unknown(true),
        otherwise: Joi.when('pricing_model', {
          is: 'cpc',
          then: Joi.object({ cpc: Joi.required() }).unknown(true),
          otherwise: Joi.when('pricing_model', {
            is: 'cpa',
            then: Joi.object({ cpa: Joi.required() }).unknown(true),
            otherwise: Joi.when('pricing_model', {
              is: 'flat_rate',
              then: Joi.object().or('flat_daily', 'flat_weekly', 'flat_monthly').unknown(true)
            })
          })
        })
      }),
    
    currency: Joi.string()
      .length(3)
      .uppercase()
      .valid('USD', 'EUR', 'RUB', 'GBP')
      .default('USD')
  }),

  /**
   * Схема валидации для обновления площадки
   * @type {import('joi').ObjectSchema}
   */
  updatePlatform: Joi.object({
    name: Joi.string()
      .min(3)
      .max(100),
    
    type: Joi.string()
      .valid('website', 'telegram_channel', 'telegram_group', 'instagram', 
             'youtube', 'tiktok', 'facebook', 'vk', 'email_newsletter', 
             'mobile_app', 'podcast', 'other'),
    
    url: Joi.string()
      .uri(),
    
    description: Joi.string()
      .max(1000)
      .allow('', null),
    
    audience_size: Joi.number()
      .integer()
      .min(0),
    
    audience_demographics: Joi.object({
      age_groups: Joi.object().pattern(
        Joi.string(),
        Joi.number().min(0).max(100)
      ),
      gender: Joi.object({
        male: Joi.number().min(0).max(100),
        female: Joi.number().min(0).max(100),
        other: Joi.number().min(0).max(100)
      }),
      geo: Joi.object().pattern(
        Joi.string().length(2),
        Joi.number().min(0).max(100)
      ),
      devices: Joi.object({
        mobile: Joi.number().min(0).max(100),
        desktop: Joi.number().min(0).max(100),
        tablet: Joi.number().min(0).max(100)
      })
    }),
    
    pricing_model: Joi.string()
      .valid('cpm', 'cpc', 'cpa', 'flat_rate', 'hybrid'),
    
    pricing: Joi.object({
      cpm: Joi.number().positive().precision(2),
      cpc: Joi.number().positive().precision(2),
      cpa: Joi.number().positive().precision(2),
      flat_daily: Joi.number().positive().precision(2),
      flat_weekly: Joi.number().positive().precision(2),
      flat_monthly: Joi.number().positive().precision(2)
    }),
    
    currency: Joi.string()
      .length(3)
      .uppercase()
      .valid('USD', 'EUR', 'RUB', 'GBP')
  }).min(1), // Хотя бы одно поле должно быть передано

  /**
   * Схема валидации для изменения статуса
   * @type {import('joi').ObjectSchema}
   */
  updateStatus: Joi.object({
    status: Joi.string()
      .valid('draft', 'pending_review', 'active', 'paused', 'suspended', 'rejected', 'archived')
      .required()
      .messages({
        'any.required': 'Status is required',
        'any.only': 'Invalid status value'
      })
  }),

  /**
   * Схема валидации для модерации
   * @type {import('joi').ObjectSchema}
   */
  moderatePlatform: Joi.object({
    decision: Joi.string()
      .valid('approved', 'rejected', 'requires_changes')
      .required()
      .messages({
        'any.required': 'Moderation decision is required',
        'any.only': 'Invalid moderation decision'
      }),
    
    notes: Joi.string()
      .max(500)
      .when('decision', {
        is: Joi.valid('rejected', 'requires_changes'),
        then: Joi.required().messages({
          'any.required': 'Notes are required when rejecting or requesting changes'
        }),
        otherwise: Joi.allow('', null)
      })
  }),

  /**
   * Схема валидации для обновления верификации
   * @type {import('joi').ObjectSchema}
   */
  updateVerification: Joi.object({
    verification_status: Joi.string()
      .valid('unverified', 'pending', 'verified', 'failed', 'expired')
      .required()
      .messages({
        'any.required': 'Verification status is required',
        'any.only': 'Invalid verification status'
      })
  }),

  /**
   * Схема валидации для обновления метрик качества
   * @type {import('joi').ObjectSchema}
   */
  updateQuality: Joi.object({
    rating: Joi.number()
      .min(0)
      .max(5)
      .precision(2)
      .messages({
        'number.min': 'Rating must be at least 0',
        'number.max': 'Rating cannot exceed 5'
      }),
    
    quality_score: Joi.number()
      .min(0)
      .max(10)
      .precision(2)
      .messages({
        'number.min': 'Quality score must be at least 0',
        'number.max': 'Quality score cannot exceed 10'
      })
  }).or('rating', 'quality_score'), // Хотя бы одно поле должно быть передано

  /**
   * Схема валидации для query параметров получения площадок
   * @type {import('joi').ObjectSchema}
   */
  getPlatformsQuery: Joi.object({
    user_id: Joi.number().integer().positive(),
    type: Joi.alternatives().try(
      Joi.string().valid('website', 'telegram_channel', 'telegram_group', 'instagram', 
                        'youtube', 'tiktok', 'facebook', 'vk', 'email_newsletter', 
                        'mobile_app', 'podcast', 'other'),
      Joi.array().items(Joi.string().valid('website', 'telegram_channel', 'telegram_group', 
                                          'instagram', 'youtube', 'tiktok', 'facebook', 'vk', 
                                          'email_newsletter', 'mobile_app', 'podcast', 'other'))
    ),
    status: Joi.string().valid('draft', 'pending_review', 'active', 'paused', 'suspended', 'rejected', 'archived'),
    moderation_status: Joi.string().valid('pending', 'approved', 'rejected', 'requires_changes'),
    verification_status: Joi.string().valid('unverified', 'pending', 'verified', 'failed', 'expired'),
    pricing_model: Joi.string().valid('cpm', 'cpc', 'cpa', 'flat_rate', 'hybrid'),
    currency: Joi.string().length(3).uppercase(),
    audience_min: Joi.number().integer().min(0),
    audience_max: Joi.number().integer().positive(),
    price_max: Joi.number().positive(),
    search: Joi.string().max(100),
    sort: Joi.string().pattern(/^(name|created_at|updated_at|audience_size|rating|quality_score):(asc|desc)$/),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  }),

  /**
   * Схема валидации для проверки URL
   * @type {import('joi').ObjectSchema}
   */
  checkUrl: Joi.object({
    url: Joi.string()
      .uri()
      .required()
      .messages({
        'string.uri': 'Please provide a valid URL',
        'any.required': 'URL parameter is required'
      })
  }),

  /**
   * Схема валидации для получения топ площадок
   * @type {import('joi').ObjectSchema}
   */
  getTopPlatforms: Joi.object({
    criteria: Joi.string()
      .valid('rating', 'audience', 'quality', 'verified')
      .default('rating'),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(50)
      .default(10)
  }),

  /**
   * Схема валидации для получения похожих площадок
   * @type {import('joi').ObjectSchema}
   */
  getSimilar: Joi.object({
    limit: Joi.number()
      .integer()
      .min(1)
      .max(20)
      .default(5)
  })
};

module.exports = platformValidation;