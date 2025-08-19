/**
 * *project*\backend\migrations\005_split_campaigns_architecture.js
 * Миграция для разделения таблицы campaigns на несколько специализированных таблиц
 * Создает модульную структуру для управления рекламными кампаниями
 */

/**
 * Применяет миграцию - создает новую структуру таблиц кампаний
 * @param {import('./migrationRunner')} db - Экземпляр MigrationRunner
 */
async function up(db) {
  console.log('Starting campaigns table split migration...');

  // 1. Сначала удаляем представления, которые зависят от таблицы campaigns
  console.log('Dropping dependent views...');
  await db.run('DROP VIEW IF EXISTS active_campaign_placements');
  await db.run('DROP VIEW IF EXISTS campaign_full_info');
  await db.run('DROP VIEW IF EXISTS active_campaigns_with_metrics');
  await db.run('DROP VIEW IF EXISTS campaigns_pending_moderation');

  // 2. Создаем временную таблицу с новой структурой
  console.log('Creating new campaigns table structure...');
  
  await db.run(`
    CREATE TABLE IF NOT EXISTS campaigns_new (
      -- Идентификация
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      external_id TEXT,
      external_system TEXT,
      
      -- Основная информация
      title TEXT NOT NULL,
      description TEXT,
      objective TEXT CHECK(objective IN ('brand_awareness', 'traffic', 'conversions', 'engagement', 'app_installs', 'video_views', 'lead_generation')),
      
      -- Бюджет и финансы
      budget_total DECIMAL(10,2) NOT NULL,
      budget_daily DECIMAL(10,2),
      budget_spent DECIMAL(10,2) DEFAULT 0.00,
      currency TEXT DEFAULT 'USD' CHECK(currency IN ('USD', 'EUR', 'RUB', 'GBP', 'CNY', 'JPY')),
      
      -- Даты
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      
      -- Статусы
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'pending_approval', 'active', 'paused', 'completed', 'rejected', 'archived')),
      approval_status TEXT DEFAULT 'pending' CHECK(approval_status IN ('pending', 'approved', 'rejected', 'requires_changes')),
      approval_notes TEXT,
      approved_by INTEGER,
      approved_at DATETIME,
      
      -- Видимость и продвижение
      visibility TEXT DEFAULT 'public' CHECK(visibility IN ('public', 'private', 'unlisted')),
      is_featured BOOLEAN DEFAULT FALSE,
      featured_until DATETIME,
      
      -- AI и автоматизация
      ai_generated BOOLEAN DEFAULT FALSE,
      ai_generation_data TEXT,
      
      -- Метрики качества
      quality_score DECIMAL(3,2) CHECK(quality_score >= 0.0 AND quality_score <= 10.0),
      completion_rate DECIMAL(5,2) DEFAULT 0.00,
      
      -- Флаги
      is_test_campaign BOOLEAN DEFAULT FALSE,
      requires_approval BOOLEAN DEFAULT TRUE,
      sync_enabled BOOLEAN DEFAULT FALSE,
      
      -- Метаданные
      last_sync_at DATETIME,
      sync_status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      launched_at DATETIME,
      completed_at DATETIME,
      deleted_at DATETIME,
      
      -- Вычисляемые поля
      days_remaining INTEGER,
      
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // 3. Копируем существующие данные
  console.log('Copying existing campaign data...');
  await db.run(`
    INSERT OR IGNORE INTO campaigns_new (
      id, user_id, title, description, objective,
      budget_total, budget_daily, budget_spent, currency,
      start_date, end_date,
      status, approval_status, approval_notes, approved_by, approved_at,
      visibility, is_featured, featured_until,
      ai_generated, ai_generation_data,
      quality_score, completion_rate,
      created_at, updated_at, launched_at, completed_at, deleted_at
    )
    SELECT 
      id, user_id, title, description, objective,
      budget_total, budget_daily, budget_spent, currency,
      start_date, end_date,
      status, approval_status, approval_notes, approved_by, approved_at,
      visibility, is_featured, featured_until,
      ai_generated, ai_generation_data,
      quality_score, completion_rate,
      created_at, updated_at, launched_at, completed_at, deleted_at
    FROM campaigns
  `);

  // 4. Создаем таблицу campaign_targeting
  console.log('Creating campaign_targeting table...');
  await db.run(`
    CREATE TABLE IF NOT EXISTS campaign_targeting (
      campaign_id INTEGER PRIMARY KEY,
      
      -- Теги и категории
      tags TEXT DEFAULT '[]',
      primary_tag TEXT,
      target_interests TEXT DEFAULT '[]',
      
      -- Демография
      target_audience TEXT DEFAULT '{}',
      target_age_range TEXT DEFAULT '{}',
      target_gender TEXT DEFAULT 'all' CHECK(target_gender IN ('all', 'male', 'female', 'other')),
      
      -- География
      target_locations TEXT DEFAULT '[]',
      excluded_locations TEXT DEFAULT '[]',
      
      -- Языки
      language_targeting TEXT DEFAULT '[]',
      
      -- Устройства и платформы
      device_targeting TEXT DEFAULT '[]',
      os_targeting TEXT DEFAULT '[]',
      browser_targeting TEXT DEFAULT '[]',
      
      -- Поведенческий таргетинг
      behavioral_targeting TEXT DEFAULT '{}',
      retargeting_enabled BOOLEAN DEFAULT FALSE,
      retargeting_settings TEXT DEFAULT '{}',
      
      -- Ограничения
      brand_safety_enabled BOOLEAN DEFAULT TRUE,
      blocked_categories TEXT DEFAULT '[]',
      blocked_domains TEXT DEFAULT '[]',
      content_category TEXT,
      
      -- Метаданные
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      FOREIGN KEY (campaign_id) REFERENCES campaigns_new(id) ON DELETE CASCADE
    )
  `);

  /* // Создаем записи таргетинга для существующих кампаний
  await db.run(`
    INSERT OR IGNORE INTO campaign_targeting (campaign_id, target_audience)
    SELECT id, COALESCE(target_audience, '{}')
    FROM campaigns_new
  `); */

  // 5. Создаем таблицу campaign_creatives
  console.log('Creating campaign_creatives table...');
  await db.run(`
    CREATE TABLE IF NOT EXISTS campaign_creatives (
      campaign_id INTEGER PRIMARY KEY,
      
      -- Основные креативы
      creative_assets TEXT DEFAULT '[]',
      creative_rotation TEXT DEFAULT 'even' CHECK(creative_rotation IN ('even', 'optimized', 'sequential')),
      
      -- Лендинги и ссылки
      landing_url TEXT,
      utm_parameters TEXT DEFAULT '{}',
      deep_links TEXT DEFAULT '{}',
      
      -- A/B тестирование
      ab_testing_enabled BOOLEAN DEFAULT FALSE,
      ab_variants TEXT DEFAULT '[]',
      ab_winner_variant TEXT,
      ab_confidence_level DECIMAL(5,2),
      ab_test_end_date DATE,
      
      -- Форматы рекламы
      ad_formats TEXT DEFAULT '[]',
      video_settings TEXT DEFAULT '{}',
      
      -- Метаданные
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      FOREIGN KEY (campaign_id) REFERENCES campaigns_new(id) ON DELETE CASCADE
    )
  `);

  // Создаем записи креативов для существующих кампаний
  await db.run(`
    INSERT OR IGNORE INTO campaign_creatives (campaign_id, creative_assets, landing_url, utm_parameters)
    SELECT 
      id, 
      COALESCE(creative_assets, '[]'),
      landing_url,
      COALESCE(utm_parameters, '{}')
    FROM campaigns
  `);

  // 6. Создаем таблицу campaign_performance
  console.log('Creating campaign_performance table...');
  await db.run(`
    CREATE TABLE IF NOT EXISTS campaign_performance (
      campaign_id INTEGER PRIMARY KEY,
      
      -- Базовые метрики
      impressions_total INTEGER DEFAULT 0,
      clicks_total INTEGER DEFAULT 0,
      conversions_total INTEGER DEFAULT 0,
      
      -- Финансовые метрики
      cost_per_click DECIMAL(10,4) DEFAULT 0,
      cost_per_conversion DECIMAL(10,2) DEFAULT 0,
      revenue_generated DECIMAL(10,2) DEFAULT 0,
      
      -- Отслеживание конверсий
      conversion_tracking_enabled BOOLEAN DEFAULT FALSE,
      conversion_tracking_code TEXT,
      tracking_pixel_url TEXT,
      conversion_goal TEXT,
      conversion_value DECIMAL(10,2),
      
      -- Аналитика
      analytics_dashboard_url TEXT,
      performance_metrics TEXT DEFAULT '{}',
      
      -- История метрик
      metrics_history TEXT DEFAULT '[]',
      best_performing_creative TEXT,
      best_performing_platform TEXT,
      
      -- Связи с площадками
      total_platforms_count INTEGER DEFAULT 0,
      active_platforms_count INTEGER DEFAULT 0,
      pending_platforms_count INTEGER DEFAULT 0,
      
      -- Метаданные
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      FOREIGN KEY (campaign_id) REFERENCES campaigns_new(id) ON DELETE CASCADE
    )
  `);

  // Создаем записи производительности для существующих кампаний
  await db.run(`
    INSERT OR IGNORE INTO campaign_performance (campaign_id, performance_metrics)
    SELECT 
      id,
      COALESCE(performance_metrics, '{}')
    FROM campaigns
  `);

  // Подсчитываем связанные площадки
  await db.run(`
    UPDATE campaign_performance
    SET 
      total_platforms_count = (
        SELECT COUNT(*) FROM campaign_platforms WHERE campaign_id = campaign_performance.campaign_id
      ),
      active_platforms_count = (
        SELECT COUNT(*) FROM campaign_platforms 
        WHERE campaign_id = campaign_performance.campaign_id AND status = 'active'
      ),
      pending_platforms_count = (
        SELECT COUNT(*) FROM campaign_platforms 
        WHERE campaign_id = campaign_performance.campaign_id AND status = 'pending'
      )
  `);

  // 7. Создаем таблицу campaign_scheduling
  console.log('Creating campaign_scheduling table...');
  await db.run(`
    CREATE TABLE IF NOT EXISTS campaign_scheduling (
      campaign_id INTEGER PRIMARY KEY,
      
      -- Тип расписания
      schedule_type TEXT DEFAULT 'continuous' CHECK(schedule_type IN ('continuous', 'dayparting', 'custom')),
      schedule_settings TEXT DEFAULT '{}',
      
      -- Частотные ограничения
      frequency_cap_enabled BOOLEAN DEFAULT FALSE,
      frequency_cap_amount INTEGER,
      frequency_cap_period TEXT CHECK(frequency_cap_period IN ('hour', 'day', 'week', 'month')),
      
      -- Автоматизация
      auto_start BOOLEAN DEFAULT FALSE,
      auto_stop BOOLEAN DEFAULT FALSE,
      auto_renew BOOLEAN DEFAULT FALSE,
      renewal_budget DECIMAL(10,2),
      renewal_period TEXT CHECK(renewal_period IN ('daily', 'weekly', 'monthly')),
      
      -- Пауза по условиям
      pause_conditions TEXT DEFAULT '{}',
      resume_conditions TEXT DEFAULT '{}',
      
      -- Отчетность
      report_schedule TEXT DEFAULT 'weekly' CHECK(report_schedule IN ('none', 'daily', 'weekly', 'monthly')),
      report_recipients TEXT DEFAULT '[]',
      last_report_sent_at DATETIME,
      
      -- Метаданные
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      FOREIGN KEY (campaign_id) REFERENCES campaigns_new(id) ON DELETE CASCADE
    )
  `);

  // Создаем записи расписания для существующих кампаний
  await db.run(`
    INSERT OR IGNORE INTO campaign_scheduling (campaign_id)
    SELECT id FROM campaigns_new
  `);

  // 8. Создаем таблицу campaign_optimization
  console.log('Creating campaign_optimization table...');
  await db.run(`
    CREATE TABLE IF NOT EXISTS campaign_optimization (
      campaign_id INTEGER PRIMARY KEY,
      
      -- Настройки оптимизации
      auto_optimization_enabled BOOLEAN DEFAULT FALSE,
      optimization_goal TEXT CHECK(optimization_goal IN ('clicks', 'conversions', 'impressions', 'reach', 'engagement', 'video_views')),
      
      -- Стратегии ставок
      bid_strategy TEXT DEFAULT 'manual' CHECK(bid_strategy IN ('manual', 'auto_lowest_cost', 'auto_target_cost', 'maximize_conversions', 'target_roas')),
      bid_amount DECIMAL(10,4),
      target_cpa DECIMAL(10,2),
      target_roas DECIMAL(5,2),
      
      -- Правила оптимизации
      optimization_rules TEXT DEFAULT '[]',
      ml_optimization_enabled BOOLEAN DEFAULT FALSE,
      ml_model_version TEXT,
      
      -- История оптимизаций
      optimization_history TEXT DEFAULT '[]',
      last_optimization_at DATETIME,
      
      -- Рекомендации
      ai_recommendations TEXT DEFAULT '[]',
      recommendations_applied TEXT DEFAULT '[]',
      
      -- Метаданные
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      FOREIGN KEY (campaign_id) REFERENCES campaigns_new(id) ON DELETE CASCADE
    )
  `);

  // Создаем записи оптимизации для существующих кампаний
  await db.run(`
    INSERT OR IGNORE INTO campaign_optimization (campaign_id)
    SELECT id FROM campaigns_new
  `);

  // 9. Создаем индексы
  console.log('Creating indexes...');
  
  // Индексы для campaigns_new
  await db.run('CREATE INDEX IF NOT EXISTS idx_campaigns_new_user_id ON campaigns_new(user_id)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_campaigns_new_status ON campaigns_new(status)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_campaigns_new_approval_status ON campaigns_new(approval_status)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_campaigns_new_dates ON campaigns_new(start_date, end_date)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_campaigns_new_deleted ON campaigns_new(deleted_at)');
await db.run('CREATE INDEX IF NOT EXISTS idx_campaigns_new_featured ON campaigns_new(is_featured, featured_until)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_campaigns_new_quality ON campaigns_new(quality_score)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_campaigns_new_budget_spent ON campaigns_new(budget_spent)');

  // Индексы для campaign_targeting
  await db.run('CREATE INDEX IF NOT EXISTS idx_campaign_targeting_primary_tag ON campaign_targeting(primary_tag)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_campaign_targeting_gender ON campaign_targeting(target_gender)');

  // Индексы для campaign_performance
  await db.run('CREATE INDEX IF NOT EXISTS idx_campaign_performance_impressions ON campaign_performance(impressions_total)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_campaign_performance_conversions ON campaign_performance(conversions_total)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_campaign_performance_platforms ON campaign_performance(active_platforms_count)');

  // Индексы для campaign_scheduling
  await db.run('CREATE INDEX IF NOT EXISTS idx_campaign_scheduling_type ON campaign_scheduling(schedule_type)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_campaign_scheduling_report ON campaign_scheduling(report_schedule)');

  // Индексы для campaign_optimization
  await db.run('CREATE INDEX IF NOT EXISTS idx_campaign_optimization_enabled ON campaign_optimization(auto_optimization_enabled)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_campaign_optimization_goal ON campaign_optimization(optimization_goal)');

  // 10. Удаляем старые триггеры
  console.log('Dropping old triggers...');
  await db.run('DROP TRIGGER IF EXISTS update_campaigns_timestamp');
  await db.run('DROP TRIGGER IF EXISTS campaigns_fts_insert');
  await db.run('DROP TRIGGER IF EXISTS campaigns_fts_update');
  await db.run('DROP TRIGGER IF EXISTS campaigns_fts_delete');
  await db.run('DROP TRIGGER IF EXISTS update_platform_campaign_counts');

  // 11. Создаем новые триггеры
  console.log('Creating triggers...');
  
  // Триггер для обновления updated_at в campaigns
  await db.run(`
    CREATE TRIGGER IF NOT EXISTS update_campaigns_new_timestamp 
    AFTER UPDATE ON campaigns_new
    BEGIN
      UPDATE campaigns_new SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `);

  // Триггер для campaign_targeting
  await db.run(`
    CREATE TRIGGER IF NOT EXISTS update_campaign_targeting_timestamp 
    AFTER UPDATE ON campaign_targeting
    BEGIN
      UPDATE campaign_targeting SET updated_at = CURRENT_TIMESTAMP WHERE campaign_id = NEW.campaign_id;
    END
  `);

  // Триггер для campaign_creatives
  await db.run(`
    CREATE TRIGGER IF NOT EXISTS update_campaign_creatives_timestamp 
    AFTER UPDATE ON campaign_creatives
    BEGIN
      UPDATE campaign_creatives SET updated_at = CURRENT_TIMESTAMP WHERE campaign_id = NEW.campaign_id;
    END
  `);

  // Триггер для campaign_scheduling
  await db.run(`
    CREATE TRIGGER IF NOT EXISTS update_campaign_scheduling_timestamp 
    AFTER UPDATE ON campaign_scheduling
    BEGIN
      UPDATE campaign_scheduling SET updated_at = CURRENT_TIMESTAMP WHERE campaign_id = NEW.campaign_id;
    END
  `);

  // Триггер для campaign_optimization
  await db.run(`
    CREATE TRIGGER IF NOT EXISTS update_campaign_optimization_timestamp 
    AFTER UPDATE ON campaign_optimization
    BEGIN
      UPDATE campaign_optimization SET updated_at = CURRENT_TIMESTAMP WHERE campaign_id = NEW.campaign_id;
    END
  `);

  // Триггер для обновления launched_at
  await db.run(`
    CREATE TRIGGER IF NOT EXISTS set_campaign_launched_at
    AFTER UPDATE OF status ON campaigns_new
    WHEN NEW.status = 'active' AND OLD.status != 'active' AND NEW.launched_at IS NULL
    BEGIN
      UPDATE campaigns_new SET launched_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `);

  // Триггер для обновления completed_at
  await db.run(`
    CREATE TRIGGER IF NOT EXISTS set_campaign_completed_at
    AFTER UPDATE OF status ON campaigns_new
    WHEN NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.completed_at IS NULL
    BEGIN
      UPDATE campaigns_new SET completed_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `);

  // Добавить новый триггер для расчета days_remaining
await db.run(`
  CREATE TRIGGER IF NOT EXISTS update_campaign_days_remaining
  AFTER INSERT ON campaigns_new
  BEGIN
    UPDATE campaigns_new 
    SET days_remaining = CASE 
      WHEN date('now') > end_date THEN 0
      WHEN date('now') < start_date THEN julianday(end_date) - julianday(start_date)
      ELSE julianday(end_date) - julianday('now')
    END
    WHERE id = NEW.id;
  END
`);

// И триггер для обновления при изменении дат
await db.run(`
  CREATE TRIGGER IF NOT EXISTS update_campaign_days_on_date_change
  AFTER UPDATE OF start_date, end_date ON campaigns_new
  BEGIN
    UPDATE campaigns_new 
    SET days_remaining = CASE 
      WHEN date('now') > NEW.end_date THEN 0
      WHEN date('now') < NEW.start_date THEN julianday(NEW.end_date) - julianday(NEW.start_date)
      ELSE julianday(NEW.end_date) - julianday('now')
    END
    WHERE id = NEW.id;
  END
`);

  // 12. Заменяем старую таблицу campaigns на новую
  console.log('Replacing old campaigns table...');
  await db.run('DROP TABLE IF EXISTS campaigns');
  await db.run('ALTER TABLE campaigns_new RENAME TO campaigns');

  // 13. Обновляем campaign_platforms
  console.log('Updating campaign_platforms references...');
  
  // Создаем обновленный триггер для подсчета площадок
  await db.run('DROP TRIGGER IF EXISTS update_platform_campaign_counts');
  await db.run(`
    CREATE TRIGGER IF NOT EXISTS update_campaign_platform_counts
    AFTER INSERT ON campaign_platforms
    BEGIN
      -- Обновляем счетчики в campaign_performance
      UPDATE campaign_performance
      SET 
        total_platforms_count = (
          SELECT COUNT(*) FROM campaign_platforms WHERE campaign_id = NEW.campaign_id
        ),
        active_platforms_count = (
          SELECT COUNT(*) FROM campaign_platforms 
          WHERE campaign_id = NEW.campaign_id AND status = 'active'
        ),
        pending_platforms_count = (
          SELECT COUNT(*) FROM campaign_platforms 
          WHERE campaign_id = NEW.campaign_id AND status = 'pending'
        )
      WHERE campaign_id = NEW.campaign_id;
      
      -- Обновляем счетчики в adPlatforms
      UPDATE adPlatforms
      SET 
        total_campaigns_count = total_campaigns_count + 1,
        active_campaigns_count = active_campaigns_count + 
          CASE WHEN NEW.status = 'active' THEN 1 ELSE 0 END,
        last_campaign_date = CURRENT_TIMESTAMP
      WHERE id = NEW.platform_id;
    END
  `);

  // Триггер для обновления при изменении статуса
  await db.run(`
    CREATE TRIGGER IF NOT EXISTS update_campaign_platform_counts_on_status_change
    AFTER UPDATE OF status ON campaign_platforms
    WHEN OLD.status != NEW.status
    BEGIN
      -- Обновляем счетчики в campaign_performance
      UPDATE campaign_performance
      SET 
        active_platforms_count = (
          SELECT COUNT(*) FROM campaign_platforms 
          WHERE campaign_id = NEW.campaign_id AND status = 'active'
        ),
        pending_platforms_count = (
          SELECT COUNT(*) FROM campaign_platforms 
          WHERE campaign_id = NEW.campaign_id AND status = 'pending'
        )
      WHERE campaign_id = NEW.campaign_id;
      
      -- Обновляем счетчики в adPlatforms
      UPDATE adPlatforms
      SET 
        active_campaigns_count = active_campaigns_count + 
          CASE 
            WHEN NEW.status = 'active' AND OLD.status != 'active' THEN 1
            WHEN NEW.status != 'active' AND OLD.status = 'active' THEN -1
            ELSE 0
          END
      WHERE id = NEW.platform_id;
    END
  `);

  // 14. Создаем FTS таблицу для полнотекстового поиска
  console.log('Creating FTS table...');
  await db.run('DROP TABLE IF EXISTS campaigns_fts');
  await db.run(`
    CREATE VIRTUAL TABLE IF NOT EXISTS campaigns_fts USING fts5(
      title,
      description,
      tags,
      content=campaigns,
      content_rowid=id
    )
  `);

  // Заполняем FTS таблицу
  await db.run(`
    INSERT INTO campaigns_fts(rowid, title, description, tags)
    SELECT c.id, c.title, c.description, ct.tags
    FROM campaigns c
    LEFT JOIN campaign_targeting ct ON c.id = ct.campaign_id
  `);

  // Триггеры для FTS
  await db.run(`
    CREATE TRIGGER IF NOT EXISTS campaigns_fts_insert 
    AFTER INSERT ON campaigns 
    BEGIN
      INSERT INTO campaigns_fts(rowid, title, description, tags)
      SELECT new.id, new.title, new.description, ct.tags
      FROM campaign_targeting ct WHERE ct.campaign_id = new.id;
    END
  `);

  await db.run(`
    CREATE TRIGGER IF NOT EXISTS campaigns_fts_update 
    AFTER UPDATE ON campaigns 
    BEGIN
      UPDATE campaigns_fts
      SET title = new.title, description = new.description
      WHERE rowid = new.id;
    END
  `);

  await db.run(`
    CREATE TRIGGER IF NOT EXISTS campaigns_fts_delete 
    AFTER DELETE ON campaigns 
    BEGIN
      DELETE FROM campaigns_fts WHERE rowid = old.id;
    END
  `);

  await db.run(`
    CREATE TRIGGER IF NOT EXISTS campaigns_fts_tags_update 
    AFTER UPDATE OF tags ON campaign_targeting
    BEGIN
      UPDATE campaigns_fts
      SET tags = new.tags
      WHERE rowid = new.campaign_id;
    END
  `);

  // 15. Создаем представления
  console.log('Creating views...');
  
  // Полная информация о кампании
  await db.run(`
    CREATE VIEW IF NOT EXISTS campaign_full_info AS
    SELECT 
      c.*,
      ct.tags, ct.primary_tag, ct.target_audience, ct.target_locations,
      ct.target_age_range, ct.target_gender, ct.language_targeting,
      cc.creative_assets, cc.landing_url, cc.utm_parameters,
      cc.ab_testing_enabled, cc.ab_variants,
      cp.impressions_total, cp.clicks_total, cp.conversions_total,
      cp.cost_per_click, cp.cost_per_conversion, cp.revenue_generated,
      cp.total_platforms_count, cp.active_platforms_count,
      cs.schedule_type, cs.schedule_settings, cs.frequency_cap_enabled,
      cs.report_schedule, cs.auto_renew,
      co.auto_optimization_enabled, co.optimization_goal, co.bid_strategy,
      u.username as owner_username, u.email as owner_email
    FROM campaigns c
    LEFT JOIN campaign_targeting ct ON c.id = ct.campaign_id
    LEFT JOIN campaign_creatives cc ON c.id = cc.campaign_id
    LEFT JOIN campaign_performance cp ON c.id = cp.campaign_id
    LEFT JOIN campaign_scheduling cs ON c.id = cs.campaign_id
    LEFT JOIN campaign_optimization co ON c.id = co.campaign_id
    LEFT JOIN users u ON c.user_id = u.id
  `);

  // Активные кампании с метриками
  await db.run(`
    CREATE VIEW IF NOT EXISTS active_campaigns_with_metrics AS
    SELECT 
      c.id, c.title, c.user_id, c.budget_total, c.budget_spent,
      c.start_date, c.end_date, c.status, c.quality_score,
      cp.impressions_total, cp.clicks_total, cp.conversions_total,
      cp.active_platforms_count,
      ROUND(CAST(cp.clicks_total AS REAL) / NULLIF(cp.impressions_total, 0) * 100, 2) as ctr,
      ROUND(CAST(cp.conversions_total AS REAL) / NULLIF(cp.clicks_total, 0) * 100, 2) as conversion_rate,
      ct.primary_tag, ct.tags
    FROM campaigns c
    LEFT JOIN campaign_performance cp ON c.id = cp.campaign_id
    LEFT JOIN campaign_targeting ct ON c.id = ct.campaign_id
    WHERE c.status = 'active' 
      AND c.deleted_at IS NULL
      AND date('now') BETWEEN c.start_date AND c.end_date
  `);

  // Кампании требующие модерации
  await db.run(`
    CREATE VIEW IF NOT EXISTS campaigns_pending_moderation AS
    SELECT 
      c.id, c.title, c.user_id, c.created_at,
      c.budget_total, c.start_date, c.end_date,
      ct.primary_tag, ct.target_audience,
      cc.landing_url,
      u.username, u.email
    FROM campaigns c
    LEFT JOIN campaign_targeting ct ON c.id = ct.campaign_id
    LEFT JOIN campaign_creatives cc ON c.id = cc.campaign_id
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.approval_status = 'pending'
      AND c.deleted_at IS NULL
    ORDER BY c.created_at ASC
  `);

  // 16. Восстанавливаем представления, которые зависят от campaigns
  console.log('Recreating dependent views...');
  
  await db.run(`
    CREATE VIEW IF NOT EXISTS active_campaign_placements AS
    SELECT 
      cp.*,
      c.title as campaign_title,
      c.budget_total as campaign_budget,
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

  console.log('✅ Campaigns table split migration completed successfully');
}

/**
 * Откатывает миграцию - объединяет таблицы обратно в одну
 * @param {import('./migrationRunner')} db - Экземпляр MigrationRunner
 */
async function down(db) {
  console.log('Rolling back campaigns table split migration...');

  // 1. Удаляем представления
  console.log('Dropping views...');
  await db.run('DROP VIEW IF EXISTS campaign_full_info');
  await db.run('DROP VIEW IF EXISTS active_campaigns_with_metrics');
  await db.run('DROP VIEW IF EXISTS campaigns_pending_moderation');
  await db.run('DROP VIEW IF EXISTS active_campaign_placements');

  // 2. Создаем старую структуру таблицы campaigns
  await db.run(`
    CREATE TABLE IF NOT EXISTS campaigns_old (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      objective TEXT CHECK(objective IN ('brand_awareness', 'traffic', 'conversions', 'engagement')),
      target_audience TEXT,
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
performance_metrics TEXT DEFAULT '{}',
      creative_assets TEXT DEFAULT '[]',
      landing_url TEXT,
      utm_parameters TEXT,
      ai_generated BOOLEAN DEFAULT 0,
      ai_generation_data TEXT,
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
      budget_remaining DECIMAL(10,2) GENERATED ALWAYS AS (budget_total - budget_spent) VIRTUAL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // 3. Копируем данные обратно из разделенных таблиц
  console.log('Copying data back to old structure...');
  await db.run(`
    INSERT OR IGNORE INTO campaigns_old (
      id, user_id, title, description, objective,
      target_audience,
      budget_total, budget_daily, budget_spent, currency,
      start_date, end_date,
      status, approval_status, approval_notes, approved_by, approved_at,
      performance_metrics,
      creative_assets, landing_url, utm_parameters,
      ai_generated, ai_generation_data,
      visibility, is_featured, featured_until,
      completion_rate, quality_score,
      created_at, updated_at, launched_at, completed_at, deleted_at
    )
    SELECT 
      c.id, c.user_id, c.title, c.description, c.objective,
      ct.target_audience,
      c.budget_total, c.budget_daily, c.budget_spent, c.currency,
      c.start_date, c.end_date,
      c.status, c.approval_status, c.approval_notes, c.approved_by, c.approved_at,
      cp.performance_metrics,
      cc.creative_assets, cc.landing_url, cc.utm_parameters,
      c.ai_generated, c.ai_generation_data,
      c.visibility, c.is_featured, c.featured_until,
      c.completion_rate, c.quality_score,
      c.created_at, c.updated_at, c.launched_at, c.completed_at, c.deleted_at
    FROM campaigns c
    LEFT JOIN campaign_targeting ct ON c.id = ct.campaign_id
    LEFT JOIN campaign_creatives cc ON c.id = cc.campaign_id
    LEFT JOIN campaign_performance cp ON c.id = cp.campaign_id
  `);

  // 4. Удаляем триггеры
  console.log('Dropping triggers...');
  await db.run('DROP TRIGGER IF EXISTS update_campaigns_new_timestamp');
  await db.run('DROP TRIGGER IF EXISTS update_campaign_targeting_timestamp');
  await db.run('DROP TRIGGER IF EXISTS update_campaign_creatives_timestamp');
  await db.run('DROP TRIGGER IF EXISTS update_campaign_scheduling_timestamp');
  await db.run('DROP TRIGGER IF EXISTS update_campaign_optimization_timestamp');
  await db.run('DROP TRIGGER IF EXISTS set_campaign_launched_at');
  await db.run('DROP TRIGGER IF EXISTS set_campaign_completed_at');
  await db.run('DROP TRIGGER IF EXISTS update_campaign_platform_counts');
  await db.run('DROP TRIGGER IF EXISTS update_campaign_platform_counts_on_status_change');
  await db.run('DROP TRIGGER IF EXISTS campaigns_fts_insert');
  await db.run('DROP TRIGGER IF EXISTS campaigns_fts_update');
  await db.run('DROP TRIGGER IF EXISTS campaigns_fts_delete');
  await db.run('DROP TRIGGER IF EXISTS campaigns_fts_tags_update');

  // 5. Удаляем индексы
  console.log('Dropping indexes...');
  const indexesToDrop = [
    'idx_campaigns_new_user_id',
    'idx_campaigns_new_status',
    'idx_campaigns_new_approval_status',
    'idx_campaigns_new_dates',
    'idx_campaigns_new_deleted',
    'idx_campaigns_new_featured',
    'idx_campaigns_new_quality',
    'idx_campaigns_new_budget_spent',
    'idx_campaign_targeting_primary_tag',
    'idx_campaign_targeting_gender',
    'idx_campaign_performance_impressions',
    'idx_campaign_performance_conversions',
    'idx_campaign_performance_platforms',
    'idx_campaign_scheduling_type',
    'idx_campaign_scheduling_report',
    'idx_campaign_optimization_enabled',
    'idx_campaign_optimization_goal'
  ];

  for (const indexName of indexesToDrop) {
    await db.run(`DROP INDEX IF EXISTS ${indexName}`);
  }

  // 6. Удаляем FTS таблицу
  console.log('Dropping FTS table...');
  await db.run('DROP TABLE IF EXISTS campaigns_fts');

  // 7. Удаляем новые таблицы
  console.log('Dropping new tables...');
  await db.run('DROP TABLE IF EXISTS campaign_optimization');
  await db.run('DROP TABLE IF EXISTS campaign_scheduling');
  await db.run('DROP TABLE IF EXISTS campaign_performance');
  await db.run('DROP TABLE IF EXISTS campaign_creatives');
  await db.run('DROP TABLE IF EXISTS campaign_targeting');

  // 8. Заменяем таблицу campaigns на старую версию
  await db.run('DROP TABLE IF EXISTS campaigns');
  await db.run('ALTER TABLE campaigns_old RENAME TO campaigns');

  // 9. Восстанавливаем старые индексы
  console.log('Recreating original indexes...');
  await db.run('CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_campaigns_approval_status ON campaigns(approval_status)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON campaigns(start_date, end_date)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_campaigns_deleted ON campaigns(deleted_at)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_campaigns_featured ON campaigns(is_featured, featured_until)');

  // 10. Восстанавливаем старый триггер для updated_at
  await db.run(`
    CREATE TRIGGER IF NOT EXISTS update_campaigns_timestamp 
    AFTER UPDATE ON campaigns
    BEGIN
      UPDATE campaigns SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `);

  // 11. Восстанавливаем старый триггер для подсчета площадок
  await db.run(`
    CREATE TRIGGER IF NOT EXISTS update_platform_campaign_counts
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

  // 12. Восстанавливаем представления с исходной структурой
  console.log('Recreating original views...');
  
  await db.run(`
    CREATE VIEW IF NOT EXISTS active_campaign_placements AS
    SELECT 
      cp.*,
      c.title as campaign_title,
      c.budget_total as campaign_budget,
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

  console.log('✅ Campaigns table split migration rolled back successfully');
}

module.exports = { up, down };