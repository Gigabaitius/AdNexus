// *project*/backend/validators/tagValidation.js
const Joi = require('joi');

const tagValidation = {
  createTag: Joi.object({
    name: Joi.string()
      .min(2)
      .max(50)
      .pattern(/^[a-zA-Zа-яА-Я0-9\s\-_]+$/)
      .required()
      .messages({
        'string.pattern.base': 'Tag name can only contain letters, numbers, spaces, hyphens and underscores'
      }),
    category: Joi.string()
      .valid('interest', 'demographic', 'behavior', 'industry', 'other')
      .required(),
    description: Joi.string()
      .max(200)
      .allow('', null)
  }),

  updateTag: Joi.object({
    name: Joi.string()
      .min(2)
      .max(50)
      .pattern(/^[a-zA-Zа-яА-Я0-9\s\-_]+$/),
    category: Joi.string()
      .valid('interest', 'demographic', 'behavior', 'industry', 'other'),
    description: Joi.string()
      .max(200)
      .allow('', null)
  }).min(1) // Хотя бы одно поле должно быть передано
};

module.exports = tagValidation;