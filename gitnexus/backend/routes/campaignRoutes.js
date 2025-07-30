// *project*/backend/routes/campaignRoutes.js

const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const { authMiddleware, requireAdmin, requireModerator } = require('../middleware/authMiddleware');
const { validateCampaign } = require('../validators/campaignValidator');

// Получение всех кампаний (только для админов)
router.get('/campaigns', authMiddleware, requireAdmin, campaignController.getAllCampaigns);
router.get('/campaigns', authMiddleware, requireAdmin, campaignController.searchCampaigns);

// Получение кампаний текущего пользователя
router.get('/user/campaigns', authMiddleware, campaignController.getUserCampaigns);

// Получение одной кампании
router.get('/campaigns/:id', authMiddleware, campaignController.getCampaign);

// Создание кампании
router.post('/campaigns', authMiddleware, validateCampaign, campaignController.createCampaign);

// Обновление кампании
router.put('/campaigns/:id', authMiddleware, validateCampaign, campaignController.updateCampaign);

// Удаление кампании
router.delete('/campaigns/:id', authMiddleware, campaignController.deleteCampaign);

module.exports = router;