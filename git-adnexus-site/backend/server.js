// Импорт необходимых модулей
require('dotenv').config({ path: './backend/.env' });
const express = require("express");
const cors = require("cors");
const path = require("path");

// Импорт маршрутов
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const campaignRoutes = require('./routes/campaignRoutes');

// Создание экземпляра Express-приложения
const app = express();
const PORT = process.env.PORT || 3000;



// Middleware
app.use(cors());
app.use(express.json());

// Статические файлы (frontend)
app.use(express.static(path.join(__dirname, '../frontend')));

// Регистрация маршрутов
app.use("/api", userRoutes); // Префикс /api для всех API-маршрутов
app.use("/api", authRoutes);
app.use('/api', campaignRoutes);

// Обработка 404 (когда маршрут не найден)
app.use((req, res) => {
    res.status(404).json({ message: "Маршрут не найден" });
});

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Ошибка сервера" });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен из директории: ${process.cwd()}`);
    console.log(`Сервер работает на http://localhost:${PORT}`);
});

