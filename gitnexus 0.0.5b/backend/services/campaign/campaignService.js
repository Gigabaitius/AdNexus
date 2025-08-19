/**
 * *project*\backend/services/campaign/campaignService.js
 * Основной сервис для работы с кампаниями
 */

const CampaignModel = require('../../models/campaign/campaignModel');
const CampaignTargetingModel = require('../../models/campaign/campaignTargetingModel');
const CampaignCreativeModel = require('../../models/campaign/campaignCreativeModel');
const CampaignPerformanceModel = require('../../models/campaign/campaignPerformanceModel');
const CampaignSchedulingModel = require('../../models/campaign/campaignSchedulingModel');
const CampaignOptimizationModel = require('../../models/campaign/campaignOptimizationModel');
const campaignValidationService = require('./campaignValidationService');
const campaignFinanceService = require('./campaignFinanceService');
const { ValidationError, NotFoundError, BusinessError } = require('../../utils/errors');

class CampaignService {
  /**
   * Создает новую кампанию со всеми связанными записями
   * @param {number} userId - ID пользователя
   * @param {Object} campaignData - Данные кампании
   * @returns {Promise<Object>} Созданная кампания
   */
  static async createCampaign(userId, campaignData) {
    // Валидация данных
    const validationResult = await campaignValidationService.validateCampaignData(campaignData);
    if (!validationResult.isValid) {
      throw new ValidationError('Invalid campaign data', validationResult.errors);
    }

    // Проверка бюджета пользователя
    const budgetCheck = await campaignFinanceService.checkUserBudget(userId, campaignData.budget_total);
    if (!budgetCheck.canAfford) {
      throw new BusinessError('Insufficient funds', {
        required: campaignData.budget_total,
        available: budgetCheck.available
      });
    }

    // Используем транзакцию для атомарности операции
    return await CampaignModel.transaction(async () => {
      // Создаем основную запись кампании
      const campaign = await CampaignModel.create({
        user_id: userId,
        ...campaignData
      });

      // Создаем связанные записи
      await Promise.all([
        CampaignTargetingModel.create(campaign.id, campaignData.targeting || {}),
        CampaignCreativeModel.create(campaign.id, campaignData.creatives || {}),
        CampaignPerformanceModel.create(campaign.id, campaignData.performance || {}),
        CampaignSchedulingModel.create(campaign.id, campaignData.scheduling || {}),
        CampaignOptimizationModel.create(campaign.id, campaignData.optimization || {})
      ]);

      // Резервируем бюджет
      await campaignFinanceService.reserveBudget(userId, campaign.id, campaignData.budget_total);

      logger.info('Campaign created', {
        campaignId: campaign.id,
        userId,
        budget: campaignData.budget_total
      });

      // Возвращаем полную информацию о кампании
      return await this.getCampaignById(campaign.id, userId);
    });
  }

  /**
   * Получает полную информацию о кампании
   * @param {number} campaignId - ID кампании
   * @param {number} userId - ID пользователя (для проверки доступа)
   * @returns {Promise<Object>} Полные данные кампании
   */
  static async getCampaignById(campaignId, userId = null) {
    const campaign = await CampaignModel.findById(campaignId);

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    // Проверка доступа
    if (userId && campaign.user_id !== userId) {
      throw new BusinessError('Access denied');
    }

    // Получаем все связанные данные
    const [targeting, creatives, performance, scheduling, optimization] = await Promise.all([
      CampaignTargetingModel.findByCampaignId(campaignId),
      CampaignCreativeModel.findByCampaignId(campaignId),
      CampaignPerformanceModel.findByCampaignId(campaignId),
      CampaignSchedulingModel.findByCampaignId(campaignId),
      CampaignOptimizationModel.findByCampaignId(campaignId)
    ]);

    return {
      ...campaign,
      targeting,
      creatives,
      performance,
      scheduling,
      optimization
    };
  }

  /**
   * Обновляет кампанию
   * @param {number} campaignId - ID кампании
   * @param {number} userId - ID пользователя
   * @param {Object} updates - Обновления
   * @returns {Promise<Object>} Обновленная кампания
   */
  static async updateCampaign(campaignId, userId, updates) {
    const campaign = await CampaignModel.findById(campaignId);

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    if (campaign.user_id !== userId) {
      throw new BusinessError('Access denied');
    }

    // Валидация обновлений
    const validationResult = await campaignValidationService.validateCampaignUpdate(campaign, updates);
    if (!validationResult.isValid) {
      throw new ValidationError('Invalid update data', validationResult.errors);
    }

    // Обновляем основную таблицу
    if (updates.campaign) {
      await CampaignModel.update(campaignId, updates.campaign);
    }

    // Обновляем связанные таблицы
    const updatePromises = [];

    if (updates.targeting) {
      updatePromises.push(CampaignTargetingModel.update(campaignId, updates.targeting));
    }

    if (updates.creatives) {
      updatePromises.push(CampaignCreativeModel.update(campaignId, updates.creatives));
    }

    if (updates.scheduling) {
      updatePromises.push(CampaignSchedulingModel.update(campaignId, updates.scheduling));
    }

    if (updates.optimization) {
      updatePromises.push(CampaignOptimizationModel.update(campaignId, updates.optimization));
    }

    await Promise.all(updatePromises);

    // Если изменился бюджет, обновляем резерв
    if (updates.campaign?.budget_total && updates.campaign.budget_total !== campaign.budget_total) {
      await campaignFinanceService.updateBudgetReservation(
        userId,
        campaignId,
        updates.campaign.budget_total
      );
    }

    return await this.getCampaignById(campaignId, userId);
  }

  /**
   * Запускает кампанию
   * @param {number} campaignId - ID кампании
   * @param {number} userId - ID пользователя
   * @returns {Promise<boolean>} Успешность операции
   */
  static async launchCampaign(campaignId, userId) {
    const campaign = await this.getCampaignById(campaignId, userId);

    // Проверки перед запуском
    if (campaign.status !== 'draft') {
      throw new BusinessError('Campaign must be in draft status to launch');
    }

    if (campaign.approval_status !== 'approved') {
      throw new BusinessError('Campaign must be approved before launch');
    }

    // Проверка наличия креативов
    const creatives = JSON.parse(campaign.creatives?.creative_assets || '[]');
    if (creatives.length === 0) {
      throw new BusinessError('Campaign must have at least one creative');
    }

    // Проверка наличия таргетинга
    if (!campaign.targeting || !campaign.targeting.primary_tag) {
      throw new BusinessError('Campaign must have targeting configured');
    }

    // Обновляем статус
    await CampaignModel.updateStatus(campaignId, 'active');

    // Активируем финансовые операции
    await campaignFinanceService.activateCampaignBudget(userId, campaignId);

    return true;
  }

  /**
   * Приостанавливает кампанию
   * @param {number} campaignId - ID кампании
   * @param {number} userId - ID пользователя
   * @returns {Promise<boolean>} Успешность операции
   */
  static async pauseCampaign(campaignId, userId) {
    const campaign = await this.getCampaignById(campaignId, userId);

    if (campaign.status !== 'active') {
      throw new BusinessError('Only active campaigns can be paused');
    }

    await CampaignModel.updateStatus(campaignId, 'paused');
    await campaignFinanceService.pauseCampaignBudget(userId, campaignId);

    return true;
  }

  /**
   * Возобновляет кампанию
   * @param {number} campaignId - ID кампании
   * @param {number} userId - ID пользователя
   * @returns {Promise<boolean>} Успешность операции
   */
  static async resumeCampaign(campaignId, userId) {
    const campaign = await this.getCampaignById(campaignId, userId);

    if (campaign.status !== 'paused') {
      throw new BusinessError('Only paused campaigns can be resumed');
    }

    // Проверка, не истек ли срок кампании
    if (new Date(campaign.end_date) < new Date()) {
      throw new BusinessError('Campaign has already ended');
    }

    // Проверка оставшегося бюджета
    if (campaign.budget_remaining <= 0) {
      throw new BusinessError('Campaign has no remaining budget');
    }

    await CampaignModel.updateStatus(campaignId, 'active');
    await campaignFinanceService.resumeCampaignBudget(userId, campaignId);

    return true;
  }

  /**
   * Завершает кампанию
   * @param {number} campaignId - ID кампании
   * @param {number} userId - ID пользователя
   * @returns {Promise<Object>} Финальная статистика
   */
  static async completeCampaign(campaignId, userId) {
    const campaign = await this.getCampaignById(campaignId, userId);

    if (!['active', 'paused'].includes(campaign.status)) {
      throw new BusinessError('Campaign cannot be completed from current status');
    }

    // Обновляем статус
    await CampaignModel.updateStatus(campaignId, 'completed');

    // Освобождаем неиспользованный бюджет
    const refund = await campaignFinanceService.releaseCampaignBudget(userId, campaignId);

    // Получаем финальную статистику
    const finalStats = {
      campaign_id: campaignId,
      total_budget: campaign.budget_total,
      spent_budget: campaign.budget_spent,
      refunded_amount: refund.amount,
      performance: campaign.performance,
      completed_at: new Date().toISOString()
    };

    return finalStats;
  }

  /**
   * Удаляет кампанию (мягкое удаление)
   * @param {number} campaignId - ID кампании
   * @param {number} userId - ID пользователя
   * @returns {Promise<boolean>} Успешность операции
   */
  static async deleteCampaign(campaignId, userId) {
    const campaign = await this.getCampaignById(campaignId, userId);

    // Активные кампании нельзя удалять
    if (campaign.status === 'active') {
      throw new BusinessError('Active campaigns cannot be deleted');
    }

    // Освобождаем бюджет если кампания не завершена
    if (campaign.status !== 'completed') {
      await campaignFinanceService.releaseCampaignBudget(userId, campaignId);
    }

    await CampaignModel.softDelete(campaignId);
    return true;
  }

  /**
   * Получает список кампаний пользователя
   * @param {number} userId - ID пользователя
   * @param {Object} options - Опции фильтрации
   * @returns {Promise<Object>} Список кампаний с пагинацией
   */
  static async getUserCampaigns(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      status = null,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = options;

    const offset = (page - 1) * limit;

    // Получаем кампании
    const campaigns = await CampaignModel.findByUserId(userId, {
      status,
      limit,
      offset
    });

    // Обогащаем данные базовыми метриками
    const enrichedCampaigns = await Promise.all(
      campaigns.map(async (campaign) => {
        const performance = await CampaignPerformanceModel.findByCampaignId(campaign.id);
        return {
          ...campaign,
          metrics: {
            impressions: performance?.impressions_total || 0,
            clicks: performance?.clicks_total || 0,
            conversions: performance?.conversions_total || 0,
            ctr: performance ?
              (performance.clicks_total / (performance.impressions_total || 1) * 100).toFixed(2) : 0,
            platforms_count: performance?.active_platforms_count || 0
          }
        };
      })
    );

    // Получаем общее количество для пагинации
    const stats = await CampaignModel.countByStatus(userId);
    const totalCount = Object.values(stats).reduce((sum, count) => sum + count, 0);

    return {
      campaigns: enrichedCampaigns,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      stats
    };
  }

  /**
   * Клонирует кампанию
   * @param {number} campaignId - ID исходной кампании
   * @param {number} userId - ID пользователя
   * @param {Object} overrides - Поля для переопределения
   * @returns {Promise<Object>} Новая кампания
   */
  static async cloneCampaign(campaignId, userId, overrides = {}) {
    const originalCampaign = await this.getCampaignById(campaignId, userId);

    // Подготавливаем данные для клонирования
    const cloneData = {
      title: overrides.title || `${originalCampaign.title} (Copy)`,
      description: overrides.description || originalCampaign.description,
      objective: overrides.objective || originalCampaign.objective,
      budget_total: overrides.budget_total || originalCampaign.budget_total,
      budget_daily: overrides.budget_daily || originalCampaign.budget_daily,
      currency: overrides.currency || originalCampaign.currency,
      start_date: overrides.start_date || new Date().toISOString().split('T')[0],
      end_date: overrides.end_date || originalCampaign.end_date,
      targeting: originalCampaign.targeting,
      creatives: originalCampaign.creatives,
      scheduling: originalCampaign.scheduling,
      optimization: originalCampaign.optimization
    };

    return await this.createCampaign(userId, cloneData);
  }

  /**
   * Архивирует старые кампании
   * @param {number} daysOld - Количество дней с момента завершения
   * @returns {Promise<number>} Количество архивированных кампаний
   */
  static async archiveOldCampaigns(daysOld = 90) {
    const query = `
      UPDATE campaigns 
      SET status = 'archived'
      WHERE status = 'completed'
        AND completed_at < datetime('now', '-' || ? || ' days')
        AND deleted_at IS NULL
    `;

    const result = await CampaignModel.db.run(query, [daysOld]);
    return result.changes;
  }
}

module.exports = CampaignService;