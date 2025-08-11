// *project*/backend/models/baseModel.js
//  - Базовый класс для всех моделей

const { databases } = require('../config/database');

/**
 * Базовый класс для всех моделей
 * Предоставляет общие методы для работы с БД
 */
class BaseModel {
  /**
   * Получает экземпляр БД для модели
   * @returns {Database}
   */
  static get db() {
    return databases.main;
  }

  /**
   * Выполняет запрос в транзакции
   * @param {Function} callback - Функция с запросами
   * @returns {Promise<any>}
   */
  static async transaction(callback) {
    return this.db.transaction(callback);
  }

  /**
   * Находит запись по ID
   * @param {string} table - Имя таблицы
   * @param {number} id - ID записи
   * @returns {Promise<Object|null>}
   */
  static async findById(table, id) {
    return this.db.get(`SELECT * FROM ${table} WHERE id = ?`, [id]);
  }

  /**
   * Подсчитывает записи
   * @param {string} table - Имя таблицы
   * @param {string} [where] - WHERE условие
   * @param {Array} [params] - Параметры
   * @returns {Promise<number>}
   */
  static async count(table, where = '1=1', params = []) {
    const result = await this.db.get(
      `SELECT COUNT(*) as count FROM ${table} WHERE ${where}`,
      params
    );
    return result.count;
  }
}

module.exports = BaseModel;