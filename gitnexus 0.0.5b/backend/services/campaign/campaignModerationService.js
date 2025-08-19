/**
 * *project*\backend/services/campaign/campaignModerationService.js
 * Сервис модерации кампаний
 */

const CampaignModel = require('../../models/campaign/campaignModel');
const CampaignTargetingModel = require('../../models/campaign/campaignTargetingModel');
const CampaignCreativeModel = require('../../models/campaign/campaignCreativeModel');
const NotificationService = require('../notification/notificationService');
const { BusinessError, NotFoundError } = require('../../utils/errors');
const logger = require('../../utils/logger');

class CampaignModerationService {
  // Запрещенные слова для автоматической проверки
  static PROHIBITED_WORDS = [
    'scam', 'guaranteed profit', 'get rich quick', 'pyramid scheme',
    'xxx', 'adult', 'casino', 'gambling'
  ];

  // Категории, требующие дополнительной проверки
  static SENSITIVE_CATEGORIES = [
    'finance', 'health', 'politics', 'religion', 'alcohol', 'tobacco'
  ];

  /**
   * Отправляет кампанию на модерацию
   * @param {number} campaignId - ID кампании
   * @returns {Promise<Object>} Результат отправки
   */
  static async submitForModeration(campaignId) {
    const campaign = await CampaignModel.findById(campaignId);
    
    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    if (campaign.status !== 'draft') {
      throw new BusinessError('Only draft campaigns can be submitted for moderation');
    }

    // Выполняем автоматические проверки
    const autoCheckResult = await this.performAutomaticChecks(campaignId);

    if (autoCheckResult.status === 'rejected') {
      // Автоматически отклоняем
      await CampaignModel.updateApprovalStatus(
        campaignId,
        'rejected',
        null,
        autoCheckResult.reasons.join('; ')
      );

      return {
        status: 'rejected',
        automatic: true,
        reasons: autoCheckResult.reasons
      };
    }

    // Обновляем статус на pending_approval
    await CampaignModel.updateStatus(campaignId, 'pending_approval');
    await CampaignModel.updateApprovalStatus(campaignId, 'pending', null, null);

    // Если есть предупреждения, добавляем их в примечания
    if (autoCheckResult.warnings.length > 0) {
      await CampaignModel.update(campaignId, {
        approval_notes: `Warnings: ${autoCheckResult.warnings.join('; ')}`
      });
    }

    logger.info('Campaign submitted for moderation', {
      campaignId,
      warnings: autoCheckResult.warnings
    });

    return {
      status: 'pending',
      automatic: false,
      warnings: autoCheckResult.warnings
    };
  }

  /**
   * Выполняет автоматические проверки кампании
   * @param {number} campaignId - ID кампании
   * @returns {Promise<Object>} Результат проверок
   */
  static async performAutomaticChecks(campaignId) {
    const [campaign, targeting, creatives] = await Promise.all([
      CampaignModel.findById(campaignId),
      CampaignTargetingModel.findByCampaignId(campaignId),
      CampaignCreativeModel.findByCampaignId(campaignId)
    ]);

    const reasons = [];
    const warnings = [];

    // Проверка на запрещенные слова
    const textToCheck = `${campaign.title} ${campaign.description || ''}`.toLowerCase();
    
    for (const word of this.PROHIBITED_WORDS) {
      if (textToCheck.includes(word)) {
        reasons.push(`Prohibited content detected: "${word}"`);
      }
    }

    // Проверка креативов
    if (creatives) {
      const assets = JSON.parse(creatives.creative_assets || '[]');
      
      if (assets.length === 0) {
        reasons.push('Campaign must have at least one creative');
      }

      // Проверка landing URL
      if (creatives.landing_url) {
        try {
          const url = new URL(creatives.landing_url);
          if (!['http:', 'https:'].includes(url.protocol)) {
            reasons.push('Landing URL must use HTTP or HTTPS protocol');
          }
        } catch (error) {
          reasons.push('Invalid landing URL');
        }
      } else {
        warnings.push('No landing URL specified');
      }
    }

    // Проверка таргетинга
    if (targeting) {
      const tags = JSON.parse(targeting.tags || '[]');
      const primaryTag = targeting.primary_tag;

      if (tags.length === 0 && !primaryTag) {
        warnings.push('No targeting tags specified');
      }

      // Проверка чувствительных категорий
      if (primaryTag && this.SENSITIVE_CATEGORIES.includes(primaryTag)) {
        warnings.push(`Campaign in sensitive category: ${primaryTag}`);
      }
    }

    // Проверка бюджета
    if (campaign.budget_total < 50) {
      warnings.push('Low campaign budget may limit effectiveness');
    }

    // Проверка длительности
    const startDate = new Date(campaign.start_date);
    const endDate = new Date(campaign.end_date);
    const durationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    if (durationDays > 90) {
      warnings.push('Campaign duration exceeds 90 days');
    }

    return {
      status: reasons.length > 0 ? 'rejected' : 'passed',
      reasons,
      warnings
    };
  }

  /**
   * Модерирует кампанию
   * @param {number} campaignId - ID кампании
   * @param {number} moderatorId - ID модератора
   * @param {string} decision - Решение (approved/rejected/requires_changes)
   * @param {string} notes - Примечания
   * @returns {Promise<Object>} Результат модерации
   */
  static async moderateCampaign(campaignId, moderatorId, decision, notes = null) {
    const campaign = await CampaignModel.findById(campaignId);
    
    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    if (campaign.approval_status !== 'pending') {
      throw new BusinessError('Campaign is not pending moderation');
    }

    // Обновляем статус модерации
    await CampaignModel.updateApprovalStatus(campaignId, decision, moderatorId, notes);

    // Обновляем основной статус кампании
    if (decision === 'approved') {
      await CampaignModel.updateStatus(campaignId, 'draft');
    } else if (decision === 'rejected') {
      await CampaignModel.updateStatus(campaignId, 'rejected');
    }

    // Отправляем уведомление пользователю
    await NotificationService.sendCampaignModerationResult(
      campaign.user_id,
      campaignId,
      decision,
      notes
    );

    logger.info('Campaign moderated', {
      campaignId,
      moderatorId,
      decision,
      notes
    });

    return {
      campaignId,
      decision,
      moderatedBy: moderatorId,
      notes
    };
  }

/**
   * Получает кампании для модерации
   * @param {Object} options - Опции
   * @returns {Promise<Object>} Список кампаний
   */
  static async getCampaignsForModeration(options = {}) {
    const { page = 1, limit = 20 } = options;
    
    const campaigns = await CampaignModel.findPendingModeration({
      limit,
      offset: (page - 1) * limit
    });

    // Обогащаем данные дополнительной информацией
    const enrichedCampaigns = await Promise.all(
      campaigns.map(async (campaign) => {
        const [targeting, creatives] = await Promise.all([
          CampaignTargetingModel.findByCampaignId(campaign.id),
          CampaignCreativeModel.findByCampaignId(campaign.id)
        ]);

        // Выполняем быструю проверку
        const quickCheck = await this.performAutomaticChecks(campaign.id);

        return {
          ...campaign,
          targeting: {
            tags: JSON.parse(targeting?.tags || '[]'),
            primary_tag: targeting?.primary_tag
          },
          creatives: {
            count: JSON.parse(creatives?.creative_assets || '[]').length,
            landing_url: creatives?.landing_url
          },
          autoCheck: {
            hasIssues: quickCheck.reasons.length > 0,
            warningsCount: quickCheck.warnings.length
          }
        };
      })
    );

    // Считаем общее количество
    const totalCount = await CampaignModel.count({
      approval_status: 'pending',
      deleted_at: null
    });

    return {
      campaigns: enrichedCampaigns,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }

  /**
   * Получает историю модерации кампании
   * @param {number} campaignId - ID кампании
   * @returns {Promise<Array>} История модерации
   */
  static async getModerationHistory(campaignId) {
    // Здесь должна быть логика получения истории из отдельной таблицы
    // Временно возвращаем пустой массив
    return [];
  }

  /**
   * Проверяет креативы на соответствие политикам
   * @param {Array} creatives - Массив креативов
   * @returns {Object} Результат проверки
   */
  static validateCreatives(creatives) {
    const issues = [];
    const warnings = [];

    creatives.forEach((creative, index) => {
      // Проверка размеров изображений
      if (creative.type === 'image') {
        if (!creative.dimensions) {
          warnings.push(`Creative ${index + 1}: Missing image dimensions`);
        } else {
          const { width, height } = creative.dimensions;
          if (width < 300 || height < 250) {
            issues.push(`Creative ${index + 1}: Image too small (min 300x250)`);
          }
          if (width > 1920 || height > 1080) {
            warnings.push(`Creative ${index + 1}: Large image may slow loading`);
          }
        }
      }

      // Проверка видео
      if (creative.type === 'video') {
        if (!creative.duration) {
          issues.push(`Creative ${index + 1}: Missing video duration`);
        } else if (creative.duration > 120) {
          issues.push(`Creative ${index + 1}: Video too long (max 2 minutes)`);
        }

        if (creative.file_size > 50 * 1024 * 1024) {
          issues.push(`Creative ${index + 1}: Video file too large (max 50MB)`);
        }
      }

      // Проверка текста
      if (creative.type === 'text' || creative.text) {
        const text = creative.text;
        if (text.headline && text.headline.length > 100) {
          issues.push(`Creative ${index + 1}: Headline too long (max 100 chars)`);
        }
        if (text.body && text.body.length > 500) {
          issues.push(`Creative ${index + 1}: Body text too long (max 500 chars)`);
        }

        // Проверка на caps lock
        if (text.headline && text.headline === text.headline.toUpperCase()) {
          warnings.push(`Creative ${index + 1}: Avoid using all caps in headline`);
        }
      }
    });

    return { issues, warnings };
  }

  /**
   * Генерирует отчет модерации
   * @param {Object} options - Опции отчета
   * @returns {Promise<Object>} Отчет
   */
  static async generateModerationReport(options = {}) {
    const { 
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate = new Date()
    } = options;

    // Здесь должна быть логика генерации отчета
    // Временно возвращаем заглушку
    return {
      period: {
        start: startDate,
        end: endDate
      },
      statistics: {
        total: 0,
        approved: 0,
        rejected: 0,
        pending: 0,
        averageTime: 0
      },
      moderators: [],
      commonIssues: []
    };
  }
}

module.exports = CampaignModerationService;