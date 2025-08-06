// *project*/backend/migrations/001_create_tags_table.js

/**
 * Создает таблицу тегов
 * @param {import('../migrations/migrationRunner')} db - Экземпляр MigrationRunner
 */
async function up(db) {
  await db.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      category TEXT CHECK(category IN ('interest', 'demographic', 'behavior', 'industry', 'other')),
      description TEXT,
      usage_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  await db.run('CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_tags_usage ON tags(usage_count DESC)');
  
  console.log('Tags table created successfully');
}

/**
 * Откатывает создание таблицы tags
 * @param {import('../migrations/migrationRunner')} db - Экземпляр MigrationRunner
 */
async function down(db) {
  await db.run('DROP TABLE IF EXISTS tags');
  console.log('Tags table dropped');
}

module.exports = { up, down };