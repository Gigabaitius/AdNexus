// migrations/002_create_platforms_table.js

/**
 * Создает таблицу для рекламных кампаний
 * @param {import('./migrationRunner')} db - Экземпляр MigrationRunner
 */
async function up(db) {
  console.log('Creating platforms table...');
  
  // Основная таблица кампаний
  await db.run(`
    CREATE TABLE IF NOT EXISTS adPlatforms (
    -- Основные поля
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('website', 'telegram_channel', 'telegram_group', 'instagram', 'youtube', 'tiktok', 'facebook', 'vk', 'email_newsletter', 'mobile_app', 'podcast', 'other')),
    url TEXT NOT NULL,
    description TEXT,
    -- Аудитория
    audience_size INTEGER DEFAULT 0 CHECK(audience_size >= 0),
    audience_demographics TEXT DEFAULT '{}', -- JSON string
    -- Ценообразование
    pricing_model TEXT NOT NULL CHECK(pricing_model IN ('cpm', 'cpc', 'cpa', 'flat_rate', 'hybrid')),
    pricing TEXT DEFAULT '{}', -- JSON string с ценами
    currency TEXT DEFAULT 'USD' CHECK(currency IN ('USD', 'EUR', 'RUB', 'GBP')),
    -- Статусы
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'pending_review', 'active', 'paused', 'suspended', 'rejected', 'archived')),
    moderation_status TEXT DEFAULT 'pending' CHECK(moderation_status IN ('pending', 'approved', 'rejected', 'requires_changes')),
    verification_status TEXT DEFAULT 'unverified' CHECK(verification_status IN ('unverified', 'pending', 'verified', 'failed', 'expired')),
    -- Метрики
    rating REAL DEFAULT 0.0 CHECK(rating >= 0.0 AND rating <= 5.0),
    quality_score REAL DEFAULT 0.0 CHECK(quality_score >= 0.0 AND quality_score <= 10.0),
    -- Метаданные
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    -- Foreign key constraint
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Индексы для производительности
  await db.run('CREATE INDEX IF NOT EXISTS idx_adPlatforms_user_id ON adPlatforms(user_id)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_adPlatforms_status ON adPlatforms(status)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_adPlatforms_type ON adPlatforms(type)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_adPlatforms_verification_status ON adPlatforms(verification_status)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_adPlatforms_rating ON adPlatforms(rating)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_adPlatforms_user_status ON adPlatforms(user_id, status)');

  // Триггер для автоматического обновления updated_at
  await db.run(`
    CREATE TRIGGER update_adPlatforms_updated_at 
    AFTER UPDATE ON adPlatforms
    BEGIN
      UPDATE adPlatforms SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `);

  console.log('✅ Platforms table created successfully');
}

/**
 * Откатывает создание таблицы adPlatforms
 * @param {import('./migrationRunner')} db - Экземпляр MigrationRunner
 */
async function down(db) {
  // Удаляем триггер
  await db.run('DROP TRIGGER IF EXISTS update_adPlatforms_updated_at');
  
  // Удаляем индексы
  await db.run('DROP INDEX IF NOT EXISTS idx_adPlatforms_user_id ON adPlatforms(user_id)');
  await db.run('DROP INDEX IF NOT EXISTS idx_adPlatforms_status ON adPlatforms(status)');
  await db.run('DROP INDEX IF NOT EXISTS idx_adPlatforms_type ON adPlatforms(type)');
  await db.run('DROP INDEX IF NOT EXISTS idx_adPlatforms_verification_status ON adPlatforms(verification_status)');
  await db.run('DROP INDEX IF NOT EXISTS idx_adPlatforms_rating ON adPlatforms(rating)');
  await db.run('DROP INDEX IF NOT EXISTS idx_adPlatforms_user_status ON adPlatforms(user_id, status)');
  
  // Удаляем таблицу
  await db.run('DROP TABLE IF EXISTS adPlatforms');
  
  console.log('✅ adPlatforms table dropped');
}

module.exports = { up, down };