// models/campaignModel.js
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
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

// Получение всех кампаний
function getAllCampaigns() {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM campaigns", (err, campaigns) => {
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
  getAllCampaigns,
  getCampaignsByUserId,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign
};