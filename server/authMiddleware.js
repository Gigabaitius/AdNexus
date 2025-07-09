const jwt = require("jsonwebtoken");

const SECRET_KEY = "secret-AdNexus-key"; // тот же ключ, что и при генерации токена

function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"]; // Заголовок Authorization
  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1]; // Берем вторую часть "Bearer <token>"
  if (!token) {
    return res.status(401).json({ message: "Malformed token" });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY); // Расшифровываем токен
    req.user = decoded; // Передаем в следующий обработчик
    next(); // Пропускаем дальше
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.is_admin !== 1) {
    return res.status(403).json({ message: "Access denied: Admins only." });
  }
  next(); // допуск, если admin
}

function requireModerator(req, res, next) {
  if (!req.user || (req.user.is_moderator !== 1 && req.user.is_admin !== 1)) {
    return res.status(403).json({ message: "Access denied: Moderators only." });
  }
  next(); // допуск, если moder или admin
}

module.exports = { authMiddleware, requireAdmin, requireModerator };