// *project*/backend/validators/campaignValidator.js

const Joi = require('joi');

// Схема для создания/обновления кампании
const campaignSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().allow('').optional(),
  budget: Joi.number().positive().required(),
  start_date: Joi.date().iso().required(),
  end_date: Joi.date().iso().min(Joi.ref('start_date')).allow(null).optional(),
  status: Joi.string().valid('pending', 'active', 'paused', 'completed').default('pending')
});

// Middleware для валидации
const validateCampaign = (req, res, next) => {
  const { error } = campaignSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        message: error.details[0].message
      }
    });
  }
  
  next();
};

module.exports = { validateCampaign };