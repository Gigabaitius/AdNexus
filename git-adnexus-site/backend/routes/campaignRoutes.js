// routes/campaignRoutes.js
const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const { authMiddleware, requireAdmin, requireModerator } = require('../middleware/authMiddleware');

// Получение всех кампаний (только для админов)
router.get('/campaigns', authMiddleware, requireAdmin, campaignController.getAllCampaigns);

// Получение кампаний текущего пользователя
router.get('/user/campaigns', authMiddleware, campaignController.getUserCampaigns);

// Получение одной кампании
router.get('/campaigns/:id', authMiddleware, campaignController.getCampaign);

// Создание кампании
router.post('/campaigns', authMiddleware, campaignController.createCampaign);

// Обновление кампании
router.put('/campaigns/:id', authMiddleware, campaignController.updateCampaign);

// Удаление кампании
router.delete('/campaigns/:id', authMiddleware, campaignController.deleteCampaign);

module.exports = router;