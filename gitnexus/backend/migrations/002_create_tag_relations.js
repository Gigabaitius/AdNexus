// *project*/backend/migrations/002_create_tag_relations.js

/**
 * Создает таблицу для связей между тегами
 * @param {import('../migrations/migrationRunner')} db - Экземпляр MigrationRunner
 */
async function up(db) {
  await db.run(`
    CREATE TABLE IF NOT EXISTS tag_relations (
      tag1_id INTEGER NOT NULL,
      tag2_id INTEGER NOT NULL,
      strength DECIMAL(3,2) DEFAULT 0.50,
      relation_type TEXT DEFAULT 'related',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (tag1_id, tag2_id),
      FOREIGN KEY (tag1_id) REFERENCES tags(id) ON DELETE CASCADE,
      FOREIGN KEY (tag2_id) REFERENCES tags(id) ON DELETE CASCADE,
      CHECK (tag1_id < tag2_id)
    )
  `);

  // Индексы для быстрого поиска
  await db.run('CREATE INDEX IF NOT EXISTS idx_tag_relations_tag1 ON tag_relations(tag1_id)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_tag_relations_tag2 ON tag_relations(tag2_id)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_tag_relations_strength ON tag_relations(strength DESC)');

  console.log('Tag relations table created successfully');
}

/**
 * Откатывает создание таблицы tag_relations
 * @param {import('../migrations/migrationRunner')} db - Экземпляр MigrationRunner
 */
async function down(db) {
  await db.run('DROP TABLE IF EXISTS tag_relations');
  console.log('Tag relations table dropped');
}

module.exports = { up, down };