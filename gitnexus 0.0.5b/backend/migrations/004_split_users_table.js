/**
 * *project*\backend\migrations\004_split_users_table.js
 * Миграция для разделения таблицы users на несколько специализированных таблиц
 * Создает модульную структуру для управления пользователями
 */

/**
 * Применяет миграцию - создает новую структуру таблиц пользователей
 * @param {import('./migrationRunner')} db - Экземпляр MigrationRunner
 */
async function up(db) {
  console.log('Starting users table split migration...');

  // 1. Сначала удаляем представления, которые зависят от таблицы users
  console.log('Dropping dependent views...');
  await db.run('DROP VIEW IF EXISTS active_verified_platforms');
  await db.run('DROP VIEW IF EXISTS active_campaign_placements');
  await db.run('DROP VIEW IF EXISTS platform_statistics');

  // 2. Создаем временную таблицу с новой структурой
  console.log('Creating new users table structure...');
  
  await db.run(`
    CREATE TABLE IF NOT EXISTS users_new (
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
  `);

  // 3. Копируем существующие данные
  console.log('Copying existing user data...');
  await db.run(`
    INSERT OR IGNORE INTO users_new (
      id, username, email, password_hash, 
      is_admin, is_moderator,
      status,
      created_at, updated_at
    )
    SELECT 
      id, username, email, password_hash,
      is_admin, is_moderator,
      'active' as status,
      created_at, updated_at
    FROM users
  `);

  // 4. Создаем таблицу user_profiles
  console.log('Creating user_profiles table...');
  await db.run(`
    CREATE TABLE IF NOT EXISTS user_profiles (
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
      FOREIGN KEY (user_id) REFERENCES users_new(id) ON DELETE CASCADE
    )
  `);

  // Создаем профили для существующих пользователей
  await db.run(`
    INSERT OR IGNORE INTO user_profiles (user_id)
    SELECT id FROM users_new
  `);

  // 5. Создаем таблицу user_finances
  console.log('Creating user_finances table...');
  await db.run(`
    CREATE TABLE IF NOT EXISTS user_finances (
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
      FOREIGN KEY (user_id) REFERENCES users_new(id) ON DELETE CASCADE
    )
  `);

  // Создаем финансовые записи для существующих пользователей
  await db.run(`
    INSERT OR IGNORE INTO user_finances (user_id)
    SELECT id FROM users_new
  `);

  // 6. Создаем таблицу user_loyalty
  console.log('Creating user_loyalty table...');
  await db.run(`
    CREATE TABLE IF NOT EXISTS user_loyalty (
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
      FOREIGN KEY (user_id) REFERENCES users_new(id) ON DELETE CASCADE,
      FOREIGN KEY (referred_by) REFERENCES users_new(id)
    )
  `);

  // Создаем записи лояльности и генерируем реферальные коды
  await db.run(`
    INSERT OR IGNORE INTO user_loyalty (user_id, referral_code)
    SELECT 
      id,
      lower(hex(randomblob(4)) || substr(username, 1, 3))
    FROM users_new
  `);

  // 7. Создаем таблицу user_api_access
  console.log('Creating user_api_access table...');
  await db.run(`
    CREATE TABLE IF NOT EXISTS user_api_access (
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
      FOREIGN KEY (user_id) REFERENCES users_new(id) ON DELETE CASCADE
    )
  `);

  // 8. Создаем таблицу user_verification_tokens
  console.log('Creating user_verification_tokens table...');
  await db.run(`
    CREATE TABLE IF NOT EXISTS user_verification_tokens (
      -- ТОКЕНЫ ВЕРИФИКАЦИИ
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('email', 'phone', 'password_reset', 'api_activation')),
      expires_at DATETIME NOT NULL,
      used_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users_new(id) ON DELETE CASCADE
    )
  `);

  // 9. Создаем индексы
  console.log('Creating indexes...');
  
  // Индексы для основной таблицы users
  await db.run('CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users_new(email_verified)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_users_status ON users_new(status)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_users_roles ON users_new(is_admin, is_moderator)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_users_last_login ON users_new(last_login_at)');
  
  // Индексы для user_profiles
  await db.run('CREATE INDEX IF NOT EXISTS idx_user_profiles_company ON user_profiles(company_name)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_user_profiles_verified ON user_profiles(company_verified)');
  
  // Индексы для user_finances
  await db.run('CREATE INDEX IF NOT EXISTS idx_user_finances_subscription ON user_finances(subscription_plan)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_user_finances_balance ON user_finances(balance)');
  
  // Индексы для user_loyalty
  await db.run('CREATE INDEX IF NOT EXISTS idx_user_loyalty_level ON user_loyalty(loyalty_level)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_user_loyalty_referral_code ON user_loyalty(referral_code)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_user_loyalty_referred_by ON user_loyalty(referred_by)');
  
  // Индексы для user_api_access
  await db.run('CREATE INDEX IF NOT EXISTS idx_user_api_access_user ON user_api_access(user_id)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_user_api_access_key ON user_api_access(api_key)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_user_api_access_active ON user_api_access(is_active)');
  
  // Индексы для user_verification_tokens
  await db.run('CREATE INDEX IF NOT EXISTS idx_user_verification_tokens_user ON user_verification_tokens(user_id)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_user_verification_tokens_token ON user_verification_tokens(token)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_user_verification_tokens_type ON user_verification_tokens(type)');

  // 10. Удаляем старые триггеры
  console.log('Dropping old triggers...');
  await db.run('DROP TRIGGER IF EXISTS update_users_updated_at');
  await db.run('DROP TRIGGER IF EXISTS update_users_timestamp');
  await db.run('DROP TRIGGER IF EXISTS update_user_profiles_timestamp');
  await db.run('DROP TRIGGER IF EXISTS update_user_finances_timestamp');
  await db.run('DROP TRIGGER IF EXISTS update_user_loyalty_timestamp');
  await db.run('DROP TRIGGER IF EXISTS update_user_login_stats');
  await db.run('DROP TRIGGER IF EXISTS sync_platform_owner_verified');

  // 11. Создаем новые триггеры
  console.log('Creating triggers...');
  
  // Триггер для обновления updated_at в users
  await db.run(`
    CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
    AFTER UPDATE ON users_new
    BEGIN
      UPDATE users_new SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `);

  // Триггер для обновления updated_at в user_profiles
  await db.run(`
    CREATE TRIGGER IF NOT EXISTS update_user_profiles_timestamp 
    AFTER UPDATE ON user_profiles
    BEGIN
      UPDATE user_profiles SET updated_at = CURRENT_TIMESTAMP WHERE user_id = NEW.user_id;
    END
  `);

  // Триггер для обновления updated_at в user_finances
  await db.run(`
    CREATE TRIGGER IF NOT EXISTS update_user_finances_timestamp 
    AFTER UPDATE ON user_finances
    BEGIN
      UPDATE user_finances SET updated_at = CURRENT_TIMESTAMP WHERE user_id = NEW.user_id;
    END
  `);

  // Триггер для обновления updated_at в user_loyalty
  await db.run(`
    CREATE TRIGGER IF NOT EXISTS update_user_loyalty_timestamp 
    AFTER UPDATE ON user_loyalty
    BEGIN
      UPDATE user_loyalty SET updated_at = CURRENT_TIMESTAMP WHERE user_id = NEW.user_id;
    END
  `);

  // Триггер для обновления login_count и last_login_at
  await db.run(`
    CREATE TRIGGER IF NOT EXISTS update_user_login_stats
    AFTER UPDATE OF last_login_at ON users_new
    WHEN NEW.last_login_at != OLD.last_login_at
    BEGIN
      UPDATE users_new 
      SET login_count = login_count + 1 
      WHERE id = NEW.id;
    END
  `);

  // 12. Заменяем старую таблицу users на новую
  console.log('Replacing old users table...');
  await db.run('DROP TABLE IF EXISTS users');
  await db.run('ALTER TABLE users_new RENAME TO users');

  // 13. Создаем представления с правильными ссылками
  console.log('Creating views...');
  
  // Представление с полной информацией о пользователе
  await db.run(`
    CREATE VIEW IF NOT EXISTS user_full_info AS
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
  `);

  // Представление для активных подписок
  await db.run(`
    CREATE VIEW IF NOT EXISTS active_subscriptions AS
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
  `);

  // 14. Восстанавливаем представления, которые зависят от users
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

  console.log('✅ Users table split migration completed successfully');
}

/**
 * Откатывает миграцию - объединяет таблицы обратно в одну
 * @param {import('./migrationRunner')} db - Экземпляр MigrationRunner
 */
async function down(db) {
  console.log('Rolling back users table split migration...');

  // 1. Удаляем представления, которые зависят от users
  console.log('Dropping dependent views...');
  await db.run('DROP VIEW IF EXISTS active_verified_platforms');
  await db.run('DROP VIEW IF EXISTS active_campaign_placements');
  await db.run('DROP VIEW IF EXISTS platform_statistics');
  await db.run('DROP VIEW IF EXISTS user_full_info');
  await db.run('DROP VIEW IF EXISTS active_subscriptions');

  // 2. Создаем старую структуру таблицы users
  await db.run(`
    CREATE TABLE IF NOT EXISTS users_old (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      is_moderator INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 3. Копируем данные обратно из основной таблицы
  await db.run(`
    INSERT OR IGNORE INTO users_old (
      id, username, email, password_hash,
      is_admin, is_moderator,
      created_at, updated_at
    )
    SELECT 
      id, username, email, password_hash,
      is_admin, is_moderator,
      created_at, updated_at
    FROM users
  `);

  // 4. Удаляем триггеры
  console.log('Dropping triggers...');
  await db.run('DROP TRIGGER IF EXISTS update_users_timestamp');
  await db.run('DROP TRIGGER IF EXISTS update_user_profiles_timestamp');
  await db.run('DROP TRIGGER IF EXISTS update_user_finances_timestamp');
  await db.run('DROP TRIGGER IF EXISTS update_user_loyalty_timestamp');
  await db.run('DROP TRIGGER IF EXISTS update_user_login_stats');
  await db.run('DROP TRIGGER IF EXISTS sync_platform_owner_verified');

  // 5. Удаляем индексы
  console.log('Dropping indexes...');
  const indexesToDrop = [
    'idx_users_email_verified',
    'idx_users_status',
    'idx_users_roles',
    'idx_users_last_login',
    'idx_user_profiles_company',
    'idx_user_profiles_verified',
    'idx_user_finances_subscription',
    'idx_user_finances_balance',
    'idx_user_loyalty_level',
    'idx_user_loyalty_referral_code',
    'idx_user_loyalty_referred_by',
    'idx_user_api_access_user',
    'idx_user_api_access_key',
    'idx_user_api_access_active',
    'idx_user_verification_tokens_user',
    'idx_user_verification_tokens_token',
    'idx_user_verification_tokens_type'
  ];

  for (const indexName of indexesToDrop) {
    await db.run(`DROP INDEX IF EXISTS ${indexName}`);
  }

  // 6. Удаляем новые таблицы
  console.log('Dropping new tables...');
  await db.run('DROP TABLE IF EXISTS user_verification_tokens');
  await db.run('DROP TABLE IF EXISTS user_api_access');
  await db.run('DROP TABLE IF EXISTS user_loyalty');
  await db.run('DROP TABLE IF EXISTS user_finances');
  await db.run('DROP TABLE IF EXISTS user_profiles');

  // 7. Заменяем таблицу users на старую версию
  await db.run('DROP TABLE IF EXISTS users');
  await db.run('ALTER TABLE users_old RENAME TO users');

  // 8. Восстанавливаем старый триггер для updated_at
  await db.run(`
    CREATE TRIGGER IF NOT EXISTS update_users_updated_at 
    AFTER UPDATE ON users
    BEGIN
      UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `);

  // 9. Восстанавливаем представления с исходной структурой
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

  console.log('✅ Users table split migration rolled back successfully');
}

module.exports = { up, down };