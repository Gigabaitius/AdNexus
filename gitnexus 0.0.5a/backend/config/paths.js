// config/paths.js - новый файл для централизации путей
const path = require('path');

module.exports = {
  // Единый путь к основной БД
  MAIN_DB: path.join(__dirname, '../db/adNexus.db'),
  
  // Пути к старым БД для миграции
  OLD_USERS_DB: path.join(__dirname, '../db/users.db'),
  OLD_CAMPAIGNS_DB: path.join(__dirname, '../db/adCampaigns.db'),
  
  // Директории
  LOGS_DIR: path.join(__dirname, '../logs'),
  MIGRATIONS_DIR: path.join(__dirname, '../migrations')
};