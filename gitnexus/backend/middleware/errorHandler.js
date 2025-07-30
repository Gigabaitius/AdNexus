// *project*/backend/middleware/errorHandler.js
/**
 * @fileoverview Глобальный обработчик ошибок Express
 * @module middleware/errorHandler
 */

const logger = require('../utils/logger');

/**
 * Middleware для централизованной обработки ошибок
 * @param {Error} err - Объект ошибки
 * @param {Object} req - Express request объект
 * @param {Object} res - Express response объект
 * @param {Function} next - Express next middleware функция
 * @returns {Object} JSON ответ с информацией об ошибке
 */
const errorHandler = (err, req, res, next) => {
    /**
     * Формирование детальной информации об ошибке для логирования
     * @type {Object}
     */
    const errorDetails = {
        message: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        method: req.method,
        ip: req.ip,
        user: req.user ? req.user.id : 'unauthorized',
        statusCode: err.statusCode || 500,
        // Добавляем тело запроса для POST/PUT (исключая пароли)
        body: req.method !== 'GET' ? sanitizeBody(req.body) : undefined
    };

    // Запись ошибки в лог файл и консоль
    logger.error('Error occurred:', errorDetails);

    // Определение HTTP статус кода
    const statusCode = err.statusCode || 500;

    // Проверка типа ошибки для формирования ответа
    if (err.isOperational || statusCode < 500) {
        // Операционные ошибки (ожидаемые) - показываем детали
        return res.status(statusCode).json({
            success: false,
            error: {
                message: err.message,
                ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
            }
        });
    }

    // Системные ошибки (неожиданные) - скрываем детали в production
    return res.status(500).json({
        success: false,
        error: {
            message: process.env.NODE_ENV === 'production' 
                ? 'Внутренняя ошибка сервера' 
                : err.message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
    });
};

/**
 * Очистка тела запроса от чувствительных данных
 * @param {Object} body - Тело запроса
 * @returns {Object} Очищенное тело запроса
 */
function sanitizeBody(body) {
    if (!body) return undefined;
    
    const sanitized = { ...body };
    // Удаляем пароли и токены из логов
    const sensitiveFields = ['password', 'token', 'refreshToken', 'apiKey'];
    
    sensitiveFields.forEach(field => {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    });
    
    return sanitized;
}

module.exports = errorHandler;