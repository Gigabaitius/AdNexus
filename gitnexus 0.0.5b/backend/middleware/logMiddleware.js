/**
 * *project*\backend/middleware/loggingMiddleware.js
 * Middleware для логирования HTTP запросов
 */

const logger = require('../utils/logger');

function loggingMiddleware(req, res, next) {
  const startTime = Date.now();
  
  // Сохраняем оригинальный метод end
  const originalEnd = res.end;
  
  // Переопределяем метод end для логирования после отправки ответа
  res.end = function(...args) {
    const duration = Date.now() - startTime;
    
    logger.apiRequest(
      req.method,
      req.path,
      res.statusCode,
      duration,
      {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        userId: req.user?.id,
        query: req.query,
        body: req.method === 'POST' || req.method === 'PUT' ? 
          JSON.stringify(req.body).substring(0, 200) : undefined
      }
    );
    
    // Вызываем оригинальный метод
    originalEnd.apply(res, args);
  };
  
  next();
}

module.exports = loggingMiddleware;