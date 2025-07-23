const logger = require('../utils/logger');  // Импорт логгера

const errorHandler = (err, req, res, next) => {
  // Формирование данных для логирования
  const errorDetails = {
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: req.user ? req.user.id : 'unauthorized'
  };
  
  // Логирование ошибки
  logger.error(JSON.stringify(errorDetails));  // Теперь пишет в файл logs/error.log
  
  // Ответ клиенту
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message
      }
    });
  }
  
  // Непредвиденная ошибка
  return res.status(500).json({
    success: false,
    error: {
      message: process.env.NODE_ENV === 'production' 
        ? 'Что-то пошло не так' 
        : err.message
    }
  });
};

module.exports = errorHandler;