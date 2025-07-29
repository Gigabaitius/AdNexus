// Файл: routes/authRoutes.js

const express = require("express");
const router = express.Router();
const { authMiddleware, requireAdmin, requireModerator } = require("../middleware/authMiddleware");

// Получение данных текущего пользователя
router.get("/me", authMiddleware, (req, res) => {
    res.json(req.user);
});

// Проверка прав администратора
router.get("/admin", authMiddleware, requireAdmin, (req, res) => {
    res.json(req.user);
});

// Проверка прав модератора
router.get("/moderator", authMiddleware, requireModerator, (req, res) => {
    res.json(req.user);
});

module.exports = router;