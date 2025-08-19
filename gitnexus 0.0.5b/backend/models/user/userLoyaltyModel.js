/**
 * *project*\backend/models/user/userLoyaltyModel.js
 * Модель для работы с системой лояльности
 */

const BaseModel = require('../BaseModel');
const { ValidationError, BusinessError, NotFoundError } = require('../../utils/errors');
const logger = require('../../utils/logger');

class UserLoyaltyModel extends BaseModel {
  static tableName = 'user_loyalty';

  // Уровни лояльности
  static LOYALTY_LEVELS = {
    1: { name: 'Bronze', minPoints: 0 },
    2: { name: 'Silver', minPoints: 100 },
    3: { name: 'Gold', minPoints: 500 },
    4: { name: 'Platinum', minPoints: 1000 },
    5: { name: 'Diamond', minPoints: 5000 }
  };

  /**
   * Создает запись лояльности для пользователя
   * @param {Object} loyaltyData - Данные лояльности
   * @returns {Promise<Object>} Созданная запись
   */
  static async create(loyaltyData) {
    const { user_id, referral_code, referred_by = null } = loyaltyData;

    // Проверяем, что запись еще не существует
    const existing = await this.findByUserId(user_id);
    if (existing) {
      throw new ValidationError('Loyalty record already exists for this user');
    }

    // Проверяем реферальный код
    if (!referral_code) {
      throw new ValidationError('Referral code is required');
    }

    const loyalty = {
      user_id,
      loyalty_points: 0,
      loyalty_level: 1,
      total_points_earned: 0,
      total_points_spent: 0,
      referral_code,
      referred_by,
      referral_count: 0,
      referral_earnings: 0,
      achievements_unlocked: '[]',
      badges_earned: '[]'
    };

    const fields = Object.keys(loyalty);
    const placeholders = fields.map(() => '?').join(', ');
    const values = Object.values(loyalty);

    const query = `
      INSERT INTO ${this.tableName} (${fields.join(', ')})
      VALUES (${placeholders})
    `;

    await this.safeQuery('run', query, values);

    // Если есть реферер, начисляем ему бонус
    if (referred_by) {
      await this.processReferralBonus(referred_by);
    }

    return await this.findByUserId(user_id);
  }

  /**
   * Находит запись лояльности по user_id
   * @param {number} userId - ID пользователя
   * @returns {Promise<Object|null>} Запись лояльности
   */
  static async findByUserId(userId) {
    const query = `SELECT * FROM ${this.tableName} WHERE user_id = ?`;
    return await this.safeQuery('get', query, [userId]);
  }

/**
   * Находит по реферальному коду
   * @param {string} referralCode - Реферальный код
   * @returns {Promise<Object|null>} Запись лояльности
   */
  static async findByReferralCode(referralCode) {
    const query = `SELECT * FROM ${this.tableName} WHERE referral_code = ?`;
    return await this.safeQuery('get', query, [referralCode]);
  }

  /**
   * Добавляет поинты лояльности
   * @param {number} userId - ID пользователя
   * @param {number} points - Количество поинтов
   * @param {string} reason - Причина начисления
   * @returns {Promise<Object>} Обновленная запись
   */
  static async addPoints(userId, points, reason) {
    return await this.transaction(async () => {
      const loyalty = await this.findByUserId(userId);
      if (!loyalty) {
        throw new NotFoundError('User loyalty record not found');
      }

      const newPoints = loyalty.loyalty_points + points;
      const newTotalEarned = loyalty.total_points_earned + points;
      
      // Определяем новый уровень
      const newLevel = this.calculateLevel(newPoints);

      const query = `
        UPDATE ${this.tableName}
        SET loyalty_points = ?,
            total_points_earned = ?,
            loyalty_level = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `;

      await this.safeQuery('run', query, [newPoints, newTotalEarned, newLevel, userId]);

      logger.info('Loyalty points added', {
        userId,
        points,
        reason,
        newLevel,
        oldLevel: loyalty.loyalty_level
      });

      // Проверяем достижения
      if (newLevel > loyalty.loyalty_level) {
        await this.unlockLevelAchievement(userId, newLevel);
      }

      return await this.findByUserId(userId);
    });
  }

  /**
   * Тратит поинты лояльности
   * @param {number} userId - ID пользователя
   * @param {number} points - Количество поинтов
   * @param {string} reason - Причина траты
   * @returns {Promise<Object>} Обновленная запись
   */
  static async spendPoints(userId, points, reason) {
    return await this.transaction(async () => {
      const loyalty = await this.findByUserId(userId);
      if (!loyalty) {
        throw new NotFoundError('User loyalty record not found');
      }

      if (loyalty.loyalty_points < points) {
        throw new BusinessError('Insufficient loyalty points', {
          required: points,
          available: loyalty.loyalty_points
        });
      }

      const newPoints = loyalty.loyalty_points - points;
      const newTotalSpent = loyalty.total_points_spent + points;

      const query = `
        UPDATE ${this.tableName}
        SET loyalty_points = ?,
            total_points_spent = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `;

      await this.safeQuery('run', query, [newPoints, newTotalSpent, userId]);

      logger.info('Loyalty points spent', {
        userId,
        points,
        reason,
        remaining: newPoints
      });

      return await this.findByUserId(userId);
    });
  }

  /**
   * Рассчитывает уровень по количеству поинтов
   * @param {number} points - Количество поинтов
   * @returns {number} Уровень
   */
  static calculateLevel(points) {
    let level = 1;
    
    for (const [lvl, data] of Object.entries(this.LOYALTY_LEVELS)) {
      if (points >= data.minPoints) {
        level = parseInt(lvl);
      } else {
        break;
      }
    }
    
    return level;
  }

  /**
   * Обрабатывает реферальный бонус
   * @param {number} referrerId - ID реферера
   * @param {number} bonusPoints - Бонусные поинты (по умолчанию 50)
   * @returns {Promise<void>}
   */
  static async processReferralBonus(referrerId, bonusPoints = 50) {
    const query = `
      UPDATE ${this.tableName}
      SET referral_count = referral_count + 1,
          referral_earnings = referral_earnings + ?
      WHERE user_id = ?
    `;

    await this.safeQuery('run', query, [bonusPoints, referrerId]);
    
    // Начисляем поинты
    await this.addPoints(referrerId, bonusPoints, 'referral_bonus');
  }

  /**
   * Разблокирует достижение
   * @param {number} userId - ID пользователя
   * @param {string} achievementId - ID достижения
   * @param {Object} achievementData - Данные достижения
   * @returns {Promise<Object>} Обновленная запись
   */
  static async unlockAchievement(userId, achievementId, achievementData = {}) {
    const loyalty = await this.findByUserId(userId);
    if (!loyalty) {
      throw new NotFoundError('User loyalty record not found');
    }

    const achievements = JSON.parse(loyalty.achievements_unlocked);
    
    // Проверяем, что достижение еще не разблокировано
    if (achievements.some(a => a.id === achievementId)) {
      return loyalty;
    }

    achievements.push({
      id: achievementId,
      unlockedAt: new Date().toISOString(),
      ...achievementData
    });

    const query = `
      UPDATE ${this.tableName}
      SET achievements_unlocked = ?
      WHERE user_id = ?
    `;

    await this.safeQuery('run', query, [JSON.stringify(achievements), userId]);

    logger.info('Achievement unlocked', {
      userId,
      achievementId
    });

    return await this.findByUserId(userId);
  }

  /**
   * Разблокирует достижение за уровень
   * @param {number} userId - ID пользователя
   * @param {number} level - Новый уровень
   * @returns {Promise<void>}
   */
  static async unlockLevelAchievement(userId, level) {
    const levelName = this.LOYALTY_LEVELS[level]?.name || `Level ${level}`;
    await this.unlockAchievement(userId, `level_${level}`, {
      name: `Reached ${levelName}`,
      type: 'level',
      level
    });
  }

  /**
   * Добавляет значок
   * @param {number} userId - ID пользователя
   * @param {string} badgeId - ID значка
   * @param {Object} badgeData - Данные значка
   * @returns {Promise<Object>} Обновленная запись
   */
  static async addBadge(userId, badgeId, badgeData = {}) {
    const loyalty = await this.findByUserId(userId);
    if (!loyalty) {
      throw new NotFoundError('User loyalty record not found');
    }

    const badges = JSON.parse(loyalty.badges_earned);
    
    // Проверяем, что значок еще не получен
    if (badges.some(b => b.id === badgeId)) {
      return loyalty;
    }

    badges.push({
      id: badgeId,
      earnedAt: new Date().toISOString(),
      ...badgeData
    });

    const query = `
      UPDATE ${this.tableName}
      SET badges_earned = ?
      WHERE user_id = ?
    `;

    await this.safeQuery('run', query, [JSON.stringify(badges), userId]);

    logger.info('Badge earned', {
      userId,
      badgeId
    });

    return await this.findByUserId(userId);
  }

  /**
   * Получает топ пользователей по поинтам
   * @param {number} limit - Количество пользователей
   * @returns {Promise<Array>} Массив пользователей
   */
  static async getTopUsers(limit = 10) {
    const query = `
      SELECT l.*, u.username, u.email
      FROM ${this.tableName} l
      JOIN users u ON l.user_id = u.id
      ORDER BY l.loyalty_points DESC
      LIMIT ?
    `;

    return await this.safeQuery('all', query, [limit]);
  }

  /**
   * Получает рефералов пользователя
   * @param {number} userId - ID пользователя
   * @returns {Promise<Array>} Массив рефералов
   */
  static async getReferrals(userId) {
    const query = `
      SELECT l.*, u.username, u.email, u.created_at as joined_at
      FROM ${this.tableName} l
      JOIN users u ON l.user_id = u.id
      WHERE l.referred_by = ?
      ORDER BY u.created_at DESC
    `;

    return await this.safeQuery('all', query, [userId]);
  }

  /**
   * Получает статистику лояльности
   * @returns {Promise<Object>} Статистика
   */
  static async getStatistics() {
    const query = `
      SELECT 
        COUNT(*) as total_users,
        AVG(loyalty_points) as avg_points,
        SUM(loyalty_points) as total_points,
        SUM(total_points_earned) as total_earned,
        SUM(total_points_spent) as total_spent,
        COUNT(CASE WHEN loyalty_level = 1 THEN 1 END) as bronze_users,
        COUNT(CASE WHEN loyalty_level = 2 THEN 1 END) as silver_users,
        COUNT(CASE WHEN loyalty_level = 3 THEN 1 END) as gold_users,
        COUNT(CASE WHEN loyalty_level = 4 THEN 1 END) as platinum_users,
        COUNT(CASE WHEN loyalty_level = 5 THEN 1 END) as diamond_users,
        SUM(referral_count) as total_referrals,
        AVG(referral_count) as avg_referrals
      FROM ${this.tableName}
    `;

    return await this.safeQuery('get', query);
  }

  /**
   * Начисляет ежедневный бонус
   * @param {number} userId - ID пользователя
   * @returns {Promise<Object>} Результат начисления
   */
  static async claimDailyBonus(userId) {
    const loyalty = await this.findByUserId(userId);
    if (!loyalty) {
      throw new NotFoundError('User loyalty record not found');
    }

    // Проверяем, получал ли пользователь бонус сегодня
    const lastClaim = loyalty.last_daily_claim;
    if (lastClaim) {
      const today = new Date().toDateString();
      const lastClaimDate = new Date(lastClaim).toDateString();
      
      if (today === lastClaimDate) {
        throw new BusinessError('Daily bonus already claimed');
      }
    }

    // Начисляем бонус в зависимости от уровня
    const bonusPoints = 10 * loyalty.loyalty_level;
    
    await this.addPoints(userId, bonusPoints, 'daily_bonus');

    // Обновляем время последнего получения
    const query = `
      UPDATE ${this.tableName}
      SET last_daily_claim = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `;

    await this.safeQuery('run', query, [userId]);

    return {
      points: bonusPoints,
      nextClaimAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };
  }
}

module.exports = UserLoyaltyModel;