// *project*/backend/utils/responseFormatter.js

/**
 * Утилиты для форматирования API ответов
 * @module utils/responseFormatter
 */

/**
 * Форматирует успешный ответ
 * @param {any} data - Данные для отправки
 * @param {string} [message='Success'] - Сообщение об успехе
 * @param {Object} [meta={}] - Дополнительные метаданные
 * @returns {Object} Отформатированный ответ
 */
function successResponse(data, message = 'Success', meta = {}) {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
    ...meta
  };
}

/**
 * Форматирует ответ с ошибкой
 * @param {string} message - Сообщение об ошибке
 * @param {number} [statusCode=500] - HTTP статус код
 * @param {Object} [details=null] - Дополнительные детали ошибки
 * @returns {Object} Отформатированный ответ с ошибкой
 */
function errorResponse(message, statusCode = 500, details = null) {
  return {
    success: false,
    error: {
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      ...(details && { details })
    }
  };
}

/**
 * Форматирует ответ с пагинацией
 * @param {Array} data - Массив данных
 * @param {number} page - Текущая страница
 * @param {number} limit - Элементов на странице
 * @param {number} total - Всего элементов
 * @param {Object} [meta={}] - Дополнительные метаданные
 * @returns {Object} Отформатированный ответ с пагинацией
 */
function paginatedResponse(data, page, limit, total, meta = {}) {
  const totalPages = Math.ceil(total / limit);
  
  return {
    success: true,
    data,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(total),
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    },
    timestamp: new Date().toISOString(),
    ...meta
  };
}

/**
 * Форматирует ответ для валидационных ошибок
 * @param {Array} errors - Массив ошибок валидации
 * @param {string} [message='Validation failed'] - Общее сообщение
 * @returns {Object} Отформатированный ответ с ошибками валидации
 */
function validationErrorResponse(errors, message = 'Validation failed') {
  return {
    success: false,
    error: {
      message,
      statusCode: 422,
      type: 'ValidationError',
      details: errors,
      timestamp: new Date().toISOString()
    }
  };
}

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse,
  validationErrorResponse
};