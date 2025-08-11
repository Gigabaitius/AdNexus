/**
 * @fileoverview Модель для работы с пользователями
 * @module models/userModel
 */

const bcrypt = require("bcrypt");
const { databases } = require('../config/database');

// Используем промисифицированные методы из database.js
const db = databases.main;

/**
 * Модель пользователя
 */
class User {
  /**
   * Создает нового пользователя
   * @param {Object} userData - Данные пользователя
   * @param {string} userData.username - Имя пользователя
   * @param {string} userData.email - Email
   * @param {string} userData.password - Пароль (будет хеширован)
   * @returns {Promise<number>} ID созданного пользователя
   */
  static async create({ username, email, hashedPassword }) {

    const result = await db.run(
      `INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)`,
      [username, email, hashedPassword]
    );

    return result.lastID;
  }

  /**
   * Находит пользователя по username
   * @param {string} username - Имя пользователя
   * @returns {Promise<Object|null>} Объект пользователя или null
   */
  static async findByUsername(username) {
    return db.get(
      `SELECT * FROM users WHERE username = ?`,
      [username]
    );
  }

  /**
   * Находит пользователя по email
   * @param {string} email - Email пользователя
   * @returns {Promise<Object|null>} Объект пользователя или null
   */
  static async findByEmail(email) {
    return db.get(
      `SELECT * FROM users WHERE email = ?`,
      [email]
    );
  }

  /**
   * Находит пользователя по username/email
   * @param {string} username - Username пользователя
   * @param {string} email - Email пользователя
   * @returns {Promise<Object|null>} Объект пользователя или null
   */
  static async findByUsernameAndEmail(username, email) {
    return db.get(
      `SELECT * FROM users WHERE username = ? OR email = ?`,
      [username, email]
    );
  }

  /**
   * Находит пользователя по usernameOrEmail
   * @param {string} usernameOrEmail - Username или Email пользователя
   * @returns {Promise<Object|null>} Объект пользователя или null
   */
  static async findByUsernameOrEmail(usernameOrEmail) {
    return db.get(
      `SELECT * FROM users WHERE username = ? OR email = ?`,
      [usernameOrEmail, usernameOrEmail]
    );
  }

  /**
   * Находит пользователя по ID
   * @param {number} id - ID пользователя
   * @returns {Promise<Object|null>} Объект пользователя или null
   */
  static async findById(id) {
    return db.get(
      `SELECT * FROM users WHERE id = ?`,
      [id]
    );
  }

  /**
   * Получает всех пользователей
   * @returns {Promise<Array>} Массив пользователей
   */
  static async findAll() {
    return db.all(`SELECT * FROM users`);
  }

  /**
   * Обновляет пользователя
   * @param {number} id - ID пользователя
   * @param {Object} updates - Объект с обновлениями
   * @returns {Promise<number>} Количество измененных строк
   */
  static async update(id, updates) {
    const fields = [];
    const values = [];

    // Динамически строим запрос
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) return 0;

    values.push(id);
    const result = await db.run(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return result.changes;
  }

  /**
   * Удаляет пользователя
   * @param {number} id - ID пользователя
   * @returns {Promise<number>} Количество удаленных строк
   */
  static async delete(id) {
    const result = await db.run(
      `DELETE FROM users WHERE id = ?`,
      [id]
    );
    return result.changes;
  }

  /**
   * Проверяет пароль пользователя
   * @param {string} password - Введенный пароль
   * @param {string} hashedPassword - Хешированный пароль из БД
   * @returns {Promise<boolean>} Результат проверки
   */
  static async verifyPassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  }

  // Отдельный метод для назначения прав (только для админов)
  static async grantAdminRights(userId) {
    const result = await db.run(
      `UPDATE users SET is_admin = 1 WHERE id = ?`,
      [userId]
    );
    return result.changes;
  }

  static async grantModeratorRights(userId) {
    const result = await db.run(
      `UPDATE users SET is_moderator = 1 WHERE id = ?`,
      [userId]
    );
    return result.changes;
  }
}

module.exports = User;