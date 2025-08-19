/**
 * *project*\backend/utils/logger.js
 * Простой логгер для приложения
 */

const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '..', 'logs');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  getTimestamp() {
    return new Date().toISOString();
  }

  formatMessage(level, message, meta = {}) {
    return JSON.stringify({
      timestamp: this.getTimestamp(),
      level,
      message,
      ...meta
    }) + '\n';
  }

  writeToFile(filename, content) {
    const filePath = path.join(this.logDir, filename);
    fs.appendFileSync(filePath, content);
  }

  log(level, message, meta = {}) {
    const formattedMessage = this.formatMessage(level, message, meta);
    
    // Выводим в консоль
    console.log(`[${level.toUpperCase()}] ${message}`, meta);
    
    // Записываем в файл
    const date = new Date().toISOString().split('T')[0];
    this.writeToFile(`app-${date}.log`, formattedMessage);
    
    // Критические ошибки в отдельный файл
    if (level === 'error') {
      this.writeToFile(`error-${date}.log`, formattedMessage);
    }
  }

  info(message, meta) {
    this.log('info', message, meta);
  }

  warn(message, meta) {
    this.log('warn', message, meta);
  }

  error(message, meta) {
    this.log('error', message, meta);
  }

  debug(message, meta) {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, meta);
    }
  }

  // Логирование производительности
  performance(operation, duration, meta = {}) {
    this.info(`Performance: ${operation}`, {
      duration_ms: duration,
      ...meta
    });
  }

  // Логирование API запросов
  apiRequest(method, path, statusCode, duration, meta = {}) {
    this.info('API Request', {
      method,
      path,
      statusCode,
      duration_ms: duration,
      ...meta
    });
  }
}

module.exports = new Logger();