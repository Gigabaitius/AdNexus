// *project*/backend/migrations/003_update_platforms_to_v2.js

/**
 * Обновляет таблицу adPlatforms до версии 2.0
 * Добавляет расширенные поля для детальной информации о площадках
 * @param {import('./migrationRunner')} db - Экземпляр MigrationRunner
 */
async function up(db) {
  console.log('Updating platforms table to v2...');
  
  // Добавляем новые колонки
  const newColumns = [
    // Информация о владельце (денормализация для производительности)
    `ALTER TABLE adPlatforms ADD COLUMN owner_username TEXT`,
    `ALTER TABLE adPlatforms ADD COLUMN owner_verified BOOLEAN DEFAULT FALSE`,
    
    // Расширенная информация о типе
    `ALTER TABLE adPlatforms ADD COLUMN subtype TEXT`,
    `ALTER TABLE adPlatforms ADD COLUMN verification_url TEXT`,
    `ALTER TABLE adPlatforms ADD COLUMN language TEXT DEFAULT 'en'`,
    `ALTER TABLE adPlatforms ADD COLUMN languages_supported TEXT DEFAULT '["en"]'`,
    
    // Детальная статистика аудитории
    `ALTER TABLE adPlatforms ADD COLUMN audience_daily_active INTEGER DEFAULT 0 CHECK(audience_daily_active >= 0)`,
    `ALTER TABLE adPlatforms ADD COLUMN audience_interests TEXT DEFAULT '[]'`,
    `ALTER TABLE adPlatforms ADD COLUMN audience_verified BOOLEAN DEFAULT FALSE`,
    `ALTER TABLE adPlatforms ADD COLUMN audience_last_updated DATETIME`,
    
    // Метрики эффективности
    `ALTER TABLE adPlatforms ADD COLUMN metrics TEXT DEFAULT '{}'`,
    `ALTER TABLE adPlatforms ADD COLUMN historical_performance TEXT DEFAULT '[]'`,
    
    // Расширенное ценообразование
    `ALTER TABLE adPlatforms ADD COLUMN minimum_budget DECIMAL(10,2) DEFAULT 0`,
    `ALTER TABLE adPlatforms ADD COLUMN price_negotiable BOOLEAN DEFAULT FALSE`,
    
    // Форматы рекламы
    `ALTER TABLE adPlatforms ADD COLUMN ad_formats_supported TEXT DEFAULT '[]'`,
    `ALTER TABLE adPlatforms ADD COLUMN ad_specifications TEXT DEFAULT '{}'`,
    `ALTER TABLE adPlatforms ADD COLUMN content_restrictions TEXT DEFAULT '[]'`,
    
    // Расписание и доступность
    `ALTER TABLE adPlatforms ADD COLUMN availability_schedule TEXT DEFAULT '{}'`,
    `ALTER TABLE adPlatforms ADD COLUMN booking_calendar TEXT DEFAULT '[]'`,
    `ALTER TABLE adPlatforms ADD COLUMN advance_booking_days INTEGER DEFAULT 1`,
    
    // Расширенная верификация
    `ALTER TABLE adPlatforms ADD COLUMN verification_method TEXT`,
    `ALTER TABLE adPlatforms ADD COLUMN verification_data TEXT DEFAULT '{}'`,
    `ALTER TABLE adPlatforms ADD COLUMN verification_attempts INTEGER DEFAULT 0`,
    
    // Интеграции
    `ALTER TABLE adPlatforms ADD COLUMN integration_type TEXT`,
    `ALTER TABLE adPlatforms ADD COLUMN integration_settings TEXT DEFAULT '{}'`,
    `ALTER TABLE adPlatforms ADD COLUMN analytics_connected TEXT DEFAULT '{}'`,
    
    // Обновленные метрики качества
    `ALTER TABLE adPlatforms ADD COLUMN trust_score DECIMAL(3,2) DEFAULT 0.00 CHECK(trust_score >= 0.0 AND trust_score <= 10.0)`,
    `ALTER TABLE adPlatforms ADD COLUMN total_reviews INTEGER DEFAULT 0`,
    `ALTER TABLE adPlatforms ADD COLUMN total_campaigns_completed INTEGER DEFAULT 0`,
    `ALTER TABLE adPlatforms ADD COLUMN total_revenue_generated DECIMAL(10,2) DEFAULT 0.00`,
    
    // Связи с кампаниями
    `ALTER TABLE adPlatforms ADD COLUMN active_campaigns_count INTEGER DEFAULT 0`,
    `ALTER TABLE adPlatforms ADD COLUMN total_campaigns_count INTEGER DEFAULT 0`,
    `ALTER TABLE adPlatforms ADD COLUMN last_campaign_date DATETIME`,
    
    // Расширенная модерация
    `ALTER TABLE adPlatforms ADD COLUMN moderation_notes TEXT`,
    `ALTER TABLE adPlatforms ADD COLUMN moderated_by INTEGER`,
    `ALTER TABLE adPlatforms ADD COLUMN moderated_at DATETIME`,
    
    // SEO и поиск
    `ALTER TABLE adPlatforms ADD COLUMN tags_count INTEGER DEFAULT 0`,
    `ALTER TABLE adPlatforms ADD COLUMN primary_category TEXT`,
    `ALTER TABLE adPlatforms ADD COLUMN categories TEXT DEFAULT '[]'`,
    `ALTER TABLE adPlatforms ADD COLUMN keywords TEXT`,
    
    // Фильтрация и категоризация
    `ALTER TABLE adPlatforms ADD COLUMN price_range TEXT DEFAULT 'medium' CHECK(price_range IN ('low', 'medium', 'high', 'premium'))`,
    `ALTER TABLE adPlatforms ADD COLUMN audience_size_range TEXT DEFAULT 'medium' CHECK(audience_size_range IN ('micro', 'small', 'medium', 'large'))`,
    `ALTER TABLE adPlatforms ADD COLUMN engagement_level TEXT DEFAULT 'medium' CHECK(engagement_level IN ('low', 'medium', 'high'))`,
    
    // Дополнительные данные
    `ALTER TABLE adPlatforms ADD COLUMN contact_info TEXT DEFAULT '{}'`,
    `ALTER TABLE adPlatforms ADD COLUMN payment_details TEXT DEFAULT '{}'`,
    `ALTER TABLE adPlatforms ADD COLUMN notes TEXT`,
    `ALTER TABLE adPlatforms ADD COLUMN custom_fields TEXT DEFAULT '{}'`,
    
    // Флаги и настройки
    `ALTER TABLE adPlatforms ADD COLUMN settings TEXT DEFAULT '{}'`,
    `ALTER TABLE adPlatforms ADD COLUMN is_premium BOOLEAN DEFAULT FALSE`,
    `ALTER TABLE adPlatforms ADD COLUMN premium_until DATETIME`,
    `ALTER TABLE adPlatforms ADD COLUMN is_exclusive BOOLEAN DEFAULT FALSE`,
    
    // Синхронизация и логирование
    `ALTER TABLE adPlatforms ADD COLUMN last_error TEXT`,
    `ALTER TABLE adPlatforms ADD COLUMN last_sync_attempt DATETIME`,
    `ALTER TABLE adPlatforms ADD COLUMN sync_status TEXT DEFAULT 'pending' CHECK(sync_status IN ('pending', 'success', 'failed'))`,
    
    // Временные метки
    `ALTER TABLE adPlatforms ADD COLUMN published_at DATETIME`,
    `ALTER TABLE adPlatforms ADD COLUMN last_active_at DATETIME`,
    `ALTER TABLE adPlatforms ADD COLUMN deleted_at DATETIME`
  ];

  // Выполняем добавление колонок
  for (const query of newColumns) {
    await db.run(query);
  }

  // Добавляем foreign key для moderated_by
  await db.run(`
    CREATE TABLE adPlatforms_new (
      -- Основные поля
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      owner_username TEXT,
      owner_verified BOOLEAN DEFAULT FALSE,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('website', 'telegram_channel', 'telegram_group', 'instagram', 'youtube', 'tiktok', 'facebook', 'vk', 'email_newsletter', 'mobile_app', 'podcast', 'other')),
      subtype TEXT,
      url TEXT NOT NULL,
      verification_url TEXT,
      description TEXT,
      language TEXT DEFAULT 'en',
      languages_supported TEXT DEFAULT '["en"]',
      
      -- Аудитория и статистика
      audience_size INTEGER DEFAULT 0 CHECK(audience_size >= 0),
      audience_daily_active INTEGER DEFAULT 0 CHECK(audience_daily_active >= 0),
      audience_demographics TEXT DEFAULT '{}',
      audience_interests TEXT DEFAULT '[]',
      audience_verified BOOLEAN DEFAULT FALSE,
      audience_last_updated DATETIME,
      
      -- Метрики эффективности
      metrics TEXT DEFAULT '{}',
      historical_performance TEXT DEFAULT '[]',
      
      -- Ценообразование
      pricing_model TEXT NOT NULL CHECK(pricing_model IN ('cpm', 'cpc', 'cpa', 'flat_rate', 'hybrid')),
      pricing TEXT DEFAULT '{}',
      minimum_budget DECIMAL(10,2) DEFAULT 0,
      currency TEXT DEFAULT 'USD' CHECK(currency IN ('USD', 'EUR', 'RUB', 'GBP')),
      price_negotiable BOOLEAN DEFAULT FALSE,
      
      -- Форматы рекламы
      ad_formats_supported TEXT DEFAULT '[]',
      ad_specifications TEXT DEFAULT '{}',
      content_restrictions TEXT DEFAULT '[]',
      
      -- Расписание и доступность
      availability_schedule TEXT DEFAULT '{}',
      booking_calendar TEXT DEFAULT '[]',
      advance_booking_days INTEGER DEFAULT 1,
      
      -- Верификация и доверие
      verification_status TEXT DEFAULT 'unverified' CHECK(verification_status IN ('unverified', 'pending', 'verified', 'failed', 'expired')),
      verification_method TEXT,
      verification_data TEXT DEFAULT '{}',
      verification_attempts INTEGER DEFAULT 0,
      
      -- Интеграции
      integration_type TEXT,
      integration_settings TEXT DEFAULT '{}',
      analytics_connected TEXT DEFAULT '{}',
      
      -- Качество и рейтинг
      quality_score REAL DEFAULT 0.0 CHECK(quality_score >= 0.0 AND quality_score <= 10.0),
      trust_score DECIMAL(3,2) DEFAULT 0.00 CHECK(trust_score >= 0.0 AND trust_score <= 10.0),
      rating REAL DEFAULT 0.0 CHECK(rating >= 0.0 AND rating <= 5.0),
      total_reviews INTEGER DEFAULT 0,
      total_campaigns_completed INTEGER DEFAULT 0,
      total_revenue_generated DECIMAL(10,2) DEFAULT 0.00,
      
      -- Связи с кампаниями
      active_campaigns_count INTEGER DEFAULT 0,
      total_campaigns_count INTEGER DEFAULT 0,
      last_campaign_date DATETIME,
      
      -- Статусы и модерация
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'pending_review', 'active', 'paused', 'suspended', 'rejected', 'archived')),
      moderation_status TEXT DEFAULT 'pending' CHECK(moderation_status IN ('pending', 'approved', 'rejected', 'requires_changes')),
      moderation_notes TEXT,
      moderated_by INTEGER,
      moderated_at DATETIME,
      
      -- SEO и поиск
      tags_count INTEGER DEFAULT 0,
      primary_category TEXT,
      categories TEXT DEFAULT '[]',
      keywords TEXT,
      
      -- Фильтрация и категоризация
      price_range TEXT DEFAULT 'medium' CHECK(price_range IN ('low', 'medium', 'high', 'premium')),
      audience_size_range TEXT DEFAULT 'medium' CHECK(audience_size_range IN ('micro', 'small', 'medium', 'large')),
      engagement_level TEXT DEFAULT 'medium' CHECK(engagement_level IN ('low', 'medium', 'high')),
      
      -- Дополнительные данные
      contact_info TEXT DEFAULT '{}',
      payment_details TEXT DEFAULT '{}',
      notes TEXT,
      custom_fields TEXT DEFAULT '{}',
      
      -- Флаги и настройки
      settings TEXT DEFAULT '{}',
      is_premium BOOLEAN DEFAULT FALSE,
      premium_until DATETIME,
      is_exclusive BOOLEAN DEFAULT FALSE,
      
      -- Синхронизация и логирование
      last_error TEXT,
      last_sync_attempt DATETIME,
      sync_status TEXT DEFAULT 'pending' CHECK(sync_status IN ('pending', 'success', 'failed')),
      
      -- Временные метки
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      published_at DATETIME,
      last_active_at DATETIME,
      deleted_at DATETIME,
      
      -- Foreign key constraints
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (moderated_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Копируем существующие данные
  await db.run(`
    INSERT INTO adPlatforms_new (
      id, user_id, name, type, url, description,
      audience_size, audience_demographics,
      pricing_model, pricing, currency,
      status, moderation_status, verification_status,
      rating, quality_score,
      created_at, updated_at
    )
    SELECT 
      id, user_id, name, type, url, description,
      audience_size, audience_demographics,
      pricing_model, pricing, currency,
      status, moderation_status, verification_status,
      rating, quality_score,
      created_at, updated_at
    FROM adPlatforms
  `);

  // Заполняем денормализованные данные владельцев
  await db.run(`
    UPDATE adPlatforms_new
    SET owner_username = (
      SELECT username FROM users WHERE users.id = adPlatforms_new.user_id
    )
  `);

  // Заполняем диапазоны размеров аудитории
  await db.run(`
    UPDATE adPlatforms_new
    SET audience_size_range = CASE
      WHEN audience_size < 1000 THEN 'micro'
      WHEN audience_size < 10000 THEN 'small'
      WHEN audience_size < 100000 THEN 'medium'
      ELSE 'large'
    END
  `);

  // Удаляем старую таблицу и переименовываем новую
  await db.run('DROP TABLE adPlatforms');
  await db.run('ALTER TABLE adPlatforms_new RENAME TO adPlatforms');

  // Создаем новые индексы
  const newIndexes = [
    'CREATE INDEX IF NOT EXISTS idx_adPlatforms_owner_username ON adPlatforms(owner_username)',
    'CREATE INDEX IF NOT EXISTS idx_adPlatforms_subtype ON adPlatforms(subtype)',
    'CREATE INDEX IF NOT EXISTS idx_adPlatforms_language ON adPlatforms(language)',
    'CREATE INDEX IF NOT EXISTS idx_adPlatforms_price_range ON adPlatforms(price_range)',
    'CREATE INDEX IF NOT EXISTS idx_adPlatforms_audience_size_range ON adPlatforms(audience_size_range)',
    'CREATE INDEX IF NOT EXISTS idx_adPlatforms_primary_category ON adPlatforms(primary_category)',
    'CREATE INDEX IF NOT EXISTS idx_adPlatforms_quality_score ON adPlatforms(quality_score)',
    'CREATE INDEX IF NOT EXISTS idx_adPlatforms_trust_score ON adPlatforms(trust_score)',
    'CREATE INDEX IF NOT EXISTS idx_adPlatforms_is_premium ON adPlatforms(is_premium)',
    'CREATE INDEX IF NOT EXISTS idx_adPlatforms_deleted_at ON adPlatforms(deleted_at)',
    'CREATE INDEX IF NOT EXISTS idx_adPlatforms_published_at ON adPlatforms(published_at)',
    'CREATE INDEX IF NOT EXISTS idx_adPlatforms_moderation_composite ON adPlatforms(status, moderation_status)',
    'CREATE INDEX IF NOT EXISTS idx_adPlatforms_active_premium ON adPlatforms(status, is_premium) WHERE status = "active"',
    'CREATE INDEX IF NOT EXISTS idx_adPlatforms_user_active ON adPlatforms(user_id, status) WHERE deleted_at IS NULL'
  ];

  for (const indexQuery of newIndexes) {
    await db.run(indexQuery);
  }

  // Создаем полнотекстовый индекс (виртуальная таблица для FTS5)
  await db.run(`
    CREATE VIRTUAL TABLE IF NOT EXISTS adPlatforms_fts USING fts5(
      name,
      description,
      keywords,
      content=adPlatforms,
      content_rowid=id
    )
  `);

  // Заполняем FTS таблицу существующими данными
  await db.run(`
    INSERT INTO adPlatforms_fts(rowid, name, description, keywords)
    SELECT id, name, description, '' FROM adPlatforms
  `);

  // Создаем триггеры для синхронизации FTS
  await db.run(`
    CREATE TRIGGER adPlatforms_fts_insert AFTER INSERT ON adPlatforms BEGIN
      INSERT INTO adPlatforms_fts(rowid, name, description, keywords)
      VALUES (new.id, new.name, new.description, new.keywords);
    END
  `);

  await db.run(`
    CREATE TRIGGER adPlatforms_fts_update AFTER UPDATE ON adPlatforms BEGIN
      UPDATE adPlatforms_fts
      SET name = new.name, description = new.description, keywords = new.keywords
      WHERE rowid = new.id;
    END
  `);

  await db.run(`
    CREATE TRIGGER adPlatforms_fts_delete AFTER DELETE ON adPlatforms BEGIN
      DELETE FROM adPlatforms_fts WHERE rowid = old.id;
    END
  `);

  // Обновляем существующий триггер updated_at для новых полей
  await db.run('DROP TRIGGER IF EXISTS update_adPlatforms_updated_at');
  await db.run(`
    CREATE TRIGGER update_adPlatforms_updated_at 
    AFTER UPDATE ON adPlatforms
    BEGIN
      UPDATE adPlatforms SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `);

    // Создаем таблицу связи кампаний и площадок
  await db.run(`
    CREATE TABLE IF NOT EXISTS campaign_platforms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL,
      platform_id INTEGER NOT NULL,
      
      -- Статус размещения
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'active', 'paused', 'completed', 'cancelled', 'rejected')),
      
      -- Даты размещения
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      actual_start_date DATE,
      actual_end_date DATE,
      
      -- Финансы
      agreed_price DECIMAL(10,2) NOT NULL,
      pricing_model TEXT NOT NULL CHECK(pricing_model IN ('cpm', 'cpc', 'cpa', 'flat_rate', 'hybrid')),
      pricing_details TEXT DEFAULT '{}', -- JSON с деталями цены
      currency TEXT DEFAULT 'USD',
      paid_amount DECIMAL(10,2) DEFAULT 0,
      payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'partial', 'paid', 'refunded')),
      
      -- Метрики производительности
      impressions INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      conversions INTEGER DEFAULT 0,
      spent_amount DECIMAL(10,2) DEFAULT 0,
      
      -- Настройки размещения
      ad_format TEXT, -- 'banner', 'native', 'video', etc.
      ad_content TEXT DEFAULT '{}', -- JSON с контентом рекламы
      targeting_settings TEXT DEFAULT '{}', -- JSON с настройками таргетинга
      
      -- Модерация
      platform_approved BOOLEAN DEFAULT FALSE,
      platform_approved_at DATETIME,
      platform_approved_by INTEGER,
      rejection_reason TEXT,
      
      -- Метаданные
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER NOT NULL,
      
      -- Уникальность - одна кампания не может дважды размещаться на одной площадке в одно время
      UNIQUE(campaign_id, platform_id, start_date, end_date),
      
      -- Foreign keys
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (platform_id) REFERENCES adPlatforms(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (platform_approved_by) REFERENCES users(id)
    )
  `);

  // Создаем индексы для campaign_platforms
  await db.run('CREATE INDEX IF NOT EXISTS idx_campaign_platforms_campaign ON campaign_platforms(campaign_id)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_campaign_platforms_platform ON campaign_platforms(platform_id)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_campaign_platforms_status ON campaign_platforms(status)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_campaign_platforms_dates ON campaign_platforms(start_date, end_date)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_campaign_platforms_payment ON campaign_platforms(payment_status)');

  // Триггер для обновления updated_at
  await db.run(`
    CREATE TRIGGER update_campaign_platforms_updated_at 
    AFTER UPDATE ON campaign_platforms
    BEGIN
      UPDATE campaign_platforms SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `);

  // Представление для активных размещений
  await db.run(`
    CREATE VIEW IF NOT EXISTS active_campaign_placements AS
    SELECT 
      cp.*,
      c.title as campaign_title,
      c.budget as campaign_budget,
      c.status as campaign_status,
      p.name as platform_name,
      p.type as platform_type,
      p.url as platform_url,
      p.audience_size as platform_audience,
      u1.username as advertiser_username,
      u2.username as platform_owner_username
    FROM campaign_platforms cp
    JOIN campaigns c ON cp.campaign_id = c.id
    JOIN adPlatforms p ON cp.platform_id = p.id
    JOIN users u1 ON c.user_id = u1.id
    JOIN users u2 ON p.user_id = u2.id
    WHERE cp.status = 'active'
      AND date('now') BETWEEN cp.start_date AND cp.end_date
  `);

  // Создаем триггер для автоматического обновления счетчиков кампаний
  await db.run(`
    CREATE TRIGGER update_platform_campaign_counts
    AFTER INSERT ON campaign_platforms
    BEGIN
      UPDATE adPlatforms
      SET 
        total_campaigns_count = total_campaigns_count + 1,
        active_campaigns_count = active_campaigns_count + 
          CASE WHEN (SELECT status FROM campaigns WHERE id = NEW.campaign_id) = 'active' THEN 1 ELSE 0 END,
        last_campaign_date = CURRENT_TIMESTAMP
      WHERE id = NEW.platform_id;
    END
  `);

  // Создаем триггер для обновления published_at при первой публикации
  await db.run(`
    CREATE TRIGGER set_platform_published_at
    AFTER UPDATE OF status ON adPlatforms
    WHEN NEW.status = 'active' AND OLD.status != 'active' AND NEW.published_at IS NULL
    BEGIN
      UPDATE adPlatforms SET published_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `);

  // Создаем триггер для автоматического расчета price_range
  await db.run(`
    CREATE TRIGGER update_platform_price_range
    AFTER UPDATE OF pricing ON adPlatforms
    BEGIN
      UPDATE adPlatforms
      SET price_range = CASE
        WHEN json_extract(NEW.pricing, '$.cpm') < 5 OR 
             json_extract(NEW.pricing, '$.flat_daily') < 50 THEN 'low'
        WHEN json_extract(NEW.pricing, '$.cpm') > 50 OR 
             json_extract(NEW.pricing, '$.flat_daily') > 500 THEN 'premium'
        WHEN json_extract(NEW.pricing, '$.cpm') > 20 OR 
             json_extract(NEW.pricing, '$.flat_daily') > 200 THEN 'high'
        ELSE 'medium'
      END
      WHERE id = NEW.id;
    END
  `);

  // Создаем представление для часто используемых запросов
  await db.run(`
    CREATE VIEW IF NOT EXISTS active_verified_platforms AS
    SELECT 
      p.*,
      u.username as owner_username,
      u.email as owner_email,
      (SELECT COUNT(*) FROM campaign_platforms cp WHERE cp.platform_id = p.id) as total_bookings
    FROM adPlatforms p
    JOIN users u ON p.user_id = u.id
    WHERE p.status = 'active' 
      AND p.moderation_status = 'approved'
      AND p.deleted_at IS NULL
      AND p.verification_status = 'verified'
  `);

  // Создаем представление для статистики
  await db.run(`
    CREATE VIEW IF NOT EXISTS platform_statistics AS
    SELECT 
      COUNT(*) as total_platforms,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active_platforms,
      COUNT(CASE WHEN verification_status = 'verified' THEN 1 END) as verified_platforms,
      COUNT(CASE WHEN is_premium = 1 THEN 1 END) as premium_platforms,
      AVG(rating) as average_rating,
      AVG(quality_score) as average_quality_score,
      AVG(trust_score) as average_trust_score,
      SUM(audience_size) as total_audience_reach,
      SUM(total_revenue_generated) as total_platform_revenue
    FROM adPlatforms
    WHERE deleted_at IS NULL
  `);

  console.log('✅ Platforms table updated to v2 successfully');
}

/**
 * Откатывает обновление таблицы adPlatforms до версии 1
 * @param {import('./migrationRunner')} db - Экземпляр MigrationRunner
 */
async function down(db) {
  console.log('Rolling back platforms table from v2 to v1...');

   // Удаляем представление активных размещений
  await db.run('DROP VIEW IF EXISTS active_campaign_placements');
  
  // Удаляем триггер campaign_platforms
  await db.run('DROP TRIGGER IF EXISTS update_campaign_platforms_updated_at');
  
  // Удаляем индексы campaign_platforms
  await db.run('DROP INDEX IF EXISTS idx_campaign_platforms_campaign');
  await db.run('DROP INDEX IF EXISTS idx_campaign_platforms_platform');
  await db.run('DROP INDEX IF EXISTS idx_campaign_platforms_status');
  await db.run('DROP INDEX IF EXISTS idx_campaign_platforms_dates');
  await db.run('DROP INDEX IF EXISTS idx_campaign_platforms_payment');
  
  // Удаляем таблицу campaign_platforms
  await db.run('DROP TABLE IF EXISTS campaign_platforms');
  // Удаляем представления
  await db.run('DROP VIEW IF EXISTS platform_statistics');
  await db.run('DROP VIEW IF EXISTS active_verified_platforms');

  // Удаляем новые триггеры
  await db.run('DROP TRIGGER IF EXISTS update_platform_price_range');
  await db.run('DROP TRIGGER IF EXISTS set_platform_published_at');
  await db.run('DROP TRIGGER IF EXISTS update_platform_campaign_counts');
  await db.run('DROP TRIGGER IF EXISTS adPlatforms_fts_delete');
  await db.run('DROP TRIGGER IF EXISTS adPlatforms_fts_update');
  await db.run('DROP TRIGGER IF EXISTS adPlatforms_fts_insert');

  // Удаляем FTS таблицу
  await db.run('DROP TABLE IF EXISTS adPlatforms_fts');

  // Создаем таблицу v1
  await db.run(`
    CREATE TABLE adPlatforms_v1 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('website', 'telegram_channel', 'telegram_group', 'instagram', 'youtube', 'tiktok', 'facebook', 'vk', 'email_newsletter', 'mobile_app', 'podcast', 'other')),
      url TEXT NOT NULL,
      description TEXT,
      audience_size INTEGER DEFAULT 0 CHECK(audience_size >= 0),
      audience_demographics TEXT DEFAULT '{}',
      pricing_model TEXT NOT NULL CHECK(pricing_model IN ('cpm', 'cpc', 'cpa', 'flat_rate', 'hybrid')),
      pricing TEXT DEFAULT '{}',
      currency TEXT DEFAULT 'USD' CHECK(currency IN ('USD', 'EUR', 'RUB', 'GBP')),
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'pending_review', 'active', 'paused', 'suspended', 'rejected', 'archived')),
      moderation_status TEXT DEFAULT 'pending' CHECK(moderation_status IN ('pending', 'approved', 'rejected', 'requires_changes')),
      verification_status TEXT DEFAULT 'unverified' CHECK(verification_status IN ('unverified', 'pending', 'verified', 'failed', 'expired')),
      rating REAL DEFAULT 0.0 CHECK(rating >= 0.0 AND rating <= 5.0),
      quality_score REAL DEFAULT 0.0 CHECK(quality_score >= 0.0 AND quality_score <= 10.0),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Копируем обратно основные данные
  await db.run(`
    INSERT INTO adPlatforms_v1 (
      id, user_id, name, type, url, description,
      audience_size, audience_demographics,
      pricing_model, pricing, currency,
      status, moderation_status, verification_status,
      rating, quality_score,
      created_at, updated_at
    )
    SELECT 
      id, user_id, name, type, url, description,
      audience_size, audience_demographics,
      pricing_model, pricing, currency,
      status, moderation_status, verification_status,
      rating, quality_score,
      created_at, updated_at
    FROM adPlatforms
    WHERE deleted_at IS NULL
  `);

  // Удаляем новые индексы
  const indexesToDrop = [
    'idx_adPlatforms_owner_username',
    'idx_adPlatforms_subtype',
    'idx_adPlatforms_language',
    'idx_adPlatforms_price_range',
    'idx_adPlatforms_audience_size_range',
    'idx_adPlatforms_primary_category',
    'idx_adPlatforms_quality_score',
    'idx_adPlatforms_trust_score',
    'idx_adPlatforms_is_premium',
    'idx_adPlatforms_deleted_at',
    'idx_adPlatforms_published_at',
    'idx_adPlatforms_moderation_composite',
    'idx_adPlatforms_active_premium',
    'idx_adPlatforms_user_active'
  ];

  for (const indexName of indexesToDrop) {
    await db.run(`DROP INDEX IF EXISTS ${indexName}`);
  }

  // Заменяем таблицы
  await db.run('DROP TABLE adPlatforms');
  await db.run('ALTER TABLE adPlatforms_v1 RENAME TO adPlatforms');

  // Восстанавливаем старые индексы
  await db.run('CREATE INDEX IF NOT EXISTS idx_adPlatforms_user_id ON adPlatforms(user_id)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_adPlatforms_status ON adPlatforms(status)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_adPlatforms_type ON adPlatforms(type)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_adPlatforms_verification_status ON adPlatforms(verification_status)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_adPlatforms_rating ON adPlatforms(rating)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_adPlatforms_user_status ON adPlatforms(user_id, status)');

  // Восстанавливаем старый триггер updated_at
  await db.run(`
    CREATE TRIGGER update_adPlatforms_updated_at 
    AFTER UPDATE ON adPlatforms
    BEGIN
      UPDATE adPlatforms SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `);

  console.log('✅ Platforms table rolled back to v1 successfully');
}

module.exports = { up, down };