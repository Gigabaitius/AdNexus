require('dotenv').config({ path: './backend/.env' });

const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { authMiddleware, requireAdmin, requireModerator } = require("./middleware/authMiddleware");


const app = express();
const db = new sqlite3.Database("./backend/db/users.db");
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Создание таблицы (если не существует)
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT 0,
    is_moderator BOOLEAN NOT NULL DEFAULT 0
  )
`);

// Обработка POST-запроса на регистрацию
app.post("/register", (req, res) => {
  const { username, email, password } = req.body; //Считываем JSON из запроса
  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields required." });
  }
  db.get(
    "SELECT * FROM users WHERE username = ? OR email = ?",
    [String.username, email],
    (err, row) => {
      if (err) return res.status(500).json({ message: "Database error." });

      if (row) {
        if (row.username === username) {
          return res.status(409).json({ message: "Username already taken." });
        } else {
          return res.status(409).json({ message: "Email already registered." });
        }
      }

      // Хешируем пароль
      bcrypt.hash(password, 10, (err, hash) => {
        if (err)
          return res.status(500).json({ message: "Error hashing password." });

        // Вставляем пользователя
        db.run(
          "INSERT INTO users (username, email, password_hash, is_admin, is_moderator) VALUES (?, ?, ?, ?, ?)",
          [username, email, hash, 0, 0],
          function (err) {
            if (err) return res.status(500).json({ message: "Insert error." });
            res.status(201).json({ message: "User registered." });
          }
        );
      });
    }
  );
});

// Обработка GET-запроса на просмотр всех пользователей
app.get("/users", (req, res) => {
  db.all("SELECT * FROM users", [], (err, rows) => {
    if (err) return res.status(500).send("Ошибка чтения");
    res.json(rows);
  });
});

app.listen(PORT, () => {
  console.log("Сервер работает на http://localhost:", PORT);
  console.log("Сервер запущен из директории:", process.cwd());
});

// Обработка POST-запроса на логин
app.post("/login", (req, res) => {
  const { usernameOrEmail, password } = req.body; //Считываем JSON из запроса
  if (!usernameOrEmail || !password) {
    return res.status(400).json({ message: "All fields required." });
  }
  db.get(
    "SELECT * FROM users WHERE username = ? OR email = ?",
    [usernameOrEmail, usernameOrEmail],
    (err, row) => {
      if (err) return res.status(500).json({ message: "Database error." });

      if (!row) {
        return res
          .status(401)
          .json({ message: "Account with such credentials not registered." });
      };
      // Проверка пароля
      bcrypt.compare(password, row.password_hash, (err, result) => {
        if (result) {
          //Если данные совпали
          const SECRET_KEY = process.env.SECRET_KEY; //(Потом перенести в отдельный .env файл)
          const payload = {
            user_id: row.id,
            username: row.username,
            is_admin: row.is_admin,
            is_moderator: row.is_moderator
          };
          const options = {
            expiresIn: "72h",
          };
          const token = jwt.sign(payload, SECRET_KEY, options);//Создание токена
          return res.json({
            message: "Login successful", token, user: {
              id: row.id,
              username: row.username,
              is_admin: row.is_admin,
              is_moderator: row.is_moderator
            }
          });
        }
        else {
          return res
            .status(401)
            .json({ message: "Wrong username/email or password" });
        }
      });
    }
  );
});

// Кто я?
app.get("/me", authMiddleware, (req, res) => {
  res.json(req.user); // req.user будет добавлен в middleware
});
//Я админ?
app.get("/admin", authMiddleware, requireAdmin, (req, res) => {
  res.json(req.user);
});
//Я модератор?
app.get("/moderator", authMiddleware, requireModerator, (req, res) => {
  res.json(req.user);
});

// СОЗДАНИЕ НОВОГО ПОЛЬЗОВАТЕЛЯ (POST)
app.post("/users", authMiddleware, requireAdmin, (req, res) => {
  const { username, email, password, is_admin } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ message: "Все поля обязательно должны быть заполнены." });
  }
  // Проверка на существование пользователя
  db.get("SELECT * FROM users WHERE username = ? OR email = ?", [username, email], (err, row) => {
    if (err) return res.status(500).json({ message: "Ошибка в базе данных." });
    if (row) return res.status(409).json({ message: "Пользователь с таким именем или email уже существует." });
    // Хэшируем пароль
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) return res.status(500).json({ message: "Ошибка при шифровании пароля." });
      // Вставляем пользователя в базу данных
      db.run(
        "INSERT INTO users (username, email, password_hash, is_admin) VALUES (?, ?, ?, ?)",
        [username, email, hash, is_admin ? 1 : 0],
        function (err) {
          if (err) return res.status(500).json({ message: "Ошибка при добавлении пользователя." });
          res.status(201).json({ message: "Пользователь успешно создан.", userId: this.lastID });
        }
      );
    });
  });
});

// ОБНОВЛЕНИЕ ПОЛЬЗОВАТЕЛЯ (PUT)
// Ожидает JSON с обновленными данными: { username, email, password (опционально), is_admin }
app.put("/users/:id", authMiddleware, requireAdmin, (req, res) => {
  const userId = req.params.id;
  const { username, email, password, is_admin } = req.body;
  if (!username || !email) {
    return res.status(400).json({ message: "Имя и email обязательны." });
  }
  // Если передан новый пароль – хэшируем его, иначе обновляем только имя и email
  if (password) {
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) return res.status(500).json({ message: "Ошибка при шифровании пароля." });
      db.run(
        "UPDATE users SET username = ?, email = ?, password_hash = ?, is_admin = ? WHERE id = ?",
        [username, email, hash, is_admin ? 1 : 0, userId],
        function (err) {
          if (err) return res.status(500).json({ message: "Ошибка при обновлении пользователя." });
          res.json({ message: "Пользователь обновлён." });
        }
      );
    });
  } else {
    // Обновляем без изменения пароля
    db.run(
      "UPDATE users SET username = ?, email = ?, is_admin = ? WHERE id = ?",
      [username, email, is_admin ? 1 : 0, userId],
      function (err) {
        if (err) return res.status(500).json({ message: "Ошибка при обновлении пользователя." });
        res.json({ message: "Пользователь обновлён." });
      }
    );
  }
});

// УДАЛЕНИЕ ПОЛЬЗОВАТЕЛЯ (DELETE)
// DELETE /users/ – удаляет пользователя по id
app.delete("/users/:id", authMiddleware, requireAdmin, (req, res) => {
  const userId = req.params.id;
  db.run("DELETE FROM users WHERE id = ?", [userId], function (err) {
    if (err) return res.status(500).json({ message: "Ошибка при удалении пользователя." });
    if (this.changes === 0) {
      return res.status(404).json({ message: "Пользователь не найден." });
    }
    res.json({ message: "Пользователь удалён." });
  });
});