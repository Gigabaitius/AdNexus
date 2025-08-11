// *project*/backend/models/tagModel.js

const BaseModel = require('./baseModel');

/**
 * Модель для работы с тегами
 * @extends BaseModel
 */
class Tag extends BaseModel {
  static tableName = 'tags';

  /**
   * Создает новый тег
   * @param {Object} tagData - Данные тега
   * @returns {Promise<Object>} Созданный тег
   */
  static async create(tagData) {
    const { name, category, description } = tagData;
    
    try {
      const result = await this.db.run(
        `INSERT INTO ${this.tableName} (name, category, description) 
         VALUES (?, ?, ?)`,
        [name.toLowerCase().trim(), category, description]
      );
      
      return this.findById(result.lastID);
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        throw new Error('Tag with this name already exists');
      }
      throw error;
    }
  }

  /**
   * Находит тег по ID
   * @param {number} id - ID тега
   * @returns {Promise<Object|null>}
   */
  static async findById(id) {
    return super.findById(this.tableName, id);
  }

  /**
   * Находит тег по имени
   * @param {string} name - Имя тега
   * @returns {Promise<Object|null>}
   */
  static async findByName(name) {
    return this.db.get(
      `SELECT * FROM ${this.tableName} WHERE name = ?`, 
      [name.toLowerCase().trim()]
    );
  }

  /**
   * Получает все теги с фильтрацией и пагинацией
   * @param {Object} options - Опции фильтрации
   * @returns {Promise<{data: Array, total: number}>}
   */
  static async findAll(options = {}) {
    const { 
      category, 
      search, 
      sort = 'usage_count:desc', 
      page = 1, 
      limit = 20 
    } = options;

    let whereClause = '1=1';
    const params = [];

    if (category) {
      whereClause += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      whereClause += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Подсчет общего количества
    const total = await this.count(this.tableName, whereClause, params);

    // Получение данных с пагинацией
    const [field, order] = sort.split(':');
    const offset = (page - 1) * limit;
    
    const data = await this.db.all(
      `SELECT * FROM ${this.tableName} 
       WHERE ${whereClause}
       ORDER BY ${field} ${order.toUpperCase()}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { data, total };
  }

  /**
   * Обновляет тег
   * @param {number} id - ID тега
   * @param {Object} updateData - Данные для обновления
   * @returns {Promise<Object>} Обновленный тег
   */
  static async update(id, updateData) {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined && ['name', 'category', 'description'].includes(key)) {
        fields.push(`${key} = ?`);
        values.push(key === 'name' ? value.toLowerCase().trim() : value);
      }
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);
    
    await this.db.run(
      `UPDATE ${this.tableName} SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    return this.findById(id);
  }

  /**
   * Удаляет тег
   * @param {number} id - ID тега
   * @returns {Promise<boolean>} Успешность удаления
   */
  static async delete(id) {
    // Проверяем использование
    const tag = await this.findById(id);
    if (!tag) return false;
    
    if (tag.usage_count > 0) {
      throw new Error('Cannot delete tag that is in use');
    }

    const result = await this.db.run(
      `DELETE FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    
    return result.changes > 0;
  }

  /**
   * Увеличивает счетчик использования
   * @param {number} id - ID тега
   * @returns {Promise<void>}
   */
  static async incrementUsage(id) {
    await this.db.run(
      `UPDATE ${this.tableName} SET usage_count = usage_count + 1 WHERE id = ?`,
      [id]
    );
  }

  /**
   * Уменьшает счетчик использования
   * @param {number} id - ID тега
   * @returns {Promise<void>}
   */
  static async decrementUsage(id) {
    await this.db.run(
      `UPDATE ${this.tableName} SET usage_count = MAX(0, usage_count - 1) WHERE id = ?`,
      [id]
    );
  }
}

module.exports = Tag;