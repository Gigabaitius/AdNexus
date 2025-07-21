// В файле utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'error',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' })  // Запись в файл error.log
  ]
});

module.exports = logger;