// Фильтры и сортировка в админке

// Добавить изменение пароля для пользователя в админке

// Вывод лога ошибок в файл
    -Проверить чтобы вывод всех ошибок работал
    -По возможности автоматизировать тесты

// Разобраться с миграциями
    -Я правильно понимаю, что это скрипты для изменения существующей БД, их задача - облегчить отслеживание версий БД и, при необходимости, быстро откатить версию?
    -Как с ними обычно работают?
    -Как их интегрировать?

// Разобраться с конфигом и database.js
    -Зачем нужна общая БД?
    -Что такое foreign keys?
    -Была идея облегчить переход с одной СУБД на другую методом использования псевдокоманд или как-то так. Этот файл имеет к этому отношение?
    -Как интегрировать это все?

// Задокументировать все файлы JS JSDoc
    -Как читать JSDoc документирование

// CAMPAIGNS
https://github.com/Gigabaitius/AdNexus/tree/v0.0.2
Обновленный репозиторий.
Текущая задача - переделываем сущность adCampaigns.

Сущность adCampaigns (рекламные кампании)
Структура полей:
{
  id: INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id: INTEGER NOT NULL FOREIGN KEY (users.id), // создатель кампании
  title: TEXT NOT NULL,
  description: TEXT,
  objective: TEXT, // 'brand_awareness', 'traffic', 'conversions', 'engagement'
  target_audience: JSON, // {"age_range": "18-35", "gender": "all", "interests": ["tech", "gaming"], "geo": ["US", "UK"]}
  budget_total: DECIMAL(10,2) NOT NULL,
  budget_daily: DECIMAL(10,2),
  budget_spent: DECIMAL(10,2) DEFAULT 0.00,
  budget_remaining: DECIMAL(10,2), // вычисляемое поле
  currency: TEXT DEFAULT 'USD',
  start_date: DATE NOT NULL,
  end_date: DATE NOT NULL,
  status: TEXT DEFAULT 'draft', // 'draft', 'pending_approval', 'active', 'paused', 'completed', 'rejected'
  approval_status: TEXT DEFAULT 'pending', // 'pending', 'approved', 'rejected'
  approval_notes: TEXT, // заметки модератора
  approved_by: INTEGER FOREIGN KEY (users.id), // ID модератора/админа
  approved_at: DATETIME,
  performance_metrics: JSON DEFAULT '{}', // {"impressions": 0, "clicks": 0, "ctr": 0, "conversions": 0, "cpc": 0, "roi": 0}
  creative_assets: JSON DEFAULT '[]', // [{"type": "image", "url": "...", "alt_text": "..."}, {"type": "video", "url": "..."}]
  landing_url: TEXT, // куда ведет реклама
  utm_parameters: JSON, // {"source": "adnexus", "medium": "cpc", "campaign": "..."}
  ai_generated: BOOLEAN DEFAULT FALSE, // использовалась ли AI-генерация
  ai_generation_data: JSON, // данные о AI-генерации
  visibility: TEXT DEFAULT 'public', // 'public', 'private', 'unlisted'
  is_featured: BOOLEAN DEFAULT FALSE, // продвигаемая кампания
  featured_until: DATETIME, // до когда продвигается
  completion_rate: DECIMAL(5,2) DEFAULT 0.00, // процент выполнения (0-100)
  quality_score: DECIMAL(3,2), // оценка качества кампании (0-10)
  created_at: DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at: DATETIME DEFAULT CURRENT_TIMESTAMP,
  launched_at: DATETIME, // когда была запущена впервые
  completed_at: DATETIME, // когда завершилась
  deleted_at: DATETIME // soft delete
}

Описание заполнения полей:

Поля, заполняемые пользователем через форму:
title - название кампании (обязательное текстовое поле)
description - описание кампании (текстовая область, опционально)
objective - цель кампании (выпадающий список с вариантами)
target_audience - целевая аудитория (комплексная форма с множественным выбором):
Возрастной диапазон (слайдер или селект)
Пол (чекбоксы)
Интересы (мультиселект с тегами)
География (мультиселект стран/регионов)
budget_total - общий бюджет (числовое поле с валидацией)
budget_daily - дневной лимит (опционально, числовое поле)
currency - валюта (селект, по умолчанию USD)
start_date - дата начала (календарь, не раньше текущей даты)
end_date - дата окончания (календарь, не раньше start_date)
creative_assets - креативы (загрузка файлов через drag&drop):
Изображения (jpg, png, webp)
Видео (mp4, webm)
Текстовые объявления
landing_url - целевая ссылка (поле URL с валидацией)
visibility - видимость кампании (радио-кнопки)

Поля, заполняемые автоматически системой:
id - автоинкремент при создании записи в БД
user_id - подставляется из JWT токена текущего пользователя
budget_spent - обновляется при обработке транзакций с площадками
budget_remaining - вычисляется как (budget_total - budget_spent)
status - изначально 'draft', меняется через state machine:
draft → pending_approval (при отправке на модерацию)
pending_approval → active/rejected (после модерации)
active → paused/completed (вручную или автоматически)
performance_metrics - обновляется через cron-job или webhooks от площадок:
Собирает данные с campaign_platforms
Агрегирует метрики
Вычисляет CTR, CPC, ROI
utm_parameters - генерируется автоматически на основе:
campaign_id для уникальности
title для читаемости
Может быть переопределено пользователем
completion_rate - вычисляется как:
По времени: (прошло дней / всего дней) * 100
По бюджету: (потрачено / общий бюджет) * 100
Берется максимальное значение
quality_score - рассчитывается алгоритмом на основе:
Заполненности полей
Качества креативов
Соответствия тегов целевой аудитории
Истории кампаний пользователя
created_at - timestamp создания записи
updated_at - обновляется триггером при любом изменении
Поля, заполняемые при определенных условиях:
approval_status - меняется модератором при проверке
approval_notes - заполняется модератором при отклонении
approved_by - ID модератора из JWT при одобрении/отклонении
approved_at - timestamp момента модерации
ai_generated - true, если использовалась AI-генерация
ai_generation_data - заполняется при AI-генерации:
Промпт пользователя
Использованная модель
Количество токенов
Сгенерированный контент
is_featured - устанавливается админом или через покупку продвижения
featured_until - дата окончания продвижения
launched_at - фиксируется при первом переходе в status='active'
completed_at - фиксируется при переходе в status='completed'
deleted_at - при soft delete (кампания скрывается, но данные сохраняются)

Процесс заполнения:
Создание кампании:

Пользователь заполняет форму
Frontend валидирует на клиенте
При отправке добавляется user_id из токена
Backend валидирует повторно (Joi)
Создается запись со status='draft'
Возвращается ID новой кампании
AI-ассистирование (опционально):

Пользователь может запросить AI-генерацию
Вводит базовую информацию о продукте/услуге
AI генерирует title, description, creative_assets (текст)
Предлагает target_audience на основе анализа
Данные подставляются в форму для редактирования
Отправка на модерацию:

Пользователь нажимает "Submit for approval"
Проверяется заполненность обязательных полей
status → 'pending_approval'
Создается уведомление для модераторов
Автоматические обновления:

Cron-job каждые 15 минут обновляет:
performance_metrics (собирает с площадок)
budget_spent (суммирует транзакции)
completion_rate (пересчитывает)
При достижении end_date или исчерпании бюджета:
status → 'completed'
Фиксируется completed_at
Запускается процесс финальных расчетов
Связанные процессы:

При создании campaign_platforms:
Резервируется часть budget_total
Создаются транзакции со status='on_hold'
При получении отчетов с площадок:
Обновляются метрики
Пересчитывается quality_score
Могут начисляться loyalty points

Задача комплексная, но MVC позволяет поэтапную реализацию. Сперва сделай model, потом контроллер и далее до frontend-а. Все подробно документируй JSDoc и комментируй. Перед созданием каждого этапа перепроверяй экспорты, импорты и соответствие текущей архитектуре.