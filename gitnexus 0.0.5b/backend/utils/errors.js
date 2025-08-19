/**
 * *project*\backend/utils/errors.js
 * Кастомные классы ошибок
 */

class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400);
    this.errors = errors;
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

class BusinessError extends AppError {
  constructor(message, details = null) {
    super(message, 400, details);
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
  }
}

class DatabaseError extends AppError {
  constructor(message, details = null) {
    super(message, 500, details);
    this.isOperational = false;
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  BusinessError,
  AuthenticationError,
  AuthorizationError,
  DatabaseError
};