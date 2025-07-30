// *project*/backend/migrations/migrationRunner.js]

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises;
const path = require('path');

/**
 * Класс для управления миграциями базы данных
 */
class MigrationRunner {
  constructor(dbPath) {
    this.db = new sqlite3.Database(dbPath);
  }

  /**
   * Промисифицированная версия db.run
   */
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  /**
   * Промисифицированная версия db.all
   */
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  /**
   * Создает таблицу для отслеживания миграций
   */
  async createMigrationsTable() {
    await this.run(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT UNIQUE NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * Выполняет все невыполненные миграции
   */
  async runMigrations() {
    console.log('🔄 Starting migrations...');
    
    await this.createMigrationsTable();
    
    // Получаем выполненные миграции
    const executed = await this.all('SELECT filename FROM migrations');
    const executedSet = new Set(executed.map(m => m.filename));
    
    // Читаем файлы миграций
    const migrationsDir = __dirname;
    const files = await fs.readdir(migrationsDir);
    const migrationFiles = files
      .filter(f => f.match(/^\d{3}_.*\.js$/) && f !== 'migrationRunner.js')
      .sort();
    
    let migrationsRun = 0;
    
    for (const file of migrationFiles) {
      if (!executedSet.has(file)) {
        console.log(`📝 Running migration: ${file}`);
        
        try {
          const migration = require(path.join(migrationsDir, file));
          await migration.up(this);
          await this.run('INSERT INTO migrations (filename) VALUES (?)', [file]);
          console.log(`✅ Migration ${file} completed`);
          migrationsRun++;
        } catch (error) {
          console.error(`❌ Migration ${file} failed:`, error);
          throw error;
        }
      }
    }
    
    if (migrationsRun === 0) {
      console.log('✅ All migrations are up to date');
    } else {
      console.log(`✅ Completed ${migrationsRun} migrations`);
    }
  }

  /**
   * Откатывает последнюю миграцию
   */
  async rollbackLast() {
    const lastMigration = await this.all(
      'SELECT filename FROM migrations ORDER BY id DESC LIMIT 1'
    );
    
    if (lastMigration.length === 0) {
      console.log('No migrations to rollback');
      return;
    }
    
    const filename = lastMigration[0].filename;
    console.log(`🔙 Rolling back: ${filename}`);
    
    try {
      const migration = require(path.join(__dirname, filename));
      if (migration.down) {
        await migration.down(this);
        await this.run('DELETE FROM migrations WHERE filename = ?', [filename]);
        console.log(`✅ Rolled back: ${filename}`);
      } else {
        console.log(`⚠️  No rollback function for: ${filename}`);
      }
    } catch (error) {
      console.error(`❌ Rollback failed:`, error);
      throw error;
    }
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close(err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

// Скрипт для запуска миграций
if (require.main === module) {
  const dbPath = process.argv[2] || path.join(__dirname, '..', 'adNexus.db');
  const action = process.argv[3] || 'up';
  
  const runner = new MigrationRunner(dbPath);
  
  (async () => {
    try {
      if (action === 'up') {
        await runner.runMigrations();
      } else if (action === 'down') {
        await runner.rollbackLast();
      }
    } catch (error) {
      console.error('Migration error:', error);
      process.exit(1);
    } finally {
      await runner.close();
    }
  })();
}

module.exports = MigrationRunner;