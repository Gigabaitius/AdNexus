/**
 * *project*\backend/validation/campaignSchemas.js
 * Схемы валидации для кампаний
 */

const Joi = require('joi');

// Кастомные валидаторы
const customValidators = {
  // Валидатор URL
  url: (value, helpers) => {
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return helpers.error('any.invalid');
      }
      return value;
    } catch {
      return helpers.error('any.invalid');
    }
  },

  // Валидатор JSON
  jsonString: (value, helpers) => {
    try {
      JSON.parse(value);
      return value;
    } catch {
      return helpers.error('any.invalid');
    }
  },

  // Валидатор даты в будущем
  futureDate: (value, helpers) => {
    const date = new Date(value);
    if (date <= new Date()) {
      return helpers.error('any.invalid');
    }
    return value;
  }
};

// Схема создания кампании
const campaignCreateSchema = Joi.object({
  // Основная информация
  title: Joi.string()
    .min(3)
    .max(100)
    .trim()
    .required()
    .messages({
      'string.min': 'Campaign title must be at least 3 characters',
      'string.max': 'Campaign title cannot exceed 100 characters',
      'any.required': 'Campaign title is required'
    }),

  description: Joi.string()
    .max(1000)
    .trim()
    .allow('', null)
    .messages({
      'string.max': 'Description cannot exceed 1000 characters'
    }),

  objective: Joi.string()
    .valid(
      'brand_awareness', 'traffic', 'conversions', 
      'engagement', 'app_installs', 'video_views', 'lead_generation'
    )
    .required()
    .messages({
      'any.only': 'Invalid campaign objective',
      'any.required': 'Campaign objective is required'
    }),

  // Бюджет
  budget_total: Joi.number()
    .min(10)
    .max(1000000)
    .precision(2)
    .required()
    .messages({
      'number.min': 'Minimum campaign budget is $10',
      'number.max': 'Maximum campaign budget is $1,000,000',
      'any.required': 'Total budget is required'
    }),

  budget_daily: Joi.number()
    .min(1)
    .max(Joi.ref('budget_total'))
    .precision(2)
    .allow(null)
    .messages({
      'number.min': 'Minimum daily budget is $1',
      'number.max': 'Daily budget cannot exceed total budget'
    }),

  currency: Joi.string()
    .valid('USD', 'EUR', 'RUB', 'GBP', 'CNY', 'JPY')
    .default('USD'),

  // Даты
  start_date: Joi.date()
    .iso()
    .custom(customValidators.futureDate)
    .required()
    .messages({
      'date.base': 'Invalid start date format',
      'any.invalid': 'Start date must be in the future',
      'any.required': 'Start date is required'
    }),

  end_date: Joi.date()
    .iso()
    .greater(Joi.ref('start_date'))
    .required()
    .messages({
      'date.greater': 'End date must be after start date',
      'any.required': 'End date is required'
    }),

  // Вложенные объекты
  targeting: Joi.object({
    tags: Joi.array()
      .items(Joi.string().trim().min(2).max(50))
      .max(20)
      .default([])
      .messages({
        'array.max': 'Maximum 20 tags allowed'
      }),

    primary_tag: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .allow(null),

    target_gender: Joi.string()
      .valid('all', 'male', 'female', 'other')
      .default('all'),

    target_age_range: Joi.object({
      min: Joi.number().min(13).max(100),
      max: Joi.number().min(Joi.ref('min')).max(100)
    }).default({}),

    target_locations: Joi.array()
      .items(Joi.string().trim())
      .max(50)
      .default([]),

    language_targeting: Joi.array()
      .items(Joi.string().length(2)) // ISO 639-1 codes
      .max(10)
      .default([])
  }),

  creatives: Joi.object({
    creative_assets: Joi.array()
      .items(Joi.object({
        type: Joi.string()
          .valid('image', 'video', 'carousel', 'text')
          .required(),
        
        url: Joi.string()
          .custom(customValidators.url)
          .when('type', {
            is: Joi.valid('image', 'video'),
            then: Joi.required()
          }),

        text: Joi.object({
          headline: Joi.string().max(100).required(),
          body: Joi.string().max(500).required(),
          cta: Joi.string().max(30)
        }).when('type', {
          is: 'text',
          then: Joi.required()
        }),

        dimensions: Joi.object({
          width: Joi.number().positive().required(),
          height: Joi.number().positive().required()
        }),

        file_size: Joi.number().max(10 * 1024 * 1024),
        duration: Joi.number().when('type', {
          is: 'video',
          then: Joi.max(120)
        })
      }))
      .min(1)
      .max(10)
      .default([])
      .messages({
        'array.min': 'At least one creative is required',
        'array.max': 'Maximum 10 creatives allowed'
      }),

    landing_url: Joi.string()
      .custom(customValidators.url)
      .allow(null)
      .messages({
        'any.invalid': 'Invalid landing URL'
      }),

    utm_parameters: Joi.object({
      utm_source: Joi.string().max(50),
      utm_medium: Joi.string().max(50),
      utm_campaign: Joi.string().max(50),
      utm_term: Joi.string().max(50),
      utm_content: Joi.string().max(50)
    }).default({})
  })
});

// Схема обновления кампании
const campaignUpdateSchema = Joi.object({
  campaign: Joi.object({
    title: Joi.string().min(3).max(100).trim(),
    description: Joi.string().max(1000).trim().allow('', null),
    end_date: Joi.date().iso(),
    budget_total: Joi.number().min(10).max(1000000).precision(2),
    budget_daily: Joi.number().min(1).precision(2).allow(null)
  }),

  targeting: Joi.object({
    tags: Joi.array().items(Joi.string().trim().min(2).max(50)).max(20),
    primary_tag: Joi.string().trim().min(2).max(50).allow(null),
    target_gender: Joi.string().valid('all', 'male', 'female', 'other'),
    target_age_range: Joi.object({
      min: Joi.number().min(13).max(100),
      max: Joi.number().min(Joi.ref('min')).max(100)
    }),
    target_locations: Joi.array().items(Joi.string().trim()).max(50),
    language_targeting: Joi.array().items(Joi.string().length(2)).max(10)
  }),

  creatives: Joi.object({
    creative_assets: Joi.array()
      .items(Joi.object())
      .max(10),
    landing_url: Joi.string().custom(customValidators.url).allow(null)
  }),

  scheduling: Joi.object({
    frequency_cap_enabled: Joi.boolean(),
    frequency_cap_amount: Joi.number().min(1).when('frequency_cap_enabled', {
      is: true,
      then: Joi.required()
    }),
    frequency_cap_period: Joi.string().valid('hour', 'day', 'week', 'month')
  }),

  optimization: Joi.object({
    auto_optimization_enabled: Joi.boolean(),
    optimization_goal: Joi.string().valid(
      'clicks', 'conversions', 'impressions', 
      'reach', 'engagement', 'video_views'
    ),
    bid_strategy: Joi.string().valid(
      'manual', 'auto_lowest_cost', 'auto_target_cost', 
      'maximize_conversions', 'target_roas'
    )
  })
}).min(1).messages({
  'object.min': 'At least one field must be updated'
});

module.exports = {
  campaignCreateSchema,
  campaignUpdateSchema,
  customValidators
};