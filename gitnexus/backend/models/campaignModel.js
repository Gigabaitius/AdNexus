// *project*/backend/models/campaignModel.js

const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const dbPath = path.join(__dirname, "../db/adCampaigns.db");

const db = new sqlite3.Database(dbPath);

// Создание таблицы (если не существует)
db.run(`
  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    budget REAL NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT,
    user_id INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'pending', 'active', 'finished')) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

// Получение кампаний с пагинацией и фильтрами
function getAllCampaignsPaginated(options) {
  const { page = 1, limit = 10, status } = options;  // Деструктуризация с значениями по умолчанию
  const offset = (page - 1) * limit;  // Расчет смещения

  return new Promise((resolve, reject) => {
    let query = "SELECT * FROM campaigns";
    let params = [];

    // Фильтр по статусу
    if (status) {
      query += " WHERE status = ?";
      params.push(status);
    }

    // Пагинация
    query += " LIMIT ? OFFSET ?";
    params.push(limit, offset);

    db.all(query, params, (err, campaigns) => {
      if (err) reject(err);
      else resolve(campaigns);
    });
  });
}

// Универсальный метод поиска кампаний с фильтрами, сортировкой и пагинацией
// filters: объект { field: { operator: value } }, например { status: { '=': 'active' }, budget: { '>': 1000 } }
// sort: объект { field: direction }, например { budget: 'desc' }
// page: номер страницы (начиная с 1), limit: элементов на странице
function searchCampaigns(filters = {}, sort = {}, page = 1, limit = 10) {
  return new Promise((resolve, reject) => {
    let query = "SELECT * FROM campaigns";
    let whereClauses = [];
    let params = [];
    let offset = (page - 1) * limit;

    // Строим WHERE-часть для фильтров
    Object.entries(filters).forEach(([field, condition]) => {
      const [operator, value] = Object.entries(condition)[0];  // Получаем первый (и единственный) оператор-значение
      switch (operator) {
        case '=':
          whereClauses.push(`${field} = ?`);
          params.push(value);
          break;
        case '>':
        case '<':
        case '>=':
        case '<=':
          whereClauses.push(`${field} ${operator} ?`);
          params.push(value);
          break;
        case 'contains':
          whereClauses.push(`${field} LIKE ?`);
          params.push(`%${value}%`);
          break;
        default:
          return reject(new Error(`Неподдерживаемый оператор: ${operator}`));
      }
    });

    if (whereClauses.length > 0) {
      query += " WHERE " + whereClauses.join(" AND ");
    }

    // Добавляем сортировку
    if (Object.keys(sort).length > 0) {
      const [field, direction] = Object.entries(sort)[0];
      query += ` ORDER BY ${field} ${direction.toUpperCase()}`;
    }

    // Добавляем пагинацию
    query += " LIMIT ? OFFSET ?";
    params.push(limit, offset);

    // Выполняем запрос
    db.all(query, params, (err, campaigns) => {
      if (err) reject(err);
      else resolve(campaigns);
    });
  });
}

// Получение кампаний пользователя
function getCampaignsByUserId(userId) {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM campaigns WHERE user_id = ?", [userId], (err, campaigns) => {
      if (err) reject(err);
      else resolve(campaigns);
    });
  });
}

// Получение одной кампании
function getCampaignById(id) {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM campaigns WHERE id = ?", [id], (err, campaign) => {
      if (err) reject(err);
      else resolve(campaign);
    });
  });
}

// Создание кампании
function createCampaign(campaignData) {
  const { title, description, budget, start_date, end_date, user_id, status } = campaignData;
  
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO campaigns (title, description, budget, start_date, end_date, user_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [title, description, budget, start_date, end_date, user_id, status || 'pending'],
      function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

// Обновление кампании
function updateCampaign(id, campaignData) {
  const { title, description, budget, start_date, end_date, status } = campaignData;
  
  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE campaigns SET title = ?, description = ?, budget = ?, start_date = ?, end_date = ?, status = ? WHERE id = ?",
      [title, description, budget, start_date, end_date, status, id],
      function (err) {
        if (err) reject(err);
        else resolve(this.changes);
      }
    );
  });
}

// Удаление кампании
function deleteCampaign(id) {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM campaigns WHERE id = ?", [id], function (err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}

module.exports = {
  getAllCampaignsPaginated,
  getCampaignsByUserId,
  getCampaignById,
  searchCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign
};