// controllers/campaignController.js

const Campaign = require('../models/campaignModel');
const logger = require('../utils/logger');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/responseFormatter');

/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('express').NextFunction} NextFunction
 */

/**
 * Контроллер для управления рекламными кампаниями
 * @module controllers/campaignController
 */
const campaignController = {
  /**
   * Создает новую рекламную кампанию
   * @async
   * @param {Request} req - Express request объект
   * @param {Response} res - Express response объект
   * @param {NextFunction} next - Express next middleware
   * @returns {Promise<void>}
   */
  async createCampaign(req, res, next) {
    try {
      // Извлекаем ID пользователя из JWT токена
      const userId = req.user.user_id || req.user.id;
    
      // Если user_id все еще не найден, берем из body
      if (!userId && req.body.user_id) {
        userId = req.body.user_id;
      }

       if (!userId) {
      return res.status(400).json(errorResponse('User ID is required', 400));
      
    }
      // Получаем данные кампании из тела запроса
      const campaignData = req.body;
      // Удаляем user_id из campaignData, чтобы не дублировать
      delete campaignData.user_id;
      // Валидация дат
      const startDate = new Date(campaignData.start_date);
      const endDate = new Date(campaignData.end_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (startDate < today) {
        return res.status(400).json(errorResponse('Start date cannot be in the past', 400));
      }

      if (endDate <= startDate) {
        return res.status(400).json(errorResponse('End date must be after start date', 400));
      }

      // Создаем кампанию
      const campaign = await Campaign.create(userId, campaignData);

      logger.info(`Campaign created: ${campaign.id} by user ${userId}`);

      res.status(201).json(successResponse(campaign, "Campaign created successfully"));
    } catch (error) {
      logger.error('Error creating campaign:', error);
      next(error);
    }
  },

  /**
   * Получает список всех кампаний с фильтрацией и пагинацией
   * @async
   * @param {Request} req - Express request объект
   * @param {Response} res - Express response объект
   * @param {NextFunction} next - Express next middleware
   * @returns {Promise<void>}
   */
  async getAllCampaigns(req, res, next) {
    try {
      // Извлекаем параметры фильтрации из query string
      const filters = {
        user_id: req.query.user_id,
        status: req.query.status,
        approval_status: req.query.approval_status,
        objective: req.query.objective,
        search: req.query.search,
        date_from: req.query.date_from,
        date_to: req.query.date_to,
        budget_min: req.query.budget_min ? parseFloat(req.query.budget_min) : undefined,
        budget_max: req.query.budget_max ? parseFloat(req.query.budget_max) : undefined,
        include_deleted: req.query.include_deleted === 'true',
        sort: req.query.sort || 'created_at:desc',
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20
      };

      // Если пользователь не админ/модератор, показываем только его кампании
      if (!req.user.is_Admin && !req.user.is_Moderator) {
        filters.user_id = req.user.id;
        filters.include_deleted = false; // Обычные пользователи не видят удаленные
      }

      // Получаем кампании
      const result = await Campaign.findAll(filters);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
      res.json(paginatedResponse(result.data, result.pagination.page, result.pagination.limit, result.pagination.total));
    } catch (error) {
      logger.error('Error fetching campaigns:', error);
      next(error);
    }
  },

  /**
   * Получает кампанию по ID
   * @async
   * @param {Request} req - Express request объект
   * @param {Response} res - Express response объект
   * @param {NextFunction} next - Express next middleware
   * @returns {Promise<void>}
   */
  async getCampaignById(req, res, next) {
    try {
      const campaignId = parseInt(req.params.id);

      if (!campaignId) {
        return res.status(400).json(errorResponse("Invalid campaign ID", 400));
      }

      const campaign = await Campaign.findById(campaignId);

      if (!campaign) {
        return res.status(404).json(errorResponse("Campaign not found", 404));
      }

      // Проверяем права доступа
      if (!req.user.is_Admin && !req.user.is_Moderator && campaign.user_id !== req.user.id) {
        // Проверяем видимость кампании
        if (campaign.visibility === 'private' || campaign.deleted_at) {
          return res.status(403).json(errorResponse("Access denied", 403));
        }
      }

      // Добавляем расчетные поля
      campaign.completion_rate = Campaign.calculateCompletionRate(campaign);

      res.json(successResponse(campaign, "Campaign retrieved"));
    } catch (error) {
      logger.error('Error fetching campaign:', error);
      next(error);
    }
  },

  /**
   * Обновляет кампанию
   * @async
   * @param {Request} req - Express request объект
   * @param {Response} res - Express response объект
   * @param {NextFunction} next - Express next middleware
   * @returns {Promise<void>}
   */
  async updateCampaign(req, res, next) {
    try {
      const campaignId = parseInt(req.params.id);
      const userId = req.user.id;
      const updates = req.body;

      if (!campaignId) {
        return res.status(400).json(errorResponse("Invalid campaign ID", 400));
      }

      // Проверяем существование кампании
      const existingCampaign = await Campaign.findById(campaignId);
      if (!existingCampaign) {
        return res.status(404).json(errorResponse("Campaign not found", 404));
      }


      // Проверяем статус - нельзя редактировать активные/завершенные кампании
      if (['active', 'completed'].includes(existingCampaign.status) && !req.user.is_Admin) {
        return res.status(400).json(errorResponse(`Cannot edit campaign with status: ${existingCampaign.status}`, 400));
      }

      // Валидация дат, если они обновляются
      if (updates.start_date || updates.end_date) {
        const startDate = new Date(updates.start_date || existingCampaign.start_date);
        const endDate = new Date(updates.end_date || existingCampaign.end_date);

        if (endDate <= startDate) {
          return res.status(400).json(errorResponse("End date must be after start date", 400));
        }
      }

      // Обновляем кампанию
      const updatedCampaign = await Campaign.update(campaignId, userId, updates);

      logger.info(`Campaign updated: ${campaignId} by user ${userId}`);
      res.json(successResponse(updatedCampaign, "Campaign updated successfully"));
    } catch (error) {
      logger.error('Error updating campaign:', error);

      if (error.message === 'Unauthorized to edit this campaign') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      next(error);
    }
  },

  /**
   * Изменяет статус кампании
   * @async
   * @param {Request} req - Express request объект
   * @param {Response} res - Express response объект
   * @param {NextFunction} next - Express next middleware
   * @returns {Promise<void>}
   */
  async updateCampaignStatus(req, res, next) {
    try {
      const campaignId = parseInt(req.params.id);
      const { status } = req.body;
      const userId = req.user.id;

      if (!campaignId) {
        return res.status(400).json(errorResponse("Invalid campaign ID", 400));
      }

      if (!status) {
        return res.status(400).json(errorResponse("Status required", 400));
      }

      // Специальная логика для отправки на модерацию
      if (status === 'pending_approval') {
        const campaign = await Campaign.findById(campaignId);

        if (!campaign) {
          return res.status(404).json(errorResponse("Campaign not found", 404));
        }

        // Проверяем, что кампания готова к модерации
        if (!campaign.title || !campaign.budget_total || !campaign.start_date || !campaign.end_date) {
          return res.status(400).json(errorResponse("Campaign must have all required fields before submission", 400));
        }

        // Проверяем, что есть хотя бы один креатив
        if (!campaign.creative_assets || campaign.creative_assets.length === 0) {
          return res.status(400).json(errorResponse("Campaign must have at least one creative asset", 400));
        }
      }

      const updatedCampaign = await Campaign.updateStatus(campaignId, status, userId);

      logger.info(`Campaign status updated: ${campaignId} to ${status} by user ${userId}`);
        res.json(successResponse(updatedCampaign, `Campaign status updated to ${status}`));
    } catch (error) {
      logger.error('Error updating campaign status:', error);

      if (error.message.includes('Invalid status transition')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      next(error);
    }
  },

  /**
   * Модерирует кампанию (только для модераторов/админов)
   * @async
   * @param {Request} req - Express request объект
   * @param {Response} res - Express response объект
   * @param {NextFunction} next - Express next middleware
   * @returns {Promise<void>}
   */
  async moderateCampaign(req, res, next) {
    try {
      const campaignId = parseInt(req.params.id);
      const { decision, notes } = req.body;
      const moderatorId = req.user.id;

      if (!campaignId) {
        return res.status(400).json(errorResponse("Invalid campaign ID", 400));
      }

      if (!decision || !['approved', 'rejected'].includes(decision)) {
        return res.status(400).json(errorResponse('Decision must be either "approved" or "rejected"', 400));
      }

      if (decision === 'rejected' && !notes) {
        return res.status(400).json(errorResponse('Notes are required when rejecting a campaign', 400));
      }

      const moderatedCampaign = await Campaign.moderate(campaignId, decision, moderatorId, notes);

      logger.info(`Campaign moderated: ${campaignId} - ${decision} by moderator ${moderatorId}`);


      res.json(successResponse(moderatedCampaign, `Campaign ${decision}`));
    } catch (error) {
      logger.error('Error moderating campaign:', error);

      if (error.message === 'Campaign not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Campaign is not pending approval') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      next(error);
    }
  },

  /**
   * Удаляет кампанию (soft delete)
   * @async
   * @param {Request} req - Express request объект
   * @param {Response} res - Express response объект
   * @param {NextFunction} next - Express next middleware
   * @returns {Promise<void>}
   */
  async deleteCampaign(req, res, next) {
    try {
      const campaignId = parseInt(req.params.id);
      const userId = req.user.id;

      if (!campaignId) {
        return res.status(400).json(errorResponse("Invalid campaign ID", 400));
      }

      const deleted = await Campaign.softDelete(campaignId, userId);

      if (!deleted) {
        return res.status(404).json(errorResponse('Campaign not found or already deleted', 404));
      }

      logger.info(`Campaign soft deleted: ${campaignId} by user ${userId}`);

      res.json(successResponse(campaign, 'Campaign deleted successfully'));
    } catch (error) {
      logger.error('Error deleting campaign:', error);

      if (error.message === 'Campaign not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Unauthorized to delete this campaign') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      next(error);
    }
  },

  /**
   * Получает статистику кампаний для пользователя
   * @async
   * @param {Request} req - Express request объект
   * @param {Response} res - Express response объект
   * @param {NextFunction} next - Express next middleware
   * @returns {Promise<void>}
   */
  async getUserCampaignStats(req, res, next) {
    try {
      const userId = req.user.id;

      // Получаем все кампании пользователя
      const { data: campaigns } = await Campaign.findAll({
        user_id: userId,
        include_deleted: false,
        limit: 1000 // Получаем все для статистики
      });

      // Подсчитываем статистику
      const stats = {
        total: campaigns.length,
        by_status: {},
        total_budget: 0,
        total_spent: 0,
        active_campaigns: 0,
        completion_rate_avg: 0
      };

      campaigns.forEach(campaign => {
        // Подсчет по статусам
        stats.by_status[campaign.status] = (stats.by_status[campaign.status] || 0) + 1;

        // Суммы бюджетов
        stats.total_budget += parseFloat(campaign.budget_total) || 0;
        stats.total_spent += parseFloat(campaign.budget_spent) || 0;

        // Активные кампании
        if (campaign.status === 'active') {
          stats.active_campaigns++;
        }

        // Средний процент выполнения
        stats.completion_rate_avg += Campaign.calculateCompletionRate(campaign);
      });

      // Вычисляем средний процент выполнения
      if (campaigns.length > 0) {
        stats.completion_rate_avg = Math.round(stats.completion_rate_avg / campaigns.length);
      }

      res.json(successResponse(stats, "Campaign stats retrieved"));
    } catch (error) {
      logger.error('Error fetching campaign stats:', error);
      next(error);
    }
  }
};

module.exports = campaignController;