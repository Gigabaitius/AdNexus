// *project*/backend/controllers/userController.js
// Controller (Контроллер) - связывает Model и View, обрабатывает HTTP запросы

const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.SECRET_KEY;
const { successResponse, errorResponse, paginatedResponse } = require('../utils/responseFormatter');

async function registerUser(req, res, next) {
  try {
    // Извлекаем данные пользователя из тела запроса
    const { username, email, password } = req.body;

    // Проверяем, что все обязательные поля заполнены
    if (!username || !email || !password) {
      return res.status(400).json(errorResponse("Все поля обязательны", 400 ));
    }

    // Проверяем, существует ли уже пользователь с таким именем или email
    const existing = await User.findByUsernameAndEmail(username, email);
    if (existing) {
      return res.status(409).json(errorResponse("Пользователь существует", 409 ));
    }

    // Хешируем пароль для безопасного хранения (соль генерируется автоматически)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создаем пользователя в базе данных
    const id = await User.create({ username, email, hashedPassword });

    // Отправляем успешный ответ с кодом 201 (Created)
    res.status(201).json(successResponse(id, 'Пользователь создан'));
  } catch (error) {
    // Обрабатываем ошибки и возвращаем сообщение об ошибке
    next(error);
  }
}

async function loginUser(req, res, next) {
  try {
    // Извлекаем данные из тела запроса
    const { usernameOrEmail, password } = req.body;

    // 1. Проверка обязательных полей
    if (!usernameOrEmail || !password) {
      return res
        .status(400)
        .json(errorResponse("Все поля обязательны", 400 ));
    }

    // 2. Ищем пользователя в БД по email или имени
    const existing = await User.findByUsernameOrEmail(
      usernameOrEmail,
    );

    // 3. Если нет пользователя - не уточняем, какое поле неправильное (лучше для безопасности)
    if (!existing) {
      return res
        .status(401)
        .json(errorResponse("Неверное имя пользователя/email или пароль", 400 ));
      }

    // 4. Валидируем пароль с помощью await и bcrypt
    const isPasswordValid = await bcrypt.compare(
      password,
      existing.password_hash
    );
    if (!isPasswordValid) {
      return res
        .status(401)
        .json(errorResponse("Неверное имя пользователя/email или пароль", 400 ));
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
  } catch (error) {
    // Логируем ошибку и отправляем общее сообщение об ошибке клиенту
    next(error);
  }
}

async function getUsers(req, res, next) {
  try {
    // Получаем список всех пользователей из базы данных
    const users = await User.findAll();

    // Отправляем список пользователей клиенту
    res.status(200).json(successResponse(users, 'Пользователи получены'));
  } catch (error) {
    // Обрабатываем ошибки при получении пользователей
    next(error);
  }
}

// Редактирование пользователя
/**
 * Открывает модальное окно для редактирования пользоватzеля и загружает данные.
 * @param {number} id - ID пользователя
 */
async function getUserById(req, res, next) {
  try {
    // Получаем ID пользователя из параметров запроса (URL)
    const userId = req.params.id;

    // Получаем пользователя из базы данных
    const user = await User.findById(userId);

    if (user) {
      res.status(200).json(successResponse(user, 'Пользователь получен'));
    }
    else {
      res.status(404).json(errorResponse('Пользователь не найден', 404));
    }
  }
  catch (error) {
    next(error);
  }
}

async function updateUser(req, res, next) {
  try {
    // Получаем ID пользователя из параметров запроса (URL)
    // Извлекаем данные для обновления из тела запроса
    const userId = req.params.id;
    const { username, email, password, is_admin, is_moderator } = req.body; //добавить в admin чекбокс is_moderator
    console.log('Saving user with data:', { username, email, is_admin, is_moderator });
    // Проверяем обязательные поля
    if (!username || !email) {
      return res.status(400).json(errorResponse("Имя и email обязательны", 400 ));
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
      } catch (error) {
        next(error);
      }
    }

    // Обновляем данные пользователя в базе
    const changes = await User.update(userId, updateData);

    // Проверяем, был ли обновлен пользователь
    // changes показывает количество измененных записей
    if (changes > 0) {
      // Успешное обновление - код 200 (OK)
      return res.status(200).json(successResponse("Запись успешно обновлена")); //Data?
    } else {
      // Пользователь не найден - код 404 (Not Found)
      return res.status(404).json(errorResponse("Пользователь не найден", 404 ));
    }
  } catch (error) {
    // Логируем ошибку и отправляем общее сообщение клиенту
    next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    // Получаем ID пользователя из параметров запроса (URL)
    const userId = req.params.id;

    // Удаляем пользователя из базы данных
    const changes = await User.delete(userId);

    // Проверяем, был ли удален пользователь
    if (changes > 0) {
      // Успешное удаление - код 200 (OK)
      return res.status(200).json(successResponse("Пользователь удалён"));
    } else {
      // Пользователь не найден - код 404 (Not Found)
      return res.status(404).json(errorResponse|("Пользователь не найден", 404));
    }
  } catch (error) {
    // Логируем ошибку и отправляем общее сообщение клиенту
    next(error);
  }
}

async function grantAdminRights(req, res, next) {
  try {
    // Получаем ID пользователя из параметров запроса (URL)
    const userId = req.params.id;

    // Даем пользователю права
    const changes = await User.grantAdminRights(userId);

    // Проверяем, были ли добавлены права пользователю
    if (changes > 0) {
      // Успешное изменение - код 200 (OK)
      return res.status(200).json(successResponse("Права администратора предоставлены"));
    } else {
      // Пользователь не найден - код 404 (Not Found)
      return res.status(404).json(errorResponse("Пользователь не найден", 404));
    }
  } catch (error) {
    // Логируем ошибку и отправляем общее сообщение клиенту
    next(error);
  }
}

async function grantModeratorRights(req, res, next) {
  try {
    // Получаем ID пользователя из параметров запроса (URL)
    const userId = req.params.id;

    // Даем пользователю права
    const changes = await User.grantModeratorRights(userId);

    // Проверяем, были ли добавлены права пользователю
    if (changes > 0) {
      // Успешное изменение - код 200 (OK)
      return res.status(200).json(successResponse("Права администратора предоставлены"));
    } else {
      // Пользователь не найден - код 404 (Not Found)
      return res.status(404).json(errorResponse("Пользователь не найден", 404));
    }
  } catch (error) {
    // Логируем ошибку и отправляем общее сообщение клиенту
    next(error);
  }
}

module.exports = { 
  registerUser, 
  loginUser, 
  getUsers, 
  getUserById, 
  updateUser, 
  deleteUser, 
  grantAdminRights, 
  grantModeratorRights,
};
