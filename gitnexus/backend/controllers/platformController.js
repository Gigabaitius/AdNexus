// *project*\backend\controllers\platformController.js

const Platform = require('../models/platformModel');
const logger = require('../utils/logger');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/responseFormatter');

/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('express').NextFunction} NextFunction
 */

/**
 * Контроллер для управления рекламными площадками
 * @module controllers/platformController
 */
const platformController = {
  /**
   * Создает новую рекламную площадку
   * @async
   * @param {Request} req - Express request объект
   * @param {Response} res - Express response объект
   * @param {NextFunction} next - Express next middleware
   * @returns {Promise<void>}
   */
  async createPlatform(req, res, next) {
    try {
      // Извлекаем ID пользователя из JWT токена
      const userId = req.user.user_id || req.user.id;

      if (!userId) {
        return res.status(400).json(errorResponse('User ID is required', 400));
      }

      // Получаем данные площадки из тела запроса
      const platformData = req.body;
      
      // Проверяем обязательные поля
      if (!platformData.name || !platformData.type || !platformData.url || !platformData.pricing_model) {
        return res.status(400).json(errorResponse('Name, type, URL and pricing model are required', 400));
      }

      // Проверяем уникальность URL
      const isUrlAvailable = await Platform.checkUrlAvailability(platformData.url);
      if (!isUrlAvailable) {
        return res.status(400).json(errorResponse('This URL is already registered', 400));
      }

      // Создаем площадку
      const platform = await Platform.create(userId, platformData);

      logger.info(`Platform created: ${platform.id} by user ${userId}`);

      res.status(201).json(successResponse(platform, "Platform created successfully"));
    } catch (error) {
      logger.error('Error creating platform:', error);
      
      if (error.message.includes('Invalid platform type')) {
        return res.status(400).json(errorResponse(error.message, 400));
      }
      
      if (error.message.includes('Invalid pricing model')) {
        return res.status(400).json(errorResponse(error.message, 400));
      }

      next(error);
    }
  },

  /**
   * Получает список всех площадок с фильтрацией и пагинацией
   * @async
   * @param {Request} req - Express request объект
   * @param {Response} res - Express response объект
   * @param {NextFunction} next - Express next middleware
   * @returns {Promise<void>}
   */
  async getAllPlatforms(req, res, next) {
    try {
      // Извлекаем параметры фильтрации из query string
      const filters = {
        user_id: req.query.user_id,
        type: req.query.type,
        status: req.query.status,
        moderation_status: req.query.moderation_status,
        verification_status: req.query.verification_status,
        pricing_model: req.query.pricing_model,
        currency: req.query.currency,
        audience_min: req.query.audience_min ? parseInt(req.query.audience_min) : undefined,
        audience_max: req.query.audience_max ? parseInt(req.query.audience_max) : undefined,
        price_max: req.query.price_max ? parseFloat(req.query.price_max) : undefined,
        search: req.query.search,
        sort: req.query.sort || 'created_at:desc',
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20
      };

      // Если пользователь не админ/модератор, не показываем черновики других пользователей
      if (!req.user.is_admin && !req.user.is_moderator) {
        if (!filters.user_id || filters.user_id !== req.user.id.toString()) {
          // Показываем только активные площадки других пользователей
          filters.status = 'active';
        }
      }

      // Получаем площадки
      const result = await Platform.findAll(filters);

      // Для каждой площадки рассчитываем качественный показатель
      result.data.forEach(platform => {
        platform.calculated_quality_score = Platform.calculateQualityScore(platform);
      });

      res.json(paginatedResponse(result.data, result.pagination.page, result.pagination.limit, result.pagination.total));
    } catch (error) {
      logger.error('Error fetching platforms:', error);
      next(error);
    }
  },

  /**
   * Получает площадку по ID
   * @async
   * @param {Request} req - Express request объект
   * @param {Response} res - Express response объект
   * @param {NextFunction} next - Express next middleware
   * @returns {Promise<void>}
   */
  async getPlatformById(req, res, next) {
    try {
      const platformId = parseInt(req.params.id);

      if (!platformId) {
        return res.status(400).json(errorResponse("Invalid platform ID", 400));
      }

      const platform = await Platform.findById(platformId);

      if (!platform) {
        return res.status(404).json(errorResponse("Platform not found", 404));
      }

      // Проверяем права доступа
      if (!req.user.is_admin && !req.user.is_moderator && platform.user_id !== req.user.id) {
        // Проверяем статус площадки
        if (platform.status !== 'active') {
          return res.status(403).json(errorResponse("Access denied", 403));
        }
      }

      // Добавляем расчетный показатель качества
      platform.calculated_quality_score = Platform.calculateQualityScore(platform);

      res.json(successResponse(platform, "Platform retrieved"));
    } catch (error) {
      logger.error('Error fetching platform:', error);
      next(error);
    }
  },

  /**
   * Обновляет площадку
   * @async
   * @param {Request} req - Express request объект
   * @param {Response} res - Express response объект
   * @param {NextFunction} next - Express next middleware
   * @returns {Promise<void>}
   */
  async updatePlatform(req, res, next) {
    try {
      const platformId = parseInt(req.params.id);
      const userId = req.user.id;
      const updates = req.body;

      if (!platformId) {
        return res.status(400).json(errorResponse("Invalid platform ID", 400));
      }

      // Проверяем существование площадки
      const existingPlatform = await Platform.findById(platformId);
      if (!existingPlatform) {
        return res.status(404).json(errorResponse("Platform not found", 404));
      }

      // Если меняется URL, проверяем его уникальность
      if (updates.url && updates.url !== existingPlatform.url) {
        const isUrlAvailable = await Platform.checkUrlAvailability(updates.url);
        if (!isUrlAvailable) {
          return res.status(400).json(errorResponse('This URL is already registered', 400));
        }
      }

      // Обновляем площадку
      const updatedPlatform = await Platform.update(platformId, userId, updates);

      logger.info(`Platform updated: ${platformId} by user ${userId}`);
      res.json(successResponse(updatedPlatform, "Platform updated successfully"));
    } catch (error) {
      logger.error('Error updating platform:', error);

      if (error.message === 'Unauthorized to edit this platform') {
        return res.status(403).json(errorResponse(error.message, 403));
      }

      next(error);
    }
  },

  /**
   * Изменяет статус площадки
   * @async
   * @param {Request} req - Express request объект
   * @param {Response} res - Express response объект
   * @param {NextFunction} next - Express next middleware
   * @returns {Promise<void>}
   */
  async updatePlatformStatus(req, res, next) {
    try {
      const platformId = parseInt(req.params.id);
      const { status } = req.body;
      const userId = req.user.id;

      if (!platformId) {
        return res.status(400).json(errorResponse("Invalid platform ID", 400));
      }

      if (!status) {
        return res.status(400).json(errorResponse("Status required", 400));
      }

      // Специальная логика для отправки на модерацию
      if (status === 'pending_review') {
        const platform = await Platform.findById(platformId);

        if (!platform) {
          return res.status(404).json(errorResponse("Platform not found", 404));
        }

        // Проверяем, что площадка готова к модерации
        if (!platform.name || !platform.url || !platform.pricing_model || !platform.audience_size) {
          return res.status(400).json(errorResponse("Platform must have all required fields before submission", 400));
        }
      }

      const updatedPlatform = await Platform.updateStatus(platformId, status, userId);

      logger.info(`Platform status updated: ${platformId} to ${status} by user ${userId}`);
      res.json(successResponse(updatedPlatform, `Platform status updated to ${status}`));
    } catch (error) {
      logger.error('Error updating platform status:', error);

      if (error.message.includes('Invalid status')) {
        return res.status(400).json(errorResponse(error.message, 400));
      }

      if (error.message.includes('Unauthorized')) {
        return res.status(403).json(errorResponse(error.message, 403));
      }

      next(error);
    }
  },

  /**
   * Модерирует площадку (только для модераторов/админов)
   * @async
   * @param {Request} req - Express request объект
   * @param {Response} res - Express response объект
   * @param {NextFunction} next - Express next middleware
   * @returns {Promise<void>}
   */
  async moderatePlatform(req, res, next) {
    try {
      const platformId = parseInt(req.params.id);
      const { decision, notes } = req.body;
      const moderatorId = req.user.id;

      if (!platformId) {
        return res.status(400).json(errorResponse("Invalid platform ID", 400));
      }

      if (!decision || !['approved', 'rejected', 'requires_changes'].includes(decision)) {
        return res.status(400).json(errorResponse('Invalid moderation decision', 400));
      }

      if (['rejected', 'requires_changes'].includes(decision) && !notes) {
        return res.status(400).json(errorResponse('Notes are required for this decision', 400));
      }

      const moderatedPlatform = await Platform.moderate(platformId, decision, moderatorId, notes);

      logger.info(`Platform moderated: ${platformId} - ${decision} by moderator ${moderatorId}`);
      res.json(successResponse(moderatedPlatform, `Platform ${decision}`));
    } catch (error) {
      logger.error('Error moderating platform:', error);

      if (error.message === 'Platform not found') {
        return res.status(404).json(errorResponse(error.message, 404));
      }

      next(error);
    }
  },

  /**
   * Обновляет статус верификации площадки
   * @async
   * @param {Request} req - Express request объект
   * @param {Response} res - Express response объект
   * @param {NextFunction} next - Express next middleware
   * @returns {Promise<void>}
   */
  async updateVerificationStatus(req, res, next) {
    try {
      const platformId = parseInt(req.params.id);
      const { verification_status } = req.body;

      if (!platformId) {
        return res.status(400).json(errorResponse("Invalid platform ID", 400));
      }

      if (!verification_status) {
        return res.status(400).json(errorResponse("Verification status required", 400));
      }

      const updatedPlatform = await Platform.updateVerificationStatus(platformId, verification_status);

      logger.info(`Platform verification status updated: ${platformId} to ${verification_status}`);
      res.json(successResponse(updatedPlatform, "Verification status updated"));
    } catch (error) {
      logger.error('Error updating verification status:', error);

      if (error.message.includes('Invalid verification status')) {
        return res.status(400).json(errorResponse(error.message, 400));
      }

      next(error);
    }
  },

  /**
   * Получает похожие площадки
   * @async
   * @param {Request} req - Express request объект
   * @param {Response} res - Express response объект
   * @param {NextFunction} next - Express next middleware
   * @returns {Promise<void>}
   */
  async getSimilarPlatforms(req, res, next) {
    try {
      const platformId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit) || 5;

      if (!platformId) {
        return res.status(400).json(errorResponse("Invalid platform ID", 400));
      }

      const similarPlatforms = await Platform.findSimilar(platformId, limit);

      res.json(successResponse(similarPlatforms, "Similar platforms retrieved"));
    } catch (error) {
      logger.error('Error fetching similar platforms:', error);

      if (error.message === 'Platform not found') {
        return res.status(404).json(errorResponse(error.message, 404));
      }

      next(error);
    }
  },

  /**
   * Получает статистику площадок пользователя
   * @async
   * @param {Request} req - Express request объект
   * @param {Response} res - Express response объект
   * @param {NextFunction} next - Express next middleware
   * @returns {Promise<void>}
   */
  async getUserPlatformStats(req, res, next) {
    try {
      const userId = req.params.userId || req.user.id;

      // Проверяем права доступа
      if (userId !== req.user.id && !req.user.is_admin && !req.user.is_moderator) {
        return res.status(403).json(errorResponse("Access denied", 403));
      }

      const stats = await Platform.getUserPlatformsStats(userId);

      res.json(successResponse(stats, "Platform statistics retrieved"));
    } catch (error) {
      logger.error('Error fetching platform stats:', error);
      next(error);
    }
  },

  /**
   * Получает площадки для модерации
   * @async
   * @param {Request} req - Express request объект
   * @param {Response} res - Express response объект
   * @param {NextFunction} next - Express next middleware
   * @returns {Promise<void>}
   */
  async getPendingModeration(req, res, next) {
    try {
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20
      };

      const result = await Platform.getPendingModeration(options);

res.json(paginatedResponse(result.data, result.pagination.page, result.pagination.limit, result.pagination.total));
    } catch (error) {
      logger.error('Error fetching pending platforms:', error);
      next(error);
    }
  },

  /**
   * Архивирует площадку
   * @async
   * @param {Request} req - Express request объект
   * @param {Response} res - Express response объект
   * @param {NextFunction} next - Express next middleware
   * @returns {Promise<void>}
   */
  async archivePlatform(req, res, next) {
    try {
      const platformId = parseInt(req.params.id);
      const userId = req.user.id;

      if (!platformId) {
        return res.status(400).json(errorResponse("Invalid platform ID", 400));
      }

      const archived = await Platform.archive(platformId, userId);

      if (!archived) {
        return res.status(404).json(errorResponse('Platform not found or already archived', 404));
      }

      logger.info(`Platform archived: ${platformId} by user ${userId}`);
      res.json(successResponse({ id: platformId, archived: true }, 'Platform archived successfully'));
    } catch (error) {
      logger.error('Error archiving platform:', error);

      if (error.message === 'Platform not found') {
        return res.status(404).json(errorResponse(error.message, 404));
      }

      if (error.message === 'Unauthorized to archive this platform') {
        return res.status(403).json(errorResponse(error.message, 403));
      }

      next(error);
    }
  },

  /**
   * Обновляет метрики качества площадки
   * @async
   * @param {Request} req - Express request объект
   * @param {Response} res - Express response объект
   * @param {NextFunction} next - Express next middleware
   * @returns {Promise<void>}
   */
  async updateQualityMetrics(req, res, next) {
    try {
      const platformId = parseInt(req.params.id);
      const { rating, quality_score } = req.body;

      if (!platformId) {
        return res.status(400).json(errorResponse("Invalid platform ID", 400));
      }

      // Только админы и модераторы могут обновлять метрики качества
      if (!req.user.is_admin && !req.user.is_moderator) {
        return res.status(403).json(errorResponse("Only admins and moderators can update quality metrics", 403));
      }

      await Platform.updateQualityMetrics(platformId, rating, quality_score);

      const updatedPlatform = await Platform.findById(platformId);
      
      logger.info(`Platform quality metrics updated: ${platformId}`);
      res.json(successResponse(updatedPlatform, "Quality metrics updated"));
    } catch (error) {
      logger.error('Error updating quality metrics:', error);

      if (error.message.includes('must be between')) {
        return res.status(400).json(errorResponse(error.message, 400));
      }

      next(error);
    }
  },

  /**
   * Получает топ площадок по различным критериям
   * @async
   * @param {Request} req - Express request объект
   * @param {Response} res - Express response объект
   * @param {NextFunction} next - Express next middleware
   * @returns {Promise<void>}
   */
  async getTopPlatforms(req, res, next) {
    try {
      const { criteria = 'rating', limit = 10 } = req.query;

      // Определяем критерий сортировки
      const sortMap = {
        'rating': 'rating:desc',
        'audience': 'audience_size:desc',
        'quality': 'quality_score:desc',
        'verified': 'verification_status:desc,rating:desc'
      };

      const sort = sortMap[criteria] || 'rating:desc';

      // Получаем только активные и одобренные площадки
      const result = await Platform.findAll({
        status: 'active',
        moderation_status: 'approved',
        sort,
        limit: parseInt(limit),
        page: 1
      });

      res.json(successResponse(result.data, `Top ${limit} platforms by ${criteria}`));
    } catch (error) {
      logger.error('Error fetching top platforms:', error);
      next(error);
    }
  },

  /**
   * Проверяет доступность URL
   * @async
   * @param {Request} req - Express request объект
   * @param {Response} res - Express response объект
   * @param {NextFunction} next - Express next middleware
   * @returns {Promise<void>}
   */
  async checkUrlAvailability(req, res, next) {
    try {
      const { url } = req.query;

      if (!url) {
        return res.status(400).json(errorResponse("URL parameter is required", 400));
      }

      const isAvailable = await Platform.checkUrlAvailability(url);

      res.json(successResponse({ url, available: isAvailable }, "URL availability checked"));
    } catch (error) {
      logger.error('Error checking URL availability:', error);
      next(error);
    }
  },

  /**
   * Получает сводную статистику по всем площадкам (для админов)
   * @async
   * @param {Request} req - Express request объект
   * @param {Response} res - Express response объект
   * @param {NextFunction} next - Express next middleware
   * @returns {Promise<void>}
   */
  async getGlobalStats(req, res, next) {
    try {
      // Только для админов
      if (!req.user.is_admin) {
        return res.status(403).json(errorResponse("Access denied", 403));
      }

      // Получаем различные статистики
      const allPlatforms = await Platform.findAll({ limit: 10000 });
      
      const stats = {
        total: allPlatforms.pagination.total,
        by_status: {},
        by_type: {},
        by_pricing_model: {},
        verified_count: 0,
        total_audience: 0,
        average_rating: 0,
        average_quality_score: 0
      };

      // Подсчитываем статистику
      allPlatforms.data.forEach(platform => {
        // По статусам
        stats.by_status[platform.status] = (stats.by_status[platform.status] || 0) + 1;
        
        // По типам
        stats.by_type[platform.type] = (stats.by_type[platform.type] || 0) + 1;
        
        // По моделям ценообразования
        stats.by_pricing_model[platform.pricing_model] = (stats.by_pricing_model[platform.pricing_model] || 0) + 1;
        
        // Верифицированные
        if (platform.verification_status === 'verified') {
          stats.verified_count++;
        }
        
        // Общая аудитория
        stats.total_audience += platform.audience_size || 0;
        
        // Средние показатели
        stats.average_rating += platform.rating || 0;
        stats.average_quality_score += platform.quality_score || 0;
      });

      // Вычисляем средние значения
      if (allPlatforms.data.length > 0) {
        stats.average_rating = (stats.average_rating / allPlatforms.data.length).toFixed(2);
        stats.average_quality_score = (stats.average_quality_score / allPlatforms.data.length).toFixed(2);
      }

      res.json(successResponse(stats, "Global platform statistics retrieved"));
    } catch (error) {
      logger.error('Error fetching global stats:', error);
      next(error);
    }
  }
};

module.exports = platformController;