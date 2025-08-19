/**
 * *project*\backend/services/campaign/creativeService.js
 * Сервис управления креативами кампаний
 */

const CampaignCreativeModel = require('../../models/campaign/campaignCreativeModel');
const { ValidationError, BusinessError } = require('../../utils/errors');
const logger = require('../../utils/logger');

class CreativeService {
  // Максимальные размеры файлов по типам
  static FILE_SIZE_LIMITS = {
    image: 10 * 1024 * 1024, // 10MB
    video: 50 * 1024 * 1024, // 50MB
    carousel: 5 * 1024 * 1024 // 5MB per image
  };

  // Разрешенные форматы
  static ALLOWED_FORMATS = {
    image: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    video: ['mp4', 'webm', 'mov', 'avi']
  };

  // Рекомендуемые размеры
  static RECOMMENDED_SIZES = {
    banner: { width: 728, height: 90 },
    square: { width: 300, height: 300 },
    vertical: { width: 300, height: 600 },
    mobile: { width: 320, height: 50 }
  };

  /**
   * Добавляет креатив к кампании
   * @param {number} campaignId - ID кампании
   * @param {Object} creative - Данные креатива
   * @returns {Promise<Object>} Добавленный креатив
   */
  static async addCreative(campaignId, creative) {
    // Валидация креатива
    const validation = await this.validateCreative(creative);
    if (!validation.isValid) {
      throw new ValidationError('Invalid creative', validation.errors);
    }

    // Проверяем лимиты
    const currentCreatives = await CampaignCreativeModel.findByCampaignId(campaignId);
    const assets = JSON.parse(currentCreatives?.creative_assets || '[]');
    
    if (assets.length >= 10) {
      throw new BusinessError('Maximum number of creatives reached (10)');
    }

    // Добавляем метаданные
    creative.id = Date.now().toString();
    creative.created_at = new Date().toISOString();
    creative.status = 'active';

    // Добавляем креатив
    const success = await CampaignCreativeModel.addCreative(campaignId, creative);
    
    if (!success) {
      throw new BusinessError('Failed to add creative');
    }

    logger.info('Creative added', {
      campaignId,
      creativeId: creative.id,
      type: creative.type
    });

    return creative;
  }

  /**
   * Обновляет креатив
   * @param {number} campaignId - ID кампании
   * @param {string} creativeId - ID креатива
   * @param {Object} updates - Обновления
   * @returns {Promise<Object>} Обновленный креатив
   */
  static async updateCreative(campaignId, creativeId, updates) {
    const creatives = await CampaignCreativeModel.findByCampaignId(campaignId);
    if (!creatives) {
      throw new BusinessError('Campaign creatives not found');
    }

    const assets = JSON.parse(creatives.creative_assets);
    const creativeIndex = assets.findIndex(c => c.id === creativeId);
    
    if (creativeIndex === -1) {
      throw new BusinessError('Creative not found');
    }

    // Обновляем креатив
    const updatedCreative = {
      ...assets[creativeIndex],
      ...updates,
      updated_at: new Date().toISOString()
    };

    // Валидация обновленного креатива
    const validation = await this.validateCreative(updatedCreative);
    if (!validation.isValid) {
      throw new ValidationError('Invalid creative update', validation.errors);
    }

    assets[creativeIndex] = updatedCreative;

    await CampaignCreativeModel.update(campaignId, {
      creative_assets: JSON.stringify(assets)
    });

    logger.info('Creative updated', {
      campaignId,
      creativeId,
      updates: Object.keys(updates)
    });

    return updatedCreative;
  }

  /**
   * Удаляет креатив
   * @param {number} campaignId - ID кампании
   * @param {string} creativeId - ID креатива
   * @returns {Promise<boolean>} Успешность удаления
   */
  static async removeCreative(campaignId, creativeId) {
    const creatives = await CampaignCreativeModel.findByCampaignId(campaignId);
    if (!creatives) {
      throw new BusinessError('Campaign creatives not found');
    }

    const assets = JSON.parse(creatives.creative_assets);
    const filteredAssets = assets.filter(c => c.id !== creativeId);
    
    if (filteredAssets.length === assets.length) {
      throw new BusinessError('Creative not found');
    }

    if (filteredAssets.length === 0) {
      throw new BusinessError('Cannot remove last creative');
    }

    await CampaignCreativeModel.update(campaignId, {
      creative_assets: JSON.stringify(filteredAssets)
    });

    logger.info('Creative removed', {
      campaignId,
      creativeId
    });

    return true;
  }

  /**
   * Валидирует креатив
   * @param {Object} creative - Данные креатива
   * @returns {Promise<Object>} Результат валидации
   */
  static async validateCreative(creative) {
    const errors = [];

    // Проверка типа
    if (!['image', 'video', 'carousel', 'text'].includes(creative.type)) {
      errors.push('Invalid creative type');
    }

    // Проверка URL для медиа
    if (['image', 'video'].includes(creative.type)) {
      if (!creative.url) {
        errors.push('URL is required for media creatives');
      } else {
        try {
          new URL(creative.url);
        } catch {
          errors.push('Invalid URL format');
        }
      }
    }

    // Проверка размера файла
    if (creative.file_size) {
      const limit = this.FILE_SIZE_LIMITS[creative.type];
      if (limit && creative.file_size > limit) {
        errors.push(`File size exceeds limit (${limit / 1024 / 1024}MB)`);
      }
    }

    // Проверка размеров изображения
    if (creative.type === 'image' && creative.dimensions) {
      const { width, height } = creative.dimensions;
      if (width < 100 || height < 100) {
        errors.push('Image dimensions too small (minimum 100x100)');
      }
      if (width > 4096 || height > 4096) {
        errors.push('Image dimensions too large (maximum 4096x4096)');
      }
    }

    // Проверка видео
    if (creative.type === 'video') {
      if (creative.duration && creative.duration > 120) {
        errors.push('Video duration exceeds 2 minutes');
      }
    }

    // Проверка текста
    if (creative.type === 'text' || creative.text) {
      if (!creative.text?.headline) {
        errors.push('Text creative must have a headline');
      }
      if (creative.text?.headline?.length > 100) {
        errors.push('Headline too long (max 100 characters)');
      }
      if (creative.text?.body?.length > 500) {
        errors.push('Body text too long (max 500 characters)');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Оптимизирует креативы на основе производительности
   * @param {number} campaignId - ID кампании
   * @returns {Promise<Object>} Рекомендации по оптимизации
   */
  static async optimizeCreatives(campaignId) {
    const creatives = await CampaignCreativeModel.findByCampaignId(campaignId);
    if (!creatives) {
      throw new BusinessError('Campaign creatives not found');
    }

    const assets = JSON.parse(creatives.creative_assets);
    
    // Здесь должна быть логика анализа производительности
    // Временно возвращаем базовые рекомендации
    
    const recommendations = {
      toRemove: [],
      toUpdate: [],
      toAdd: []
    };

    // Пример рекомендаций
    if (assets.length < 3) {
      recommendations.toAdd.push({
        type: 'general',
        message: 'Add more creative variations for better A/B testing',
        priority: 'high'
      });
    }

    // Проверка разнообразия форматов
    const types = [...new Set(assets.map(a => a.type))];
    if (types.length === 1) {
      recommendations.toAdd.push({
        type: 'format',
        message: 'Try different creative formats to reach wider audience',
        priority: 'medium'
      });
    }

    return recommendations;
  }

  /**
   * Генерирует варианты для A/B тестирования
   * @param {Object} baseCreative - Базовый креатив
   * @param {Array} variations - Типы вариаций
   * @returns {Array} Сгенерированные варианты
   */
  static generateABVariants(baseCreative, variations = ['headline', 'cta']) {
    const variants = [baseCreative];

    if (variations.includes('headline') && baseCreative.text?.headline) {
      // Варианты заголовков
      const headlineVariants = [
        baseCreative.text.headline.toUpperCase(),
        `🔥 ${baseCreative.text.headline}`,
        `${baseCreative.text.headline} - Limited Time!`
      ];

      headlineVariants.forEach((headline, index) => {
        variants.push({
          ...baseCreative,
          id: `${baseCreative.id}_h${index}`,
          variant_type: 'headline',
          text: {
            ...baseCreative.text,
            headline
          }
        });
      });
    }

    if (variations.includes('cta') && baseCreative.text?.cta) {
      // Варианты CTA
      const ctaVariants = [
        'Learn More',
        'Get Started',
        'Try Now',
        'Sign Up'
      ];

      ctaVariants.forEach((cta, index) => {
        variants.push({
          ...baseCreative,
          id: `${baseCreative.id}_c${index}`,
          variant_type: 'cta',
          text: {
            ...baseCreative.text,
            cta
          }
        });
      });
    }

    return variants;
  }

  /**
   * Проверяет соответствие креативов рекомендациям платформы
   * @param {Array} creatives - Массив креативов
   * @param {string} platformType - Тип платформы
   * @returns {Object} Результат проверки
   */
  static checkPlatformCompliance(creatives, platformType) {
    const issues = [];
    const warnings = [];

    // Рекомендации по платформам
    const platformSpecs = {
      'facebook': {
        textLimit: 125,
        imageRatio: [1.91, 1], // 1.91:1
        videoMaxLength: 120
      },
      'instagram': {
        textLimit: 125,
        imageRatio: [1, 1], // 1:1
        videoMaxLength: 60
      },
      'google': {
        textLimit: 90,
        headlineLimit: 30,
        descriptionLimit: 90
      }
    };

    const specs = platformSpecs[platformType] || {};

    creatives.forEach((creative, index) => {
      if (creative.type === 'text' && specs.textLimit) {
        const textLength = (creative.text?.body || '').length;
        if (textLength > specs.textLimit) {
          issues.push(`Creative ${index + 1}: Text exceeds platform limit (${specs.textLimit} chars)`);
        }
      }

      if (creative.type === 'image' && specs.imageRatio && creative.dimensions) {
        const ratio = creative.dimensions.width / creative.dimensions.height;
        const expectedRatio = specs.imageRatio[0] / specs.imageRatio[1];
        
        if (Math.abs(ratio - expectedRatio) > 0.1) {
          warnings.push(`Creative ${index + 1}: Image ratio not optimal for ${platformType}`);
        }
      }
    });

    return { issues, warnings };
  }
}

module.exports = CreativeService;