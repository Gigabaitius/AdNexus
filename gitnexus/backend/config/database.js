// *project*/backend/config/database.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const paths = require('./paths');
const logger = require('../utils/logger');


/**
 * Класс-обертка для работы с SQLite
 */
class Database {
  constructor(filename) {
    this.filename = filename;
    this.db = null;
  }

  /**
   * Открывает соединение с БД
   * @returns {Promise<void>}
   */
  open() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.filename, (err) => {
        if (err) {
          logger.error('Error opening database:', err);
          reject(err);
        } else {
          logger.info(`Connected to SQLite database: ${this.filename}`);
          // Включаем foreign keys
          this.db.run('PRAGMA foreign_keys = ON');
          resolve();
        }
      });
    });
  }

  /**
   * Выполняет SELECT и возвращает все строки
   * @param {string} sql - SQL запрос
   * @param {Array} params - Параметры
   * @returns {Promise<Array>}
   */
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          logger.error('Database query error:', { sql, params, error: err });
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Выполняет SELECT и возвращает одну строку
   * @param {string} sql - SQL запрос
   * @param {Array} params - Параметры
   * @returns {Promise<Object|undefined>}
   */
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          logger.error('Database query error:', { sql, params, error: err });
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Выполняет INSERT, UPDATE или DELETE
   * @param {string} sql - SQL запрос
   * @param {Array} params - Параметры
   * @returns {Promise<{lastID: number, changes: number}>}
   */
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          logger.error('Database query error:', { sql, params, error: err });
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  /**
   * Закрывает соединение
   * @returns {Promise<void>}
   */
  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

// все в одной БД
const databases = {
  main: new Database(paths.MAIN_DB)
};

/**
 * Инициализирует все базы данных
 * @returns {Promise<void>}
 */
async function initializeDatabases() {
  for (const [name, db] of Object.entries(databases)) {
    await db.open();
  }
}

module.exports = { 
  databases, 
  initializeDatabases 
};