CREATE TABLE "adPlatforms" (
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
CREATE INDEX idx_adPlatforms_user_active ON adPlatforms(user_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_adPlatforms_active_premium ON adPlatforms(status, is_premium) WHERE status = "active";
CREATE INDEX idx_adPlatforms_moderation_composite ON adPlatforms(status, moderation_status);
CREATE INDEX idx_adPlatforms_published_at ON adPlatforms(published_at);
CREATE INDEX idx_adPlatforms_deleted_at ON adPlatforms(deleted_at);
CREATE INDEX idx_adPlatforms_is_premium ON adPlatforms(is_premium);
CREATE INDEX idx_adPlatforms_trust_score ON adPlatforms(trust_score);
CREATE INDEX idx_adPlatforms_quality_score ON adPlatforms(quality_score);
CREATE INDEX idx_adPlatforms_primary_category ON adPlatforms(primary_category);
CREATE INDEX idx_adPlatforms_audience_size_range ON adPlatforms(audience_size_range);
CREATE INDEX idx_adPlatforms_price_range ON adPlatforms(price_range);
CREATE INDEX idx_adPlatforms_language ON adPlatforms(language);
CREATE INDEX idx_adPlatforms_subtype ON adPlatforms(subtype);
CREATE INDEX idx_adPlatforms_owner_username ON adPlatforms(owner_username);
CREATE TRIGGER adPlatforms_fts_insert AFTER INSERT ON adPlatforms BEGIN
      INSERT INTO adPlatforms_fts(rowid, name, description, keywords)
      VALUES (new.id, new.name, new.description, new.keywords);
    END;
CREATE TRIGGER adPlatforms_fts_update AFTER UPDATE ON adPlatforms BEGIN
      UPDATE adPlatforms_fts
      SET name = new.name, description = new.description, keywords = new.keywords
      WHERE rowid = new.id;
    END;
CREATE TRIGGER adPlatforms_fts_delete AFTER DELETE ON adPlatforms BEGIN
      DELETE FROM adPlatforms_fts WHERE rowid = old.id;
    END;
CREATE TRIGGER update_adPlatforms_updated_at 
    AFTER UPDATE ON adPlatforms
    BEGIN
      UPDATE adPlatforms SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
CREATE TRIGGER set_platform_published_at
    AFTER UPDATE OF status ON adPlatforms
    WHEN NEW.status = 'active' AND OLD.status != 'active' AND NEW.published_at IS NULL
    BEGIN
      UPDATE adPlatforms SET published_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
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
    END;

    CREATE TABLE campaign_creatives (
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
      
      FOREIGN KEY (campaign_id) REFERENCES "campaigns"(id) ON DELETE CASCADE
    )
CREATE TRIGGER update_campaign_creatives_timestamp 
    AFTER UPDATE ON campaign_creatives
    BEGIN
      UPDATE campaign_creatives SET updated_at = CURRENT_TIMESTAMP WHERE campaign_id = NEW.campaign_id;
    END;

    CREATE TABLE campaign_optimization (
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
      
      FOREIGN KEY (campaign_id) REFERENCES "campaigns"(id) ON DELETE CASCADE
    )
CREATE INDEX idx_campaign_optimization_goal ON campaign_optimization(optimization_goal);
CREATE INDEX idx_campaign_optimization_enabled ON campaign_optimization(auto_optimization_enabled);
CREATE TRIGGER update_campaign_optimization_timestamp 
    AFTER UPDATE ON campaign_optimization
    BEGIN
      UPDATE campaign_optimization SET updated_at = CURRENT_TIMESTAMP WHERE campaign_id = NEW.campaign_id;
    END;

    CREATE TABLE campaign_performance (
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
      
      FOREIGN KEY (campaign_id) REFERENCES "campaigns"(id) ON DELETE CASCADE
    )
CREATE INDEX idx_campaign_performance_platforms ON campaign_performance(active_platforms_count);
CREATE INDEX idx_campaign_performance_conversions ON campaign_performance(conversions_total);
CREATE INDEX idx_campaign_performance_impressions ON campaign_performance(impressions_total);

CREATE TABLE campaign_platforms (
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
CREATE INDEX idx_campaign_platforms_payment ON campaign_platforms(payment_status);
CREATE INDEX idx_campaign_platforms_dates ON campaign_platforms(start_date, end_date);
CREATE INDEX idx_campaign_platforms_status ON campaign_platforms(status);
CREATE INDEX idx_campaign_platforms_platform ON campaign_platforms(platform_id);
CREATE INDEX idx_campaign_platforms_campaign ON campaign_platforms(campaign_id);
CREATE UNIQUE INDEX `sqlite_autoindex_campaign_platforms_1` ON `campaign_platforms` (campaign_id, platform_id, start_date, end_date);
CREATE TRIGGER update_campaign_platforms_updated_at 
    AFTER UPDATE ON campaign_platforms
    BEGIN
      UPDATE campaign_platforms SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
CREATE TRIGGER update_campaign_platform_counts
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
    END;
CREATE TRIGGER update_campaign_platform_counts_on_status_change
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
    END;

    CREATE TABLE campaign_scheduling (
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
      
      FOREIGN KEY (campaign_id) REFERENCES "campaigns"(id) ON DELETE CASCADE
    )
CREATE INDEX idx_campaign_scheduling_report ON campaign_scheduling(report_schedule);
CREATE INDEX idx_campaign_scheduling_type ON campaign_scheduling(schedule_type);
CREATE TRIGGER update_campaign_scheduling_timestamp 
    AFTER UPDATE ON campaign_scheduling
    BEGIN
      UPDATE campaign_scheduling SET updated_at = CURRENT_TIMESTAMP WHERE campaign_id = NEW.campaign_id;
    END;

   CREATE TABLE campaign_targeting (
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
      
      FOREIGN KEY (campaign_id) REFERENCES "campaigns"(id) ON DELETE CASCADE
    )
CREATE INDEX idx_campaign_targeting_gender ON campaign_targeting(target_gender);
CREATE INDEX idx_campaign_targeting_primary_tag ON campaign_targeting(primary_tag);
CREATE TRIGGER update_campaign_targeting_timestamp 
    AFTER UPDATE ON campaign_targeting
    BEGIN
      UPDATE campaign_targeting SET updated_at = CURRENT_TIMESTAMP WHERE campaign_id = NEW.campaign_id;
    END;
CREATE TRIGGER campaigns_fts_tags_update 
    AFTER UPDATE OF tags ON campaign_targeting
    BEGIN
      UPDATE campaigns_fts
      SET tags = new.tags
      WHERE rowid = new.campaign_id;
    END;
CREATE TRIGGER campaign_targeting_insert_fts
  AFTER INSERT ON campaign_targeting
  BEGIN
    UPDATE campaigns_fts
    SET tags = new.tags
    WHERE rowid = new.campaign_id;
  END;

   CREATE TABLE "campaigns" (
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
CREATE INDEX idx_campaigns_new_budget_spent ON "campaigns"(budget_spent);
CREATE INDEX idx_campaigns_new_quality ON "campaigns"(quality_score);
CREATE INDEX idx_campaigns_new_featured ON "campaigns"(is_featured, featured_until);
CREATE INDEX idx_campaigns_new_deleted ON "campaigns"(deleted_at);
CREATE INDEX idx_campaigns_new_dates ON "campaigns"(start_date, end_date);
CREATE INDEX idx_campaigns_new_approval_status ON "campaigns"(approval_status);
CREATE INDEX idx_campaigns_new_status ON "campaigns"(status);
CREATE INDEX idx_campaigns_new_user_id ON "campaigns"(user_id);
CREATE TRIGGER update_campaigns_new_timestamp 
    AFTER UPDATE ON "campaigns"
    BEGIN
      UPDATE "campaigns" SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
CREATE TRIGGER set_campaign_launched_at
    AFTER UPDATE OF status ON "campaigns"
    WHEN NEW.status = 'active' AND OLD.status != 'active' AND NEW.launched_at IS NULL
    BEGIN
      UPDATE "campaigns" SET launched_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
CREATE TRIGGER set_campaign_completed_at
    AFTER UPDATE OF status ON "campaigns"
    WHEN NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.completed_at IS NULL
    BEGIN
      UPDATE "campaigns" SET completed_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
CREATE TRIGGER update_campaign_days_remaining
  AFTER INSERT ON "campaigns"
  BEGIN
    UPDATE "campaigns" 
    SET days_remaining = CASE 
      WHEN date('now') > end_date THEN 0
      WHEN date('now') < start_date THEN julianday(end_date) - julianday(start_date)
      ELSE julianday(end_date) - julianday('now')
    END
    WHERE id = NEW.id;
  END;
CREATE TRIGGER update_campaign_days_on_date_change
  AFTER UPDATE OF start_date, end_date ON "campaigns"
  BEGIN
    UPDATE "campaigns" 
    SET days_remaining = CASE 
      WHEN date('now') > NEW.end_date THEN 0
      WHEN date('now') < NEW.start_date THEN julianday(NEW.end_date) - julianday(NEW.start_date)
      ELSE julianday(NEW.end_date) - julianday('now')
    END
    WHERE id = NEW.id;
  END;
CREATE TRIGGER campaigns_fts_update 
    AFTER UPDATE ON campaigns 
    BEGIN
      UPDATE campaigns_fts
      SET title = new.title, description = new.description
      WHERE rowid = new.id;
    END;
CREATE TRIGGER campaigns_fts_delete 
    AFTER DELETE ON campaigns 
    BEGIN
      DELETE FROM campaigns_fts WHERE rowid = old.id;
    END;
CREATE TRIGGER campaigns_fts_insert 
  AFTER INSERT ON campaigns 
  BEGIN
    INSERT INTO campaigns_fts(rowid, title, description, tags)
    VALUES (new.id, new.title, new.description, '[]');
  END;

  CREATE TABLE migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT UNIQUE NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
CREATE UNIQUE INDEX `sqlite_autoindex_migrations_1` ON `migrations` (filename);

CREATE TABLE tag_relations (
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
CREATE INDEX idx_tag_relations_strength ON tag_relations(strength DESC)
CREATE INDEX idx_tag_relations_tag2 ON tag_relations(tag2_id);
CREATE INDEX idx_tag_relations_tag1 ON tag_relations(tag1_id);
CREATE UNIQUE INDEX `sqlite_autoindex_tag_relations_1` ON `tag_relations` (tag1_id, tag2_id);

CREATE TABLE tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      category TEXT CHECK(category IN ('interest', 'demographic', 'behavior', 'industry', 'other')),
      description TEXT,
      usage_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
CREATE INDEX idx_tags_usage ON tags(usage_count DESC)
CREATE INDEX idx_tags_name ON tags(name);
CREATE UNIQUE INDEX `sqlite_autoindex_tags_1` ON `tags` (name);

CREATE TABLE user_api_access (
      -- API ДОСТУП
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      api_key TEXT UNIQUE NOT NULL,
      api_secret_hash TEXT NOT NULL,
      name TEXT, -- название ключа
      permissions TEXT DEFAULT '[]', -- JSON массив разрешений
      rate_limit INTEGER DEFAULT 1000, -- запросов в час
      is_active BOOLEAN DEFAULT TRUE,
      last_used_at DATETIME,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE
    )
CREATE INDEX idx_user_api_access_active ON user_api_access(is_active);
CREATE INDEX idx_user_api_access_key ON user_api_access(api_key);
CREATE INDEX idx_user_api_access_user ON user_api_access(user_id);
CREATE UNIQUE INDEX `sqlite_autoindex_user_api_access_1` ON `user_api_access` (api_key);

CREATE TABLE user_finances (
      -- БАЛАНСЫ
      user_id INTEGER PRIMARY KEY,
      balance DECIMAL(10,2) DEFAULT 0.00,
      balance_on_hold DECIMAL(10,2) DEFAULT 0.00,
      total_earned DECIMAL(10,2) DEFAULT 0.00,
      total_spent DECIMAL(10,2) DEFAULT 0.00,
      total_withdrawn DECIMAL(10,2) DEFAULT 0.00,
      
      -- ПОДПИСКА
      subscription_plan TEXT DEFAULT 'free' CHECK(subscription_plan IN ('free', 'standard', 'premium')),
      subscription_expires_at DATETIME,
      subscription_auto_renew BOOLEAN DEFAULT TRUE,
      
      -- МЕТАДАННЫЕ
      last_transaction_at DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE
    )
CREATE INDEX idx_user_finances_balance ON user_finances(balance);
CREATE INDEX idx_user_finances_subscription ON user_finances(subscription_plan);
CREATE TRIGGER update_user_finances_timestamp 
    AFTER UPDATE ON user_finances
    BEGIN
      UPDATE user_finances SET updated_at = CURRENT_TIMESTAMP WHERE user_id = NEW.user_id;
    END;

    CREATE TABLE user_loyalty (
      -- ЛОЯЛЬНОСТЬ И РЕФЕРАЛЬНАЯ СИСТЕМА
      user_id INTEGER PRIMARY KEY,
      loyalty_points INTEGER DEFAULT 0,
      loyalty_level INTEGER DEFAULT 1,
      total_points_earned INTEGER DEFAULT 0,
      total_points_spent INTEGER DEFAULT 0,
      
      -- РЕФЕРАЛЬНАЯ ПРОГРАММА
      referral_code TEXT UNIQUE,
      referred_by INTEGER,
      referral_count INTEGER DEFAULT 0,
      referral_earnings DECIMAL(10,2) DEFAULT 0.00,
      
      -- ДОСТИЖЕНИЯ
      achievements_unlocked TEXT DEFAULT '[]', -- JSON массив
      badges_earned TEXT DEFAULT '[]', -- JSON массив
      
      -- МЕТАДАННЫЕ
      joined_loyalty_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE,
      FOREIGN KEY (referred_by) REFERENCES "users"(id)
    )
CREATE INDEX idx_user_loyalty_referred_by ON user_loyalty(referred_by);
CREATE INDEX idx_user_loyalty_referral_code ON user_loyalty(referral_code);
CREATE INDEX idx_user_loyalty_level ON user_loyalty(loyalty_level);
CREATE UNIQUE INDEX `sqlite_autoindex_user_loyalty_1` ON `user_loyalty` (referral_code);
CREATE TRIGGER update_user_loyalty_timestamp 
    AFTER UPDATE ON user_loyalty
    BEGIN
      UPDATE user_loyalty SET updated_at = CURRENT_TIMESTAMP WHERE user_id = NEW.user_id;
    END;

    CREATE TABLE user_profiles (
      -- ПЕРСОНАЛЬНАЯ ИНФОРМАЦИЯ
      user_id INTEGER PRIMARY KEY,
      phone TEXT,
      phone_verified BOOLEAN DEFAULT FALSE,
      avatar_url TEXT,
      bio TEXT,
      company_name TEXT,
      company_verified BOOLEAN DEFAULT FALSE,
      
      -- НАСТРОЙКИ
      preferred_language TEXT DEFAULT 'en',
      timezone TEXT DEFAULT 'UTC',
      notification_settings TEXT DEFAULT '{}',
      
      -- МЕТАДАННЫЕ
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE
    )
CREATE INDEX idx_user_profiles_verified ON user_profiles(company_verified);
CREATE INDEX idx_user_profiles_company ON user_profiles(company_name);
CREATE TRIGGER update_user_profiles_timestamp 
    AFTER UPDATE ON user_profiles
    BEGIN
      UPDATE user_profiles SET updated_at = CURRENT_TIMESTAMP WHERE user_id = NEW.user_id;
    END;

    CREATE TABLE user_verification_tokens (
      -- ТОКЕНЫ ВЕРИФИКАЦИИ
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('email', 'phone', 'password_reset', 'api_activation')),
      expires_at DATETIME NOT NULL,
      used_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE
    )
CREATE INDEX idx_user_verification_tokens_type ON user_verification_tokens(type);
CREATE INDEX idx_user_verification_tokens_token ON user_verification_tokens(token);
CREATE INDEX idx_user_verification_tokens_user ON user_verification_tokens(user_id);
CREATE UNIQUE INDEX `sqlite_autoindex_user_verification_tokens_1` ON `user_verification_tokens` (token);

CREATE TABLE "users" (
      -- АУТЕНТИФИКАЦИЯ И ИДЕНТИФИКАЦИЯ
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      email_verified BOOLEAN DEFAULT FALSE,
      password_hash TEXT NOT NULL,
      two_factor_enabled BOOLEAN DEFAULT FALSE,
      two_factor_secret TEXT,
      
      -- РОЛИ И СТАТУС
      is_admin INTEGER DEFAULT 0,
      is_moderator INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'banned')),
      banned_until DATETIME,
      ban_reason TEXT,
      
      -- АКТИВНОСТЬ
      last_login_at DATETIME,
      login_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
CREATE INDEX idx_users_last_login ON "users"(last_login_at);
CREATE INDEX idx_users_roles ON "users"(is_admin, is_moderator);
CREATE INDEX idx_users_status ON "users"(status);
CREATE INDEX idx_users_email_verified ON "users"(email_verified);
CREATE UNIQUE INDEX `sqlite_autoindex_users_2` ON `users` (email);
CREATE UNIQUE INDEX `sqlite_autoindex_users_1` ON `users` (username);
CREATE TRIGGER update_users_timestamp 
    AFTER UPDATE ON "users"
    BEGIN
      UPDATE "users" SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
CREATE TRIGGER update_user_login_stats
    AFTER UPDATE OF last_login_at ON "users"
    WHEN NEW.last_login_at != OLD.last_login_at
    BEGIN
      UPDATE "users" 
      SET login_count = login_count + 1 
      WHERE id = NEW.id;
    END;

    CREATE VIEW active_campaign_placements AS
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

      CREATE VIEW active_campaigns_with_metrics AS
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

      CREATE VIEW active_subscriptions AS
    SELECT 
      u.id, u.username, u.email,
      uf.subscription_plan, uf.subscription_expires_at,
      CASE 
        WHEN uf.subscription_expires_at > datetime('now') THEN 1 
        ELSE 0 
      END as is_active
    FROM users u
    JOIN user_finances uf ON u.id = uf.user_id
    WHERE uf.subscription_plan != 'free'

    CREATE VIEW active_verified_platforms AS
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

      CREATE VIEW campaign_full_info AS
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

    CREATE VIEW campaigns_pending_moderation AS
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

    CREATE VIEW platform_statistics AS
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

    CREATE VIEW user_full_info AS
    SELECT 
      u.*,
      up.phone, up.phone_verified, up.avatar_url, up.bio, 
      up.company_name, up.company_verified,
      up.preferred_language, up.timezone, up.notification_settings,
      uf.balance, uf.balance_on_hold, uf.total_earned, uf.total_spent,
      uf.subscription_plan, uf.subscription_expires_at,
      ul.loyalty_points, ul.loyalty_level, ul.referral_code,
      ul.referral_count, ul.achievements_unlocked, ul.badges_earned
    FROM users u
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN user_finances uf ON u.id = uf.user_id
    LEFT JOIN user_loyalty ul ON u.id = ul.user_id

    CREATE VIRTUAL TABLE adPlatforms_fts USING fts5(
      name,
      description,
      keywords,
      content=adPlatforms,
      content_rowid=id
    )

    CREATE VIRTUAL TABLE campaigns_fts USING fts5(
    title,
    description,
    tags
  )