// *project*\backend\routes\platformRoutes.js

const express = require('express');
const router = express.Router();
const platformController = require('../controllers/platformController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const platformValidation = require('../validators/platformValidation');

/**
 * @module routes/platforms
 * @description Маршруты для работы с рекламными площадками
 */

// ===== Публичные маршруты (требуют только аутентификации) =====

/**
 * GET /api/platforms
 * @description Получить список площадок с фильтрацией и пагинацией
 * @access Требует аутентификации. Обычные пользователи видят только активные площадки
 */
router.get('/platforms',
  authMiddleware,
  validate(platformValidation.getPlatformsQuery, 'query'),
  platformController.getAllPlatforms
);

/**
 * GET /api/platforms/check-url
 * @description Проверить доступность URL для регистрации
 * @access Требует аутентификации
 */
router.get('/platforms/check-url',
  authMiddleware,
  validate(platformValidation.checkUrl, 'query'),
  platformController.checkUrlAvailability
);

/**
 * GET /api/platforms/top
 * @description Получить топ площадок по различным критериям
 * @access Требует аутентификации
 */
router.get('/platforms/top',
  authMiddleware,
  validate(platformValidation.getTopPlatforms, 'query'),
  platformController.getTopPlatforms
);

/**
 * GET /api/platforms/stats
 * @description Получить статистику по площадкам текущего пользователя
 * @access Требует аутентификации
 */
router.get('/platforms/stats',
  authMiddleware,
  platformController.getUserPlatformStats
);

/**
 * GET /api/platforms/stats/:userId
 * @description Получить статистику по площадкам конкретного пользователя
 * @access Требует аутентификации. Другие пользователи доступны только админам/модераторам
 */
router.get('/platforms/stats/:userId',
  authMiddleware,
  platformController.getUserPlatformStats
);

/**
 * GET /api/platforms/:id
 * @description Получить детальную информацию о площадке
 * @access Требует аутентификации. Неактивные площадки доступны только владельцу
 */
router.get('/platforms/:id',
  authMiddleware,
  platformController.getPlatformById
);

/**
 * GET /api/platforms/:id/similar
 * @description Получить похожие площадки
 * @access Требует аутентификации
 */
router.get('/platforms/:id/similar',
  authMiddleware,
  validate(platformValidation.getSimilar, 'query'),
  platformController.getSimilarPlatforms
);

/**
 * POST /api/platforms
 * @description Создать новую рекламную площадку
 * @access Требует аутентификации
 */
router.post('/platforms',
  authMiddleware,
  validate(platformValidation.createPlatform),
  platformController.createPlatform
);

/**
 * PUT /api/platforms/:id
 * @description Обновить данные площадки
 * @access Требует аутентификации. Только владелец или админ
 */
router.put('/platforms/:id',
  authMiddleware,
  validate(platformValidation.updatePlatform),
  platformController.updatePlatform
);

/**
 * PATCH /api/platforms/:id/status
 * @description Изменить статус площадки
 * @access Требует аутентификации. Только владелец или админ
 */
router.patch('/platforms/:id/status',
  authMiddleware,
  validate(platformValidation.updateStatus),
  platformController.updatePlatformStatus
);

/**
 * DELETE /api/platforms/:id
 * @description Архивировать площадку
 * @access Требует аутентификации. Только владелец или админ
 */
router.delete('/platforms/:id',
  authMiddleware,
  platformController.archivePlatform
);

// ===== Административные маршруты (только для модераторов и админов) =====

/**
 * POST /api/platforms/:id/moderate
 * @description Модерировать площадку (одобрить/отклонить/требует изменений)
 * @access Требует роли модератора или администратора
 */
router.post('/platforms/:id/moderate',
  authMiddleware,
  requireRole(['admin', 'moderator']),
  validate(platformValidation.moderatePlatform),
  platformController.moderatePlatform
);

/**
 * PATCH /api/platforms/:id/verification
 * @description Обновить статус верификации площадки
 * @access Требует роли модератора или администратора
 */
router.patch('/platforms/:id/verification',
  authMiddleware,
  requireRole(['admin', 'moderator']),
  validate(platformValidation.updateVerification),
  platformController.updateVerificationStatus
);

/**
 * PATCH /api/platforms/:id/quality
 * @description Обновить метрики качества площадки
 * @access Требует роли модератора или администратора
 */
router.patch('/platforms/:id/quality',
  authMiddleware,
  requireRole(['admin', 'moderator']),
  validate(platformValidation.updateQuality),
  platformController.updateQualityMetrics
);

/**
 * GET /api/admin/platforms/pending
 * @description Получить список площадок, ожидающих модерации
 * @access Требует роли модератора или администратора
 */
router.get('/admin/platforms/pending',
  authMiddleware,
  requireRole(['admin', 'moderator']),
  platformController.getPendingModeration
);

/**
 * GET /api/admin/platforms/stats
 * @description Получить глобальную статистику по всем площадкам
 * @access Требует роли администратора
 */
router.get('/admin/platforms/stats',
  authMiddleware,
  requireRole(['admin']),
  platformController.getGlobalStats
);

/**
 * GET /api/admin/platforms/all
 * @description Получить все площадки (включая архивированные)
 * @access Требует роли администратора
 */
router.get('/admin/platforms/all',
  authMiddleware,
  requireRole(['admin']),
  async (req, res, next) => {
    // Админы видят все площадки без ограничений
    req.query.status = undefined; // Убираем фильтр по статусу
    platformController.getAllPlatforms(req, res, next);
  }
);

module.exports = router;