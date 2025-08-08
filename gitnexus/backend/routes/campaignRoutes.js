// routes/campaignRoutes.js

const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const campaignValidation = require('../validators/campaignValidation');

/**
 * @module routes/campaigns
 * @description Маршруты для работы с рекламными кампаниями
 */

// ===== Публичные маршруты (требуют только аутентификации) =====

/**
 * GET /api/campaigns
 * @description Получить список кампаний с фильтрацией и пагинацией
 * @access Требует аутентификации. Обычные пользователи видят только свои кампании
 */
router.get('/campaigns',
  authMiddleware,
  validate(campaignValidation.getCampaignsQuery, 'query'),
  campaignController.getAllCampaigns
);

/**
 * GET /api/campaigns/stats
 * @description Получить статистику по кампаниям текущего пользователя
 * @access Требует аутентификации
 */
router.get('/campaigns/stats',
  authMiddleware,
  campaignController.getUserCampaignStats
);

/**
 * GET /api/campaigns/:id
 * @description Получить детальную информацию о кампании
 * @access Требует аутентификации. Приватные кампании доступны только владельцу
 */
router.get('/campaigns/:id',
  authMiddleware,
  campaignController.getCampaignById
);

/**
 * POST /api/campaigns
 * @description Создать новую рекламную кампанию
 * @access Требует аутентификации
 */
router.post('/campaigns',
  authMiddleware,
  validate(campaignValidation.createCampaign),
  campaignController.createCampaign
);

/**
 * PUT /api/campaigns/:id
 * @description Обновить данные кампании
 * @access Требует аутентификации. Только владелец или админ
 */
router.put('/campaigns/:id',
  authMiddleware,
  validate(campaignValidation.updateCampaign),
  campaignController.updateCampaign
);

/**
 * PATCH /api/campaigns/:id/status
 * @description Изменить статус кампании
 * @access Требует аутентификации. Только владелец или админ
 */
router.patch('/campaigns/:id/status',
  authMiddleware,
  validate(campaignValidation.updateStatus),
  campaignController.updateCampaignStatus
);

/**
 * DELETE /api/campaigns/:id
 * @description Удалить кампанию (soft delete)
 * @access Требует аутентификации. Только владелец или админ
 */
router.delete('/campaigns/:id',
  authMiddleware,
  campaignController.deleteCampaign
);

// ===== Административные маршруты (только для модераторов и админов) =====

/**
 * POST /api/campaigns/:id/moderate
 * @description Модерировать кампанию (одобрить/отклонить)
 * @access Требует роли модератора или администратора
 */
router.post('/campaigns/:id/moderate',
  authMiddleware,
  requireRole(['admin', 'moderator']),
  validate(campaignValidation.moderateCampaign),
  campaignController.moderateCampaign
);

/**
 * GET /api/admin/campaigns/pending
 * @description Получить список кампаний, ожидающих модерации
 * @access Требует роли модератора или администратора
 */
router.get('/admin/campaigns/pending',
  authMiddleware,
  requireRole(['admin', 'moderator']),
  async (req, res, next) => {
    // Устанавливаем фильтр для pending кампаний
    req.query.status = 'pending_approval';
    req.query.sort = 'created_at:asc'; // Старые первыми
    campaignController.getAllCampaigns(req, res, next);
  }
);

/**
 * GET /api/admin/campaigns/all
 * @description Получить все кампании (включая удаленные)
 * @access Требует роли администратора
 */
router.get('/admin/campaigns/all',
  authMiddleware,
  requireRole(['admin']),
  async (req, res, next) => {
    // Админы видят все кампании
    req.query.include_deleted = 'true';
    campaignController.getAllCampaigns(req, res, next);
  }
);

module.exports = router;