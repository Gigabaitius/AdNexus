/**
 * *project*\backend/routes/campaignRoutes.js
 * Маршруты для работы с кампаниями
 */

const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const { requireAuth } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validationMiddleware');
const { 
  campaignCreateSchema, 
  campaignUpdateSchema 
} = require('../validation/campaignSchemas');

// Все маршруты требуют аутентификации
router.use(requireAuth);

// Основные CRUD операции
router.post('/', validateRequest(campaignCreateSchema), campaignController.createCampaign);
router.get('/', campaignController.getUserCampaigns);
router.get('/stats', campaignController.getUserCampaignStats);
router.get('/check-name', campaignController.checkCampaignName);
router.get('/:id', campaignController.getCampaign);
router.put('/:id', validateRequest(campaignUpdateSchema), campaignController.updateCampaign);
router.delete('/:id', campaignController.deleteCampaign);

// Управление статусом
router.post('/:id/status', campaignController.updateCampaignStatus);

// Клонирование
router.post('/:id/clone', campaignController.cloneCampaign);

// Таргетинг
router.put('/:id/targeting', campaignController.updateTargeting);
router.post('/suggest-tags', campaignController.suggestTags);
router.post('/estimate-reach', campaignController.estimateReach);

// Аналитика и производительность
router.get('/:id/analytics', campaignController.getCampaignAnalytics);
router.get('/:id/benchmarks', campaignController.getCampaignBenchmarks);
router.get('/:id/recommendations', campaignController.getRecommendations);
router.get('/:id/anomalies', campaignController.detectAnomalies);
router.get('/:id/export', campaignController.exportCampaign);
router.post('/:id/metrics', campaignController.updateMetrics);

// Площадки
router.get('/:id/matching-platforms', campaignController.getMatchingPlatforms);

// Модерация (только для админов/модераторов)
router.get('/moderation', campaignController.getModerationQueue);
router.post('/:id/moderate', campaignController.moderateCampaign);

// Пакетные операции
router.post('/batch', campaignController.batchOperation);

module.exports = router;