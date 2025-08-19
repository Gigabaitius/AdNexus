/**
 * *project*\backend/models/BaseModel.js
 * Базовый класс для всех моделей
 */

const db = require('../config/database');
const { DatabaseError, NotFoundError, ValidationError } = require('../utils/errors');

class BaseModel {
  static db = db;
  static tableName = null;

  /**
   * Выполняет транзакцию
   * @param {Function} callback - Функция с операциями транзакции
   * @returns {Promise<any>} Результат транзакции
   */
  static async transaction(callback) {
    await this.db.run('BEGIN TRANSACTION');
    try {
      const result = await callback();
      await this.db.run('COMMIT');
      return result;
    } catch (error) {
      await this.db.run('ROLLBACK');
      throw error;
    }
  }

  /**
   * Безопасное выполнение запроса с обработкой ошибок
   * @param {string} method - Метод БД (get, all, run)
   * @param {string} query - SQL запрос
   * @param {Array} params - Параметры запроса
   * @returns {Promise<any>} Результат запроса
   */
  static async safeQuery(method, query, params = []) {
    try {
      return await this.db[method](query, params);
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        throw new ValidationError('Database constraint violation', {
          code: error.code,
          constraint: error.message
        });
      }
      throw new DatabaseError(`Database operation failed: ${error.message}`, {
        query,
        method,
        originalError: error
      });
    }
  }

  /**
   * Находит запись по ID
   * @param {number} id - ID записи
   * @returns {Promise<Object|null>} Найденная запись
   */
  static async findById(id) {
    const query = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    return await this.safeQuery('get', query, [id]);
  }

  /**
   * Находит все записи с пагинацией
   * @param {Object} options - Опции поиска
   * @returns {Promise<Object>} Результаты с метаданными
   */
  static async findAll(options = {}) {
    const {
      page = 1,
      limit = 20,
      where = {},
      orderBy = 'created_at',
      orderDir = 'DESC'
    } = options;

    const offset = (page - 1) * limit;
    
    // Построение WHERE условий
    const whereConditions = [];
    const whereParams = [];
    
    Object.entries(where).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        whereConditions.push(`${key} = ?`);
        whereParams.push(value);
      }
    });

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // Получаем общее количество
    const countQuery = `SELECT COUNT(*) as total FROM ${this.tableName} ${whereClause}`;
    const { total } = await this.safeQuery('get', countQuery, whereParams);

    // Получаем данные
    const dataQuery = `
      SELECT * FROM ${this.tableName} 
      ${whereClause}
      ORDER BY ${orderBy} ${orderDir}
      LIMIT ? OFFSET ?
    `;
    
    const data = await this.safeQuery('all', dataQuery, [...whereParams, limit, offset]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Создает новую запись
   * @param {Object} data - Данные для создания
   * @returns {Promise<Object>} Созданная запись
   */
  static async create(data) {
    const fields = Object.keys(data);
    const placeholders = fields.map(() => '?').join(', ');
    const values = Object.values(data);

    const query = `
      INSERT INTO ${this.tableName} (${fields.join(', ')})
      VALUES (${placeholders})
    `;

    const result = await this.safeQuery('run', query, values);
    
    if (result.lastID) {
      return await this.findById(result.lastID);
    }
    
    throw new DatabaseError('Failed to create record');
  }

  /**
   * Обновляет запись
   * @param {number} id - ID записи
   * @param {Object} updates - Обновляемые поля
   * @returns {Promise<Object>} Обновленная запись
   */
  static async update(id, updates) {
    const fields = Object.keys(updates);
    if (fields.length === 0) {
      throw new ValidationError('No fields to update');
    }

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = [...Object.values(updates), id];

    const query = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
    const result = await this.safeQuery('run', query, values);

    if (result.changes === 0) {
      throw new NotFoundError(`${this.tableName} record not found`);
    }

    return await this.findById(id);
  }

  /**
   * Удаляет запись
   * @param {number} id - ID записи
   * @returns {Promise<boolean>} Успешность удаления
   */
  static async delete(id) {
    const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
    const result = await this.safeQuery('run', query, [id]);
    
    if (result.changes === 0) {
      throw new NotFoundError(`${this.tableName} record not found`);
    }
    
    return true;
  }

  /**
   * Мягкое удаление записи
   * @param {number} id - ID записи
   * @returns {Promise<boolean>} Успешность удаления
   */
  static async softDelete(id) {
    return await this.update(id, { deleted_at: new Date().toISOString() });
  }

  /**
   * Подсчитывает записи
   * @param {Object} where - Условия WHERE
   * @returns {Promise<number>} Количество записей
   */
  static async count(where = {}) {
    const whereConditions = [];
    const whereParams = [];
    
    Object.entries(where).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        whereConditions.push(`${key} = ?`);
        whereParams.push(value);
      }
    });

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    const query = `SELECT COUNT(*) as count FROM ${this.tableName} ${whereClause}`;
    const result = await this.safeQuery('get', query, whereParams);
    
    return result.count;
  }
}

module.exports = BaseModel;