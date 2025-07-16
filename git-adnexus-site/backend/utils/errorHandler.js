// Глобальный обработчик ошибок
// Создаем класс для типизированных ошибок
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Ошибки, которые мы ожидаем
    Error.captureStackTrace(this, this.constructor);
  }
}

// Middleware для обработки ошибок
const errorHandler = (err, req, res, next) => {
  // Данные об ошибке для логирования
  const errorDetails = {
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: req.user ? req.user.id : 'unauthorized'
  };
  
  // Логируем в файл или сервис
  logger.error(JSON.stringify(errorDetails));
  
  // Ответ клиенту зависит от типа ошибки
  if (err.isOperational) {
    // Ожидаемая ошибка (валидация, аутентификация и т.д.)
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message
    });
  } 
  
  // Непредвиденная ошибка сервера
  return res.status(500).json({
    status: 'error',
    message: 'Что-то пошло не так'
  });
};

// Регистрируем обработчик в Express
app.use(errorHandler);