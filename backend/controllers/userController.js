// userController.js
const userModel = require("../models/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.SECRET_KEY;

async function registerUser(req, res) {
  try {
    // Извлекаем данные пользователя из тела запроса
    const { username, email, password } = req.body;

    // Проверяем, что все обязательные поля заполнены
    if (!username || !email || !password) {
      return res.status(400).json({ message: "Все поля обязательны" });
    }

    // Проверяем, существует ли уже пользователь с таким именем или email
    const existing = await userModel.getUserByUsernameOrEmail(username, email);
    if (existing) {
      return res.status(409).json({ message: "Пользователь существует" });
    }

    // Хешируем пароль для безопасного хранения (соль генерируется автоматически)
    const hash = await bcrypt.hash(password, 10);

    // Создаем пользователя в базе данных
    const id = await userModel.createUser(username, email, hash);

    // Отправляем успешный ответ с кодом 201 (Created)
    res.status(201).json({ id, message: "Пользователь создан" });
  } catch (err) {
    // Обрабатываем ошибки и возвращаем сообщение об ошибке
    console.error("Ошибка при регистрации пользователя:", err);
    res.status(500).json({ message: "Ошибка сервера при регистрации" });
  }
}

async function loginUser(req, res) {
  try {
    // Извлекаем данные из тела запроса
    const { usernameOrEmail, password } = req.body;

    // 1. Проверка обязательных полей
    if (!usernameOrEmail || !password) {
      return res.status(400).json({ message: "Все поля обязательны" });
    }

    // 2. Ищем пользователя в БД по email или имени
    const existing = await userModel.getUserByUsernameOrEmail(
      usernameOrEmail,
      usernameOrEmail
    );

    // 3. Если нет пользователя - не уточняем, какое поле неправильное (лучше для безопасности)
    if (!existing) {
      return res
        .status(401)
        .json({ message: "Неверное имя пользователя/email или пароль" });
    }

    // 4. Валидируем пароль с помощью await и bcrypt
    const isPasswordValid = await bcrypt.compare(
      password,
      existing.password_hash
    );
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ message: "Неверное имя пользователя/email или пароль" });
    }

    // 5. Создаем JWT-токен с информацией о пользователе
    const payload = {
      user_id: existing.id,
      username: existing.username,
      is_admin: existing.is_admin,
      is_moderator: existing.is_moderator,
    };

    // Подписываем токен с временем жизни 72 часа
    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "72h" });

    // 6. Отправляем успешный ответ с токеном и базовой информацией о пользователе
    res.status(200).json({
      message: "Успешный вход",
      token,
      user: {
        id: existing.id,
        username: existing.username,
        is_admin: existing.is_admin,
        is_moderator: existing.is_moderator,
      },
    });
  } catch (err) {
    // Логируем ошибку и отправляем общее сообщение об ошибке клиенту
    console.error("Ошибка при логине пользователя:", err);
    res.status(500).json({ message: "Ошибка сервера" });
  }
}

async function getUsers(req, res) {
  try {
    // Получаем список всех пользователей из базы данных
    const users = await userModel.getAllUsers();

    // Отправляем список пользователей клиенту
    res.status(200).json(users);
  } catch (err) {
    // Обрабатываем ошибки при получении пользователей
    console.error("Ошибка при получении списка пользователей:", err);
    res
      .status(500)
      .json({ message: "Не удалось получить список пользователей" });
  }
}

async function updateUser(req, res) {
  try {
    // Получаем ID пользователя из параметров запроса (URL)
    const userId = req.params.id;

    // Извлекаем данные для обновления из тела запроса
    const { username, email, password, is_admin, is_moderator } = req.body; //добавить в admin чекбокс is_moderator

    // Проверяем обязательные поля
    if (!username || !email) {
      return res.status(400).json({ message: "Имя и email обязательны" });
    }

    // Подготавливаем объект с данными для обновления
    const updateData = {
      username,
      email,
      is_admin: is_admin ? 1 : 0,
      is_moderator: is_moderator ? 1 : 0,
    };

    // Если передан пароль, хешируем его
    if (password) {
      try {
        // Хешируем пароль для безопасного хранения
        const hash = await bcrypt.hash(password, 10);

        // Добавляем хеш в объект обновления
        updateData.password_hash = hash;
      } catch (err) {
        return res
          .status(500)
          .json({ message: "Ошибка при шифровании пароля" });
      }
    }

    // Обновляем данные пользователя в базе
    const changes = await userModel.updateUser(userId, updateData);

    // Проверяем, был ли обновлен пользователь
    // changes показывает количество измененных записей
    if (changes > 0) {
      // Успешное обновление - код 200 (OK)
      return res.status(200).json({ message: "Пользователь обновлён" });
    } else {
      // Пользователь не найден - код 404 (Not Found)
      return res.status(404).json({ message: "Пользователь не найден" });
    }
  } catch (err) {
    // Логируем ошибку и отправляем общее сообщение клиенту
    console.error("Ошибка при обновлении пользователя:", err);
    res
      .status(500)
      .json({ message: "Ошибка сервера при обновлении пользователя" });
  }
}

async function deleteUser(req, res) {
  //проверить
  try {
    // Получаем ID пользователя из параметров запроса (URL)
    const userId = req.params.id;

    // Удаляем пользователя из базы данных
    const changes = await userModel.deleteUser(userId);

    // Проверяем, был ли удален пользователь
    if (changes > 0) {
      // Успешное удаление - код 200 (OK)
      return res.status(200).json({ message: "Пользователь удалён" });
    } else {
      // Пользователь не найден - код 404 (Not Found)
      return res.status(404).json({ message: "Пользователь не найден" });
    }
  } catch (err) {
    // Логируем ошибку и отправляем общее сообщение клиенту
    console.error("Ошибка при удалении пользователя:", err);
    res
      .status(500)
      .json({ message: "Ошибка сервера при удалении пользователя" });
  }
}

module.exports = { registerUser, loginUser, getUsers, updateUser, deleteUser };
