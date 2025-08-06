// Фильтры и сортировка в админке

// Добавить изменение пароля для пользователя в админке

// Вывод лога ошибок в файл
    -Проверить чтобы вывод всех ошибок работал
    -По возможности автоматизировать тесты

// Задокументировать все файлы JS JSDoc
    -Как читать JSDoc документирование

// Санитизация Input-ов для безопасности
    // middleware/sanitizeInput.js
    function sanitizeRegistration(req, res, next) {
        // Удаляем потенциально опасные поля
        delete req.body.is_admin;
        delete req.body.is_moderator;
        delete req.body.id;
        next();
    }
    // В routes
    router.post("/register", sanitizeRegistration, userController.registerUser);

// Добавить будущие функции в текущие сервисы
    Кампании
    -теги
    -обращение к нейросети


// prompts
    ВСЕГДА первой строкой файла указывай путь к нему в формате // *project*/backend:frontend/.../filename.js
    ВСЕГДА всё подробно документируй в формате JSDoc и комментируй. 
    ВСЕГДА тестируй свой код, перепроверяй экспорты, импорты и соответствие текущей архитектуре.
