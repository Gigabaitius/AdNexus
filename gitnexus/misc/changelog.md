0.0.4 - Platforms

// migrations
// Произведена миграция для создания таблицы платформ v1

// Добавлены:
backend\models\platformModel.js
backend\controllers\platformController.js
backend\routes\platformRoutes.js
backend\validators\platformValidation.js

// Базовый функционал активен


0.0.3 - Campaigns

// Campaigns are working, beta

// *project*/frontend/js/admin.js
// Исправляем получение userData в начале файла (строки 16-29)
// Добавлены проверки user_id и авторизации в saveCampaign
// Добавлены отладочные логи 35 541

// *project*/backend/controllers/campaignController.js - Create Campaign
// Добавлены проверки наличия user_id, продублировано получение

// *project*/backend/middleware/authMiddleware.js 
// - authMiddleware
// Нормализована структура user-объекта для распутывания req.user.user_id и req.user.id
//
// - requireAdmin/Moderator
// Исправлено сравнение поля прав с единицей, неактуальное после нормализации user-объекта 

// *project*/frontend/ccs/layout.js
// Добавлены глобальные стили для модальных окон