const db = require('../config/database');

class Tag {
  static async create(tagData) {
    const { name, category, description } = tagData;
    
    try {
      const result = await db.run(
        `INSERT INTO tags (name, category, description) 
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

  static async findById(id) {
    return db.get('SELECT * FROM tags WHERE id = ?', [id]);
  }

  static async findByName(name) {
    return db.get(
      'SELECT * FROM tags WHERE name = ?', 
      [name.toLowerCase().trim()]
    );
  }

  static async findAll(filters = {}) {
    let query = 'SELECT * FROM tags WHERE 1=1';
    const params = [];

    if (filters.category) {
      query += ' AND category = ?';
      params.push(filters.category);
    }

    if (filters.search) {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    // Сортировка
    if (filters.sort) {
      const [field, order] = filters.sort.split(':');
      const allowedFields = ['name', 'usage_count', 'created_at'];
      const allowedOrder = ['asc', 'desc'];
      
      if (allowedFields.includes(field) && allowedOrder.includes(order)) {
        query += ` ORDER BY ${field} ${order.toUpperCase()}`;
      }
    } else {
      query += ' ORDER BY usage_count DESC, name ASC';
    }

    // Пагинация
    if (filters.limit) {
      const limit = parseInt(filters.limit) || 20;
      const offset = ((parseInt(filters.page) || 1) - 1) * limit;
      query += ` LIMIT ${limit} OFFSET ${offset}`;
    }

    return db.all(query, params);
  }

  static async update(id, updateData) {
    const { name, category, description } = updateData;
    const fields = [];
    const values = [];

    if (name !== undefined) {
      fields.push('name = ?');
      values.push(name.toLowerCase().trim());
    }
    if (category !== undefined) {
      fields.push('category = ?');
      values.push(category);
    }
    if (description !== undefined) {
      fields.push('description = ?');
      values.push(description);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);
    
    try {
      await db.run(
        `UPDATE tags SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
      
      return this.findById(id);
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        throw new Error('Tag with this name already exists');
      }
      throw error;
    }
  }

  static async delete(id) {
    // Проверяем, используется ли тег
    const usageCount = await db.get(
      'SELECT usage_count FROM tags WHERE id = ?',
      [id]
    );

    if (usageCount && usageCount.usage_count > 0) {
      throw new Error('Cannot delete tag that is in use');
    }

    const result = await db.run('DELETE FROM tags WHERE id = ?', [id]);
    return result.changes > 0;
  }

  static async incrementUsage(id) {
    await db.run(
      'UPDATE tags SET usage_count = usage_count + 1 WHERE id = ?',
      [id]
    );
  }

  static async decrementUsage(id) {
    await db.run(
      'UPDATE tags SET usage_count = MAX(0, usage_count - 1) WHERE id = ?',
      [id]
    );
  }

  static async getCategories() {
    const result = await db.all(
      'SELECT DISTINCT category FROM tags WHERE category IS NOT NULL ORDER BY category'
    );
    return result.map(row => row.category);
  }

  static async getPopularTags(limit = 10) {
    return db.all(
      'SELECT * FROM tags ORDER BY usage_count DESC LIMIT ?',
      [limit]
    );
  }

  // Метод для поиска тегов с автодополнением
  static async searchTags(query, limit = 10) {
    return db.all(
      `SELECT id, name, category, usage_count 
       FROM tags 
       WHERE name LIKE ? 
       ORDER BY 
         CASE WHEN name LIKE ? THEN 0 ELSE 1 END,
         usage_count DESC 
       LIMIT ?`,
      [`%${query}%`, `${query}%`, limit]
    );
  }
}

module.exports = Tag;
