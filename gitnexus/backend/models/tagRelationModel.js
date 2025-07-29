// models/tagRelationsModel.js
const db = require('../config/database');

class TagRelation {
  /**
   * Создает связь между двумя тегами
   * @param {number} tagId1 - ID первого тега
   * @param {number} tagId2 - ID второго тега
   * @param {number} strength - Сила связи (0-1)
   * @param {string} relationType - Тип связи ('similar', 'parent', 'related')
   * @returns {Promise<Object>} Созданная связь
   */
  static async create(tagId1, tagId2, strength = 0.5, relationType = 'related') {
    // Всегда сохраняем меньший ID первым для избежания дубликатов
    const [tag1, tag2] = tagId1 < tagId2 ? [tagId1, tagId2] : [tagId2, tagId1];
    
    const result = await db.run(
      `INSERT INTO tag_relations (tag1_id, tag2_id, strength, relation_type)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(tag1_id, tag2_id) 
       DO UPDATE SET strength = ?, relation_type = ?`,
      [tag1, tag2, strength, relationType, strength, relationType]
    );
    
    return this.findRelation(tag1, tag2);
  }

  /**
   * Находит связь между двумя тегами
   * @param {number} tagId1 - ID первого тега
   * @param {number} tagId2 - ID второго тега
   * @returns {Promise<Object|null>} Связь или null
   */
  static async findRelation(tagId1, tagId2) {
    const [tag1, tag2] = tagId1 < tagId2 ? [tagId1, tagId2] : [tagId2, tagId1];
    
    return db.get(
      'SELECT * FROM tag_relations WHERE tag1_id = ? AND tag2_id = ?',
      [tag1, tag2]
    );
  }

  /**
   * Получает все связанные теги для указанного тега
   * @param {number} tagId - ID тега
   * @param {Object} options - Опции фильтрации
   * @returns {Promise<Array>} Массив связанных тегов
   */
  static async getRelatedTags(tagId, options = {}) {
    const { limit = 10, minStrength = 0.3, relationType } = options;
    
    let query = `
      SELECT 
        t.id, t.name, t.category, t.usage_count,
        tr.strength, tr.relation_type
      FROM tag_relations tr
      JOIN tags t ON (
        CASE 
          WHEN tr.tag1_id = ? THEN tr.tag2_id 
          ELSE tr.tag1_id 
        END = t.id
      )
      WHERE (tr.tag1_id = ? OR tr.tag2_id = ?)
      AND tr.strength >= ?
    `;
    
    const params = [tagId, tagId, tagId, minStrength];
    
    if (relationType) {
      query += ' AND tr.relation_type = ?';
      params.push(relationType);
    }
    
    query += ' ORDER BY tr.strength DESC, t.usage_count DESC LIMIT ?';
    params.push(limit);
    
    return db.all(query, params);
  }

  /**
   * Автоматически определяет связи на основе совместного использования
   * @param {number} minCoOccurrence - Минимальное количество совместных использований
   * @returns {Promise<number>} Количество созданных связей
   */
  static async generateRelationsFromUsage(minCoOccurrence = 5) {
    // Это пример запроса для campaign_tags
    // Позже добавим аналогичную логику для platform_tags
    const coOccurrences = await db.all(`
      SELECT 
        ct1.tag_id as tag1_id,
        ct2.tag_id as tag2_id,
        COUNT(*) as count
      FROM campaign_tags ct1
      JOIN campaign_tags ct2 ON ct1.campaign_id = ct2.campaign_id
      WHERE ct1.tag_id < ct2.tag_id
      GROUP BY ct1.tag_id, ct2.tag_id
      HAVING COUNT(*) >= ?
    `, [minCoOccurrence]);
    
    let created = 0;
    for (const pair of coOccurrences) {
      // Нормализуем силу связи (0-1) на основе частоты
      const strength = Math.min(pair.count / 50, 1); // 50 совместных использований = максимальная сила
      await this.create(pair.tag1_id, pair.tag2_id, strength, 'similar');
      created++;
    }
    
    return created;
  }
}

module.exports = TagRelation;