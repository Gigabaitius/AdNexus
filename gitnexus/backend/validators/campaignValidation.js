// validators/campaignValidation.js

const Joi = require('joi');

/**
 * Схемы валидации для операций с кампаниями
 * @module validators/campaignValidation
 */
const campaignValidation = {
  /**
   * Схема валидации для создания кампании
   * @type {import('joi').ObjectSchema}
   */
  createCampaign: Joi.object({
    title: Joi.string()
      .min(3)
      .max(100)
      .required()
      .messages({
        'string.min': 'Campaign title must be at least 3 characters long',
        'string.max': 'Campaign title cannot exceed 100 characters',
        'any.required': 'Campaign title is required'
      }),
    
    description: Joi.string()
      .max(500)
      .allow('', null),
    
    objective: Joi.string()
      .valid('brand_awareness', 'traffic', 'conversions', 'engagement')
      .messages({
        'any.only': 'Invalid campaign objective'
      }),
    
    target_audience: Joi.object({
      age_range: Joi.string().pattern(/^\d{1,2}-\d{1,3}$/),
      gender: Joi.string().valid('all', 'male', 'female', 'other'),
      interests: Joi.array().items(Joi.string()),
      geo: Joi.array().items(Joi.string().length(2)) // Country codes
    }).allow(null),
    
    budget_total: Joi.number()
      .positive()
      .precision(2)
      .required()
      .messages({
        'number.positive': 'Budget must be a positive number',
        'any.required': 'Total budget is required'
      }),
    
    budget_daily: Joi.number()
      .positive()
      .precision(2)
      .allow(null),
    
    currency: Joi.string()
      .length(3)
      .uppercase()
      .default('USD'),
    
    start_date: Joi.date()
      .iso()
      .required()
      .messages({
        'any.required': 'Start date is required'
      }),
    
    end_date: Joi.date()
      .iso()
      .greater(Joi.ref('start_date'))
      .required()
      .messages({
        'any.required': 'End date is required',
        'date.greater': 'End date must be after start date'
      }),
    
    creative_assets: Joi.array().items(
      Joi.object({
        type: Joi.string().valid('image', 'video', 'text').required(),
        url: Joi.string().uri().when('type', {
          is: Joi.valid('image', 'video'),
          then: Joi.required()
        }),
        content: Joi.string().when('type', {
          is: 'text',
          then: Joi.required()
        }),
        alt_text: Joi.string().max(200)
      })
    ).default([]),
    
    landing_url: Joi.string()
      .uri()
      .allow('', null),
    
    visibility: Joi.string()
      .valid('public', 'private', 'unlisted')
      .default('public')
  }),

  /**
   * Схема валидации для обновления кампании
   * @type {import('joi').ObjectSchema}
   */
  updateCampaign: Joi.object({
    title: Joi.string()
      .min(3)
      .max(100),
    
    description: Joi.string()
      .max(500)
      .allow('', null),
    
    objective: Joi.string()
      .valid('brand_awareness', 'traffic', 'conversions', 'engagement'),
    
    target_audience: Joi.object({
      age_range: Joi.string().pattern(/^\d{1,2}-\d{1,3}$/),
      gender: Joi.string().valid('all', 'male', 'female', 'other'),
      interests: Joi.array().items(Joi.string()),
      geo: Joi.array().items(Joi.string().length(2))
    }),
    
    budget_total: Joi.number()
      .positive()
      .precision(2),
    
    budget_daily: Joi.number()
      .positive()
      .precision(2)
      .allow(null),
    
    start_date: Joi.date().iso(),
    
    end_date: Joi.date()
      .iso()
      .when('start_date', {
        is: Joi.exist(),
        then: Joi.date().greater(Joi.ref('start_date'))
      }),
    
    creative_assets: Joi.array().items(
      Joi.object({
        type: Joi.string().valid('image', 'video', 'text').required(),
        url: Joi.string().uri(),
        content: Joi.string(),
        alt_text: Joi.string().max(200)
      })
    ),
    
    landing_url: Joi.string()
      .uri()
      .allow('', null),
    
    visibility: Joi.string()
      .valid('public', 'private', 'unlisted')
  }).min(1), // Хотя бы одно поле должно быть передано

  /**
   * Схема валидации для изменения статуса
   * @type {import('joi').ObjectSchema}
   */
  updateStatus: Joi.object({
    status: Joi.string()
      .valid('draft', 'pending_approval', 'active', 'paused', 'completed', 'rejected')
      .required()
  }),

  /**
   * Схема валидации для модерации
   * @type {import('joi').ObjectSchema}
   */
  moderateCampaign: Joi.object({
    decision: Joi.string()
      .valid('approved', 'rejected')
      .required(),
    
    notes: Joi.string()
      .max(500)
      .when('decision', {
        is: 'rejected',
        then: Joi.required(),
        otherwise: Joi.allow('', null)
      })
  }),

  /**
   * Схема валидации для query параметров
   * @type {import('joi').ObjectSchema}
   */
  getCampaignsQuery: Joi.object({
    user_id: Joi.number().integer().positive(),
    status: Joi.alternatives().try(
      Joi.string().valid('draft', 'pending_approval', 'active', 'paused', 'completed', 'rejected'),
      Joi.array().items(Joi.string().valid('draft', 'pending_approval', 'active', 'paused', 'completed', 'rejected'))
    ),
    approval_status: Joi.string().valid('pending', 'approved', 'rejected'),
    objective: Joi.string().valid('brand_awareness', 'traffic', 'conversions', 'engagement'),
    search: Joi.string().max(100),
    date_from: Joi.date().iso(),
    date_to: Joi.date().iso(),
    budget_min: Joi.number().positive(),
    budget_max: Joi.number().positive(),
    include_deleted: Joi.boolean(),
    sort: Joi.string().pattern(/^(title|created_at|updated_at|budget_total|start_date|end_date):(asc|desc)$/),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  })
};

module.exports = campaignValidation;