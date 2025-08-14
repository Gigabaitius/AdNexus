// *project*/backend/middleware/authMiddleware.js
// Middleware - промежуточные обработчики запросов (аутентификация, логирование, и т.д.)

const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.SECRET_KEY; // тот же ключ, что и при генерации токена

/**
 * Middleware для проверки JWT токена
 * Добавляет объект user в req при успешной аутентификации
 * @param {import('express').Request} req - Express request объект
 * @param {import('express').Response} res - Express response объект
 * @param {import('express').NextFunction} next - Express next функция
 */
function authMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    
    // Нормализуем структуру user объекта
    req.user = {
      id: decoded.user_id,  // Используем user_id из токена как id
      user_id: decoded.user_id,  // Дублируем для обратной совместимости
      username: decoded.username,
      is_admin: decoded.is_admin === 1,
      is_moderator: decoded.is_moderator === 1
    };
    
    next();




  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ message: "Access denied: Admins only." });
  }
  next(); // допуск, если admin
}

function requireModerator(req, res, next) {
  if (!req.user || (!req.user.is_moderator && !req.user.is_admin)) {
    return res.status(403).json({ message: "Access denied: Moderators only." });
  }
  next(); // допуск, если moder или admin
}

/**
 * Middleware для проверки ролей пользователя
 * @param {string[]} allowedRoles - Массив разрешенных ролей
 * @returns {Function} Express middleware функция
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    const userRoles = [];
    if (req.user.is_admin) userRoles.push('admin');
    if (req.user.is_moderator) userRoles.push('moderator');
    userRoles.push('user'); // Все авторизованные пользователи имеют роль 'user'

    const hasRequiredRole = allowedRoles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }

    next();
  };
};

// Добавьте этот экспорт в существующий middleware/auth.js
module.exports = {
  authMiddleware, 
  requireAdmin,
  requireModerator,
  requireRole // новая функция
};

