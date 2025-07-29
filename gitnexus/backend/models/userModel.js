// userModel.js - модули, работающие с базой данных и бизнес-логикой

const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const dbPath = path.join(__dirname, "../db/users.db");

const db = new sqlite3.Database(dbPath);

// Поиск пользователя по email или username
function getUserByUsernameOrEmail(username, email) {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM users WHERE username = ? OR email = ?", [username, email], (err, user) => {
      if (err) reject(err);
      else resolve(user);
    });
  });
}

// Создание нового пользователя
function createUser(username, email, password_hash, is_admin = 0, is_moderator = 0) {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO users (username, email, password_hash, is_admin, is_moderator) VALUES (?, ?, ?, ?, ?)",
      [username, email, password_hash, is_admin, is_moderator],
      function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

// Получение списка всех пользователей
function getAllUsers() {
  return new Promise((resolve, reject) => {
    db.all("SELECT id, username, email, is_admin, is_moderator FROM users", (err, users) => {
      if (err) reject(err);
      else resolve(users);
    });
  });
}

function getUserById(id) {
    return new Promise((resolve, reject) => {
    db.get("SELECT id, username, email, is_admin, is_moderator FROM users WHERE id = ?", [id], (err, user) => {
      if (err) reject(err);
      else resolve(user);
    });
  });
}

// Обновление данных пользователя
function updateUser(userId, data) {
  const { username, email, password_hash, is_admin, is_moderator } = data;
  return new Promise((resolve, reject) => {
    const query = password_hash 
      ? "UPDATE users SET username = ?, email = ?, password_hash = ?, is_admin = ?, is_moderator = ? WHERE id = ?" 
      : "UPDATE users SET username = ?, email = ?, is_admin = ?, is_moderator = ? WHERE id = ?";
    const params = password_hash
      ? [username, email, password_hash, is_admin, is_moderator, userId]
      : [username, email, is_admin, is_moderator, userId];

    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}

// Удаление пользователя
function deleteUser(userId) {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM users WHERE id = ?", [userId], function (err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}

module.exports = { 
  getUserByUsernameOrEmail,
  createUser, 
  getAllUsers, 
  getUserById,
  updateUser, 
  deleteUser
};