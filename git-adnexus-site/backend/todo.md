// Лист опций в БД

    - CHECK в БД

        CREATE TABLE campaigns (
        -- ... другие поля ...
        status TEXT CHECK (status IN ('draft', 'pending', 'active', 'finished')) DEFAULT 'pending'
        );

    - Триггеры

        CREATE TRIGGER validate_status BEFORE INSERT ON campaigns
        FOR EACH ROW
        WHEN NEW.status NOT IN ('draft', 'pending', 'active', 'finished')
        BEGIN
            SELECT RAISE(ABORT, 'Недопустимый статус');
        END;

    - Внешние ограничение
        - На фронтенде: Выпадающий список <select> в HTML с опциями "draft", "pending" и т.д.
        - На бэкенде: Валидация с Joi (как в предыдущем сообщении) перед записью в БД.

    Когда использовать:
        Для простых случаев (как ваш status) — CHECK constraints достаточно.
        Для сложных — triggers или внешняя валидация.
        Резервная СУБД не нужна: Это не про резерв, а про валидацию данных. Если БД упадет, нужна репликация (отдельная тема).

// Фильтры и сортировка

// Вывод лога ошибок в файл
    npm install winston                                                      <<--------------
    
    - 