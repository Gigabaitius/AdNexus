// *project*/backend/server.js
/**
 * @fileoverview Главный файл сервера Express
 * @module server
 */

// Загрузка переменных окружения
require('dotenv').config({ path: './backend/.env' });

// Основные зависимости
const { databases, initializeDatabases } = require('./config/database');
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const path = require("path"); // Встроенный модуль Node.js для работы с путями
const paths = require('./config/paths');
const fs = require('fs'); // Встроенный модуль Node.js для работы с файловой системой
const User = require('./models/userModel');



// Импорт middleware
const errorHandler = require('./middleware/errorHandler');
const morgan = require('morgan'); // Добавим логирование HTTP запросов

/** Создание директории для логов если она не существует
 * 
 */
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true }); // recursive: true создаст все промежуточные папки
    console.log(`Создана директория для логов: ${logsDir}`);
}

// Импорт маршрутов
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const campaignRoutes = require('./routes/campaignRoutes');
const tagRoutes = require('./routes/tagRoutes');

// Создание экземпляра Express-приложения
const app = express();
const PORT = process.env.PORT || 3000;

/** Настройка middleware
 *  CORS для кросс-доменных запросов
 */
app.use(cors());

// Парсинг JSON в теле запросов
app.use(express.json());

// Логирование HTTP запросов
app.use(morgan('combined', {
    stream: fs.createWriteStream(path.join(logsDir, 'access.log'), { flags: 'a' })
}));

// В режиме разработки также выводим в консоль
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Статические файлы (frontend)
app.use(express.static(path.join(__dirname, '../frontend')));

/** Регистрация API маршрутов
 * 
 */
app.use("/api", userRoutes);
app.use("/api", authRoutes);
app.use('/api', campaignRoutes);
app.use('/api/tags', tagRoutes);

/** Тестовый маршрут для проверки работы логгера ошибок
 * 
 * @route GET /api/test-error
 */
app.get('/api/test-error', (req, res, next) => {
    const error = new Error('Тестовая ошибка для проверки логгера');
    error.statusCode = 500;
    error.isOperational = false; // Помечаем как системную ошибку
    next(error); // Передаем ошибку в errorHandler
});

/** Обработчик для несуществующих маршрутов (404)
 * 
 * Должен быть ПОСЛЕ всех маршрутов, но ПЕРЕД errorHandler
 */
app.use((req, res, next) => {
    const error = new Error(`Маршрут ${req.originalUrl} не найден`);
    error.statusCode = 404;
    error.isOperational = true; // Помечаем как операционную ошибку
    next(error); // Передаем в errorHandler для логирования
});

/** Глобальный обработчик ошибок
 * 
 * ВАЖНО: Должен быть последним middleware
 */
app.use(errorHandler);

/** Запуск сервера
 * 
 */
const server = app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`Сервер AdNexus запущен`);
    console.log(`Режим: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Порт: ${PORT}`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`Рабочая директория: ${process.cwd()}`);
    console.log(`Логи: ${logsDir}`);
    console.log(`========================================`);
});

async function createInitialAdmin() {
  if (!process.env.ADMIN_USERNAME) return;
  
  const existingAdmin = await User.findByUsername(process.env.ADMIN_USERNAME);
  if (existingAdmin) return;
  
  console.log('Creating initial admin user...');
  
  const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
  await databases.main.run(
    `INSERT INTO users (username, email, password_hash, is_admin, is_moderator) 
     VALUES (?, ?, ?, 1, 1)`,
    [process.env.ADMIN_USERNAME, process.env.ADMIN_EMAIL, hashedPassword]
  );
  
  console.log('✅ Initial admin created');
}

async function startServer() {
    try {
        // Инициализируем базы данных
        await initializeDatabases();
        await createInitialAdmin();

        // Запускаем миграции для новой БД
        const MigrationRunner = require('./migrations/migrationRunner');
        const dbPath = path.join(__dirname, 'adNexus.db'); // общая БД
        const runner = new MigrationRunner(paths.MAIN_DB); // Используем единый путь
        await runner.runMigrations();
        await runner.close();

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

/**
 * Обработка непойманных исключений
 */
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Логируем через наш логгер
    const logger = require('./utils/logger');
    logger.error('Unhandled Rejection', { reason: reason.toString(), stack: reason.stack });
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    const logger = require('./utils/logger');
    logger.error('Uncaught Exception', { message: error.message, stack: error.stack });
    // Завершаем процесс после логирования
    process.exit(1);
});

startServer();

module.exports = app; // Экспорт для тестирования