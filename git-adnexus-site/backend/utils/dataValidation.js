// Валидация данных

const Joi = require('joi');

// Схема валидации для регистрации
const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().pattern(new RegExp('^[a-zA-Z0-9]{6,30}$')).required()
});

// Middleware для валидации
const validateRegister = (req, res, next) => {
  const { error } = registerSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({ 
      message: error.details[0].message 
    });
  }
  
  next();
};

// Применение в маршрутах
router.post('/register', validateRegister, userController.registerUser);