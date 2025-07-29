// migrations/migrationRunner.js
const fs = require('fs').promises;
const path = require('path');
const db = require('../config/database');

/**
 * Создает таблицу для отслеживания выполненных миграций
 */
async function createMigrationsTable() {
  await db.run(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * Выполняет все невыполненные миграции
 */
async function runMigrations() {
  await createMigrationsTable();
  
  // Получаем список выполненных миграций
  const executedMigrations = await db.all('SELECT name FROM migrations');
  const executed = new Set(executedMigrations.map(m => m.name));
  
  // Читаем все файлы миграций
  const migrationsDir = path.join(__dirname);
  const files = await fs.readdir(migrationsDir);
  const migrationFiles = files
    .filter(f => f.endsWith('.js') && f !== 'migrationRunner.js')
    .sort(); // Важно выполнять в правильном порядке
  
  for (const file of migrationFiles) {
    if (!executed.has(file)) {
      console.log(`Running migration: ${file}`);
      const migration = require(path.join(migrationsDir, file));
      
      try {
        await migration.up();
        await db.run('INSERT INTO migrations (name) VALUES (?)', [file]);
        console.log(`Migration ${file} completed successfully`);
      } catch (error) {
        console.error(`Migration ${file} failed:`, error);
        throw error;
      }
    }
  }
}

module.exports = { runMigrations };