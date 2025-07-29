// config/database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('../utils/logger');

// Определяем пути к базам данных
const DB_PATHS = {
  users: path.join(__dirname, '../db', 'users.db'),
  campaigns: path.join(__dirname, '../db', 'adCampaigns.db'),
  main: path.join(__dirname, '../db', 'adNexus.db') // Новая общая БД для остальных сущностей
};

class Database {
  constructor(dbPath) {
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        logger.error('Error opening database:', err);
      } else {
        logger.info(`Connected to SQLite database: ${dbPath}`);
        // Включаем foreign keys
        this.db.run('PRAGMA foreign_keys = ON');
      }
    });
  }

  /**
   * Выполняет SELECT запрос и возвращает все строки
   * @param {string} sql - SQL запрос
   * @param {Array} params - Параметры запроса
   * @returns {Promise<Array>} Массив строк
   */
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          logger.error('Database query error:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Выполняет SELECT запрос и возвращает одну строку
   * @param {string} sql - SQL запрос
   * @param {Array} params - Параметры запроса
   * @returns {Promise<Object>} Объект строки или undefined
   */
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          logger.error('Database query error:', err);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Выполняет INSERT, UPDATE или DELETE запрос
   * @param {string} sql - SQL запрос
   * @param {Array} params - Параметры запроса
   * @returns {Promise<Object>} Объект с lastID и changes
   */
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          logger.error('Database query error:', err);
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  /**
   * Закрывает соединение с БД
   * @returns {Promise<void>}
   */
  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

// Создаем экземпляр для основной БД (где будут храниться теги и другие новые сущности)
const mainDb = new Database(DB_PATHS.main);

// Экспортируем для использования в моделях
module.exports = mainDb;

// Также экспортируем класс и пути для создания других подключений при необходимости
module.exports.Database = Database;
module.exports.DB_PATHS = DB_PATHS;