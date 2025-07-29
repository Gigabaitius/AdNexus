// middleware/validate.js

/**
 * @typedef {import('joi').Schema} JoiSchema
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('express').NextFunction} NextFunction
 */

/**
 * Создает middleware для валидации данных запроса с помощью Joi
 * @param {JoiSchema} schema - Joi схема для валидации
 * @param {string} [property='body'] - Свойство request для валидации ('body', 'query', 'params')
 * @returns {Function} Express middleware функция
 * @example
 * // Валидация body
 * router.post('/users', validate(userSchema), controller.createUser)
 * 
 * // Валидация query параметров
 * router.get('/users', validate(querySchema, 'query'), controller.getUsers)
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    // Валидируем данные из указанного свойства request
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Показать все ошибки, а не только первую
      stripUnknown: true // Удалить неизвестные поля
    });

    if (error) {
      // Форматируем ошибки валидации
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors
      });
    }

    // Заменяем данные на валидированные (с приведением типов и значениями по умолчанию)
    req[property] = value;
    next();
  };
};

module.exports = validate;