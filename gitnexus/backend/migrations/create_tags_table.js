const db = require('../config/database');

async function up() {
  await db.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      category TEXT,
      description TEXT,
      usage_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Создаем индекс для быстрого поиска
  await db.run('CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_tags_usage ON tags(usage_count DESC)');

  console.log('Tags table created successfully');
}

async function down() {
  await db.run('DROP TABLE IF EXISTS tags');
  console.log('Tags table dropped');
}

module.exports = { up, down };