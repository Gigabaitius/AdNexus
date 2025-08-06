// backend/utils/responseFormatter.js

/**
 * Форматирует успешный ответ
 * @param {any} data - Данные для отправки
 * @param {string} message - Сообщение (опционально)
 * @param {object} meta - Дополнительные метаданные
 */
function successResponse(data, message = 'Success', meta = {}) {
  return {
    success: true,
    message,
    data,
    ...meta
  };
}

/**
 * Форматирует ответ с ошибкой
 * @param {string} message - Сообщение об ошибке
 * @param {number} statusCode - HTTP статус код
 * @param {object} details - Дополнительные детали ошибки
 */
function errorResponse(message, statusCode = 500, details = null) {
  return {
    success: false,
    error: {
      message,
      statusCode,
      ...(details && { details })
    }
  };
}

/**
 * Форматирует ответ с пагинацией
 * @param {array} data - Массив данных
 * @param {number} page - Текущая страница
 * @param {number} limit - Элементов на странице
 * @param {number} total - Всего элементов
 */
function paginatedResponse(data, page, limit, total) {
  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    }
  };
}

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse
};