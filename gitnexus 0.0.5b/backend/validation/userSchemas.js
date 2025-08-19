/**
 * *project*\backend/validation/userSchemas.js
 * Схемы валидации для пользователей
 */

const Joi = require('joi');

const userCreateSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.alphanum': 'Username must contain only letters and numbers',
      'string.min': 'Username must be at least 3 characters',
      'string.max': 'Username cannot exceed 30 characters'
    }),

  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address'
    }),

  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base': 'Password must contain uppercase, lowercase and numbers'
    })
});

const userUpdateSchema = Joi.object({
  email: Joi.string().email(),
  profile: Joi.object({
    phone: Joi.string().pattern(/^\+?[\d\s-()]+$/),
    bio: Joi.string().max(500),
    company_name: Joi.string().max(100),
    preferred_language: Joi.string().length(2),
    timezone: Joi.string()
  })
}).min(1);

const passwordChangeSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base': 'Password must contain uppercase, lowercase and numbers'
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Passwords do not match'
    })
});

module.exports = {
  userCreateSchema,
  userUpdateSchema,
  passwordChangeSchema
};