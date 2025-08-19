/**
 * *project*\backend/services/campaign/campaignFinanceService.js
 * Сервис для управления финансовыми операциями кампаний
 */

const UserFinanceModel = require('../../models/user/userFinanceModel');
const CampaignModel = require('../../models/campaign/campaignModel');
const { BusinessError, NotFoundError } = require('../../utils/errors');
const logger = require('../../utils/logger');

class CampaignFinanceService {
  /**
   * Проверяет, может ли пользователь позволить себе бюджет кампании
   * @param {number} userId - ID пользователя
   * @param {number} requiredAmount - Требуемая сумма
   * @returns {Promise<Object>} Результат проверки
   */
  static async checkUserBudget(userId, requiredAmount) {
    const userFinance = await UserFinanceModel.findByUserId(userId);
    
    if (!userFinance) {
      throw new NotFoundError('User finance record not found');
    }

    const availableBalance = userFinance.balance - userFinance.balance_on_hold;
    const canAfford = availableBalance >= requiredAmount;

    return {
      canAfford,
      available: availableBalance,
      required: requiredAmount,
      shortage: canAfford ? 0 : requiredAmount - availableBalance
    };
  }

  /**
   * Резервирует бюджет для кампании
   * @param {number} userId - ID пользователя
   * @param {number} campaignId - ID кампании
   * @param {number} amount - Сумма для резервирования
   * @returns {Promise<Object>} Результат резервирования
   */
  static async reserveBudget(userId, campaignId, amount) {
    return await UserFinanceModel.transaction(async () => {
      // Проверяем доступный баланс
      const budgetCheck = await this.checkUserBudget(userId, amount);
      if (!budgetCheck.canAfford) {
        throw new BusinessError('Insufficient funds for budget reservation');
      }

      // Резервируем средства
      await UserFinanceModel.holdFunds(userId, amount, 'campaign_budget', {
        campaign_id: campaignId
      });

      logger.info('Budget reserved', {
        userId,
        campaignId,
        amount
      });

      return {
        reserved: amount,
        success: true
      };
    });
  }

  /**
   * Обновляет резервирование бюджета
   * @param {number} userId - ID пользователя
   * @param {number} campaignId - ID кампании
   * @param {number} newAmount - Новая сумма бюджета
   * @returns {Promise<Object>} Результат обновления
   */
  static async updateBudgetReservation(userId, campaignId, newAmount) {
    return await UserFinanceModel.transaction(async () => {
      const campaign = await CampaignModel.findById(campaignId);
      
      if (!campaign) {
        throw new NotFoundError('Campaign not found');
      }

      const currentReserved = campaign.budget_total - campaign.budget_spent;
      const difference = newAmount - campaign.budget_total;

      if (difference > 0) {
        // Нужно зарезервировать дополнительные средства
        const budgetCheck = await this.checkUserBudget(userId, difference);
        if (!budgetCheck.canAfford) {
          throw new BusinessError('Insufficient funds for budget increase');
        }

        await UserFinanceModel.holdFunds(userId, difference, 'campaign_budget_increase', {
          campaign_id: campaignId
        });
      } else if (difference < 0) {
        // Освобождаем часть средств
        const releaseAmount = Math.min(Math.abs(difference), currentReserved);
        await UserFinanceModel.releaseFunds(userId, releaseAmount, 'campaign_budget_decrease', {
          campaign_id: campaignId
        });
      }

      logger.info('Budget reservation updated', {
        userId,
        campaignId,
        oldAmount: campaign.budget_total,
        newAmount
      });

      return {
        previousBudget: campaign.budget_total,
        newBudget: newAmount,
        difference
      };
    });
  }

  /**
   * Активирует бюджет кампании при запуске
   * @param {number} userId - ID пользователя
   * @param {number} campaignId - ID кампании
   * @returns {Promise<boolean>} Успешность активации
   */
  static async activateCampaignBudget(userId, campaignId) {
    // При активации бюджет остается в резерве, но помечается как активный
    logger.info('Campaign budget activated', {
      userId,
      campaignId
    });

    return true;
  }

  /**
   * Приостанавливает бюджет кампании
   * @param {number} userId - ID пользователя
   * @param {number} campaignId - ID кампании
   * @returns {Promise<boolean>} Успешность приостановки
   */
  static async pauseCampaignBudget(userId, campaignId) {
    // При паузе бюджет остается в резерве
    logger.info('Campaign budget paused', {
      userId,
      campaignId
    });

    return true;
  }

  /**
   * Возобновляет бюджет кампании
   * @param {number} userId - ID пользователя
   * @param {number} campaignId - ID кампании
   * @returns {Promise<boolean>} Успешность возобновления
   */
  static async resumeCampaignBudget(userId, campaignId) {
    const campaign = await CampaignModel.findById(campaignId);
    
if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    // Проверяем, достаточно ли средств для продолжения
    const remainingBudget = campaign.budget_total - campaign.budget_spent;
    if (remainingBudget <= 0) {
      throw new BusinessError('Campaign has no remaining budget');
    }

    logger.info('Campaign budget resumed', {
      userId,
      campaignId,
      remainingBudget
    });

    return true;
  }

  /**
   * Освобождает бюджет кампании при завершении
   * @param {number} userId - ID пользователя
   * @param {number} campaignId - ID кампании
   * @returns {Promise<Object>} Информация о возврате
   */
  static async releaseCampaignBudget(userId, campaignId) {
    return await UserFinanceModel.transaction(async () => {
      const campaign = await CampaignModel.findById(campaignId);
      
      if (!campaign) {
        throw new NotFoundError('Campaign not found');
      }

      const unspentAmount = campaign.budget_total - campaign.budget_spent;
      
      if (unspentAmount > 0) {
        await UserFinanceModel.releaseFunds(userId, unspentAmount, 'campaign_completed', {
          campaign_id: campaignId
        });
      }

      logger.info('Campaign budget released', {
        userId,
        campaignId,
        released: unspentAmount
      });

      return {
        amount: unspentAmount,
        totalBudget: campaign.budget_total,
        spentAmount: campaign.budget_spent
      };
    });
  }

  /**
   * Обрабатывает расход средств кампании
   * @param {number} campaignId - ID кампании
   * @param {number} amount - Потраченная сумма
   * @param {string} reason - Причина траты
   * @returns {Promise<Object>} Результат операции
   */
  static async processCampaignSpend(campaignId, amount, reason = 'impressions') {
    return await CampaignModel.transaction(async () => {
      const campaign = await CampaignModel.findById(campaignId);
      
      if (!campaign) {
        throw new NotFoundError('Campaign not found');
      }

      // Проверяем лимиты
      const newSpent = campaign.budget_spent + amount;
      if (newSpent > campaign.budget_total) {
        throw new BusinessError('Campaign budget exceeded', {
          budget: campaign.budget_total,
          currentSpent: campaign.budget_spent,
          attemptedSpend: amount
        });
      }

      // Проверяем дневной лимит
      if (campaign.budget_daily) {
        const todaySpent = await this.getTodaySpent(campaignId);
        if (todaySpent + amount > campaign.budget_daily) {
          throw new BusinessError('Daily budget limit reached', {
            dailyLimit: campaign.budget_daily,
            todaySpent,
            attemptedSpend: amount
          });
        }
      }

      // Обновляем потраченную сумму
      await CampaignModel.incrementBudgetSpent(campaignId, amount);

      // Конвертируем зарезервированные средства в потраченные
      await UserFinanceModel.convertHeldToSpent(campaign.user_id, amount, reason, {
        campaign_id: campaignId
      });

      logger.info('Campaign spend processed', {
        campaignId,
        amount,
        reason,
        newTotal: newSpent
      });

      return {
        spent: amount,
        totalSpent: newSpent,
        remainingBudget: campaign.budget_total - newSpent
      };
    });
  }

  /**
   * Получает сумму, потраченную сегодня
   * @param {number} campaignId - ID кампании
   * @returns {Promise<number>} Потраченная сегодня сумма
   */
  static async getTodaySpent(campaignId) {
    // Здесь должна быть логика получения суммы из истории транзакций
    // Временно возвращаем 0
    return 0;
  }

  /**
   * Рассчитывает прогноз расходов кампании
   * @param {number} campaignId - ID кампании
   * @returns {Promise<Object>} Прогноз расходов
   */
  static async calculateBudgetForecast(campaignId) {
    const campaign = await CampaignModel.findById(campaignId);
    
    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    const performance = await CampaignPerformanceModel.findByCampaignId(campaignId);
    
    if (!performance) {
      return {
        estimatedDaysRemaining: 0,
        estimatedEndDate: null,
        dailyBurnRate: 0
      };
    }

    // Рассчитываем средний расход в день
    const daysActive = Math.max(1, 
      Math.floor((new Date() - new Date(campaign.launched_at)) / (1000 * 60 * 60 * 24))
    );
    const dailyBurnRate = campaign.budget_spent / daysActive;

    // Прогнозируем оставшееся время
    const remainingBudget = campaign.budget_total - campaign.budget_spent;
    const estimatedDaysRemaining = dailyBurnRate > 0 
      ? Math.floor(remainingBudget / dailyBurnRate)
      : Infinity;

    const estimatedEndDate = dailyBurnRate > 0
      ? new Date(Date.now() + estimatedDaysRemaining * 24 * 60 * 60 * 1000)
      : null;

    return {
      estimatedDaysRemaining,
      estimatedEndDate,
      dailyBurnRate,
      remainingBudget,
      willExceedSchedule: estimatedEndDate && estimatedEndDate > new Date(campaign.end_date)
    };
  }

  /**
   * Получает финансовую историю кампании
   * @param {number} campaignId - ID кампании
   * @param {Object} options - Опции
   * @returns {Promise<Array>} История транзакций
   */
  static async getCampaignFinanceHistory(campaignId, options = {}) {
    const { limit = 100, offset = 0 } = options;

    // Здесь должна быть логика получения истории из таблицы транзакций
    // Временно возвращаем пустой массив
    return [];
  }

  /**
   * Рассчитывает ROI кампании
   * @param {number} campaignId - ID кампании
   * @returns {Promise<Object>} Показатели ROI
   */
  static async calculateROI(campaignId) {
    const campaign = await CampaignModel.findById(campaignId);
    const performance = await CampaignPerformanceModel.findByCampaignId(campaignId);

    if (!campaign || !performance) {
      throw new NotFoundError('Campaign or performance data not found');
    }

    const revenue = performance.revenue_generated || 0;
    const spent = campaign.budget_spent;
    const roi = spent > 0 ? ((revenue - spent) / spent * 100) : 0;
    const roas = spent > 0 ? (revenue / spent) : 0;

    return {
      revenue,
      spent,
      profit: revenue - spent,
      roi: roi.toFixed(2),
      roas: roas.toFixed(2),
      breakEven: revenue >= spent
    };
  }
}

module.exports = CampaignFinanceService;