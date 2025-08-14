// migrations/001_create_campaigns_table.js

/**
 * Создает таблицу для рекламных кампаний
 * @param {import('./migrationRunner')} db - Экземпляр MigrationRunner
 */
async function up(db) {
  console.log('Creating campaigns table...');
  
  // Основная таблица кампаний
  await db.run(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      objective TEXT CHECK(objective IN ('brand_awareness', 'traffic', 'conversions', 'engagement')),
      target_audience TEXT, -- JSON stored as TEXT
      budget_total DECIMAL(10,2) NOT NULL,
      budget_daily DECIMAL(10,2),
      budget_spent DECIMAL(10,2) DEFAULT 0.00,
      currency TEXT DEFAULT 'USD',
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'pending_approval', 'active', 'paused', 'completed', 'rejected')),
      approval_status TEXT DEFAULT 'pending' CHECK(approval_status IN ('pending', 'approved', 'rejected')),
      approval_notes TEXT,
      approved_by INTEGER,
      approved_at DATETIME,
      performance_metrics TEXT DEFAULT '{}', -- JSON
      creative_assets TEXT DEFAULT '[]', -- JSON
      landing_url TEXT,
      utm_parameters TEXT, -- JSON
      ai_generated BOOLEAN DEFAULT 0,
      ai_generation_data TEXT, -- JSON
      visibility TEXT DEFAULT 'public' CHECK(visibility IN ('public', 'private', 'unlisted')),
      is_featured BOOLEAN DEFAULT 0,
      featured_until DATETIME,
      completion_rate DECIMAL(5,2) DEFAULT 0.00,
      quality_score DECIMAL(3,2),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      launched_at DATETIME,
      completed_at DATETIME,
      deleted_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Индексы для производительности
  await db.run('CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_campaigns_approval_status ON campaigns(approval_status)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON campaigns(start_date, end_date)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_campaigns_deleted ON campaigns(deleted_at)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_campaigns_featured ON campaigns(is_featured, featured_until)');

  // Триггер для автоматического обновления updated_at
  await db.run(`
    CREATE TRIGGER IF NOT EXISTS update_campaigns_timestamp 
    AFTER UPDATE ON campaigns
    BEGIN
      UPDATE campaigns SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `);

  // Виртуальная колонка для budget_remaining (SQLite 3.31.0+)
  // Если версия SQLite не поддерживает, можно вычислять в запросах
  try {
    await db.run(`
      ALTER TABLE campaigns 
      ADD COLUMN budget_remaining DECIMAL(10,2) 
      GENERATED ALWAYS AS (budget_total - budget_spent) VIRTUAL
    `);
  } catch (error) {
    console.log('Note: Virtual column not supported, will calculate in queries');
  }

  console.log('✅ Campaigns table created successfully');
}

/**
 * Откатывает создание таблицы campaigns
 * @param {import('./migrationRunner')} db - Экземпляр MigrationRunner
 */
async function down(db) {
  // Удаляем триггер
  await db.run('DROP TRIGGER IF EXISTS update_campaigns_timestamp');
  
  // Удаляем индексы
  await db.run('DROP INDEX IF EXISTS idx_campaigns_user_id');
  await db.run('DROP INDEX IF EXISTS idx_campaigns_status');
  await db.run('DROP INDEX IF EXISTS idx_campaigns_approval_status');
  await db.run('DROP INDEX IF EXISTS idx_campaigns_dates');
  await db.run('DROP INDEX IF EXISTS idx_campaigns_deleted');
  await db.run('DROP INDEX IF EXISTS idx_campaigns_featured');
  
  // Удаляем таблицу
  await db.run('DROP TABLE IF EXISTS campaigns');
  
  console.log('✅ Campaigns table dropped');
}

module.exports = { up, down };