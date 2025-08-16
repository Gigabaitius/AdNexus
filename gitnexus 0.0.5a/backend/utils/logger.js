// *project*/backend/utils/logger.js
/**
 * @fileoverview Конфигурация Winston логгера для записи ошибок
 * @module utils/logger
 */

const winston = require('winston');
const path = require('path'); // Встроенный модуль Node.js для работы с путями

/**
 * Создание экземпляра логгера с настройками
 * @type {winston.Logger}
 */
const logger = winston.createLogger({
    level: 'error',
    format: winston.format.combine(
        winston.format.timestamp(), // Добавляет временную метку к каждой записи
        winston.format.errors({ stack: true }), // Включает stack trace для ошибок
        winston.format.json() // Форматирует вывод в JSON
    ),
    transports: [
        // Транспорт для записи в файл
        new winston.transports.File({ 
            filename: path.join(__dirname, '../logs/error.log'), // Абсолютный путь к файлу логов
            level: 'error' 
        }),
        // Транспорт для вывода в консоль (только для разработки)
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(), // Цветной вывод в консоль
                winston.format.simple() // Простой формат для читаемости
            )
        })
    ]
});

module.exports = logger;