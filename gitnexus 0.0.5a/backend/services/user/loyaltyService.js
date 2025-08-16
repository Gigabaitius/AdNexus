/**
 * *project*\backend/services/user/loyaltyService.js
 * Loyalty Service - handles loyalty program operations
 */

const UserLoyaltyModel = require('../../models/user/userLoyaltyModel');
const UserModel = require('../../models/user/userModel');

class LoyaltyService {
  /**
   * Get user loyalty data
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Loyalty data
   */
  static async getLoyaltyData(userId) {
    const loyalty = await UserLoyaltyModel.findByUserId(userId);
    if (!loyalty) {
      throw new Error('Loyalty record not found');
    }

    // Parse JSON fields
    const achievements = JSON.parse(loyalty.achievements_unlocked || '[]');
    const badges = JSON.parse(loyalty.badges_earned || '[]');

    return {
      loyalty_points: loyalty.loyalty_points,
      loyalty_level: loyalty.loyalty_level,
      total_points_earned: loyalty.total_points_earned,
      total_points_spent: loyalty.total_points_spent,
      referral_code: loyalty.referral_code,
      referral_count: loyalty.referral_count,
      referral_earnings: loyalty.referral_earnings,
      achievements,
      badges,
      next_level_points: LoyaltyService.calculateNextLevelPoints(loyalty.loyalty_level)
    };
  }

  /**
   * Award points
   * @param {number} userId - User ID
   * @param {number} points - Points to award
   * @param {string} reason - Reason for points
   * @returns {Promise<Object>} Updated loyalty data
   */
  static async awardPoints(userId, points, reason) {
    if (points <= 0) {
      throw new Error('Points must be positive');
    }

    // Get current loyalty data
    const loyalty = await UserLoyaltyModel.findByUserId(userId);
    if (!loyalty) {
      throw new Error('Loyalty record not found');
    }

    // Update points
    await UserLoyaltyModel.updatePoints(userId, points, 'add');

    // Check for level up
    const newTotalPoints = loyalty.total_points_earned + points;
    const newLevel = Math.floor(newTotalPoints / 1000) + 1;

    if (newLevel > loyalty.loyalty_level) {
      await UserLoyaltyModel.updateLevel(userId, newLevel);
      
      // Award level up bonus
      const bonusPoints = newLevel * 100;
      await UserLoyaltyModel.updatePoints(userId, bonusPoints, 'add');
    }

    // Check for achievements
    await LoyaltyService.checkAchievements(userId);

    return await LoyaltyService.getLoyaltyData(userId);
  }

  /**
   * Spend points
   * @param {number} userId - User ID
   * @param {number} points - Points to spend
   * @param {string} item - What points are spent on
   * @returns {Promise<Object>} Updated loyalty data
   */
  static async spendPoints(userId, points, item) {
    if (points <= 0) {
      throw new Error('Points must be positive');
    }

    // Get current loyalty data
    const loyalty = await UserLoyaltyModel.findByUserId(userId);
    if (!loyalty) {
      throw new Error('Loyalty record not found');
    }

    if (loyalty.loyalty_points < points) {
      throw new Error('Insufficient loyalty points');
    }

    // Update points
    await UserLoyaltyModel.updatePoints(userId, points, 'subtract');

    // In production, record what points were spent on

    return await LoyaltyService.getLoyaltyData(userId);
  }

  /**
   * Process referral
   * @param {number} referrerId - Referrer user ID
   * @param {number} referredId - Referred user ID
   * @returns {Promise<Object>} Referral reward data
   */
  static async processReferral(referrerId, referredId) {
    // Award points to referrer
    const referralPoints = 500;
    await LoyaltyService.awardPoints(referrerId, referralPoints, 'referral');

    // Award bonus points to referred user
    const welcomePoints = 100;
    await LoyaltyService.awardPoints(referredId, welcomePoints, 'welcome_bonus');

    // Update referral earnings (in production, this would be monetary)
    const referralEarnings = 5.00; // $5 per referral
    await UserLoyaltyModel.updateReferralStats(referrerId, referralEarnings);

    return {
      referrer_points: referralPoints,
      referred_points: welcomePoints,
      earnings: referralEarnings
    };
  }

  /**
   * Check and unlock achievements
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Newly unlocked achievements
   */
  static async checkAchievements(userId) {
    const loyalty = await UserLoyaltyModel.findByUserId(userId);
    const user = await UserModel.findById(userId);
    
    const currentAchievements = JSON.parse(loyalty.achievements_unlocked || '[]');
    const newAchievements = [];

    // Define achievements
    const achievements = [
      { id: 'first_login', name: 'Welcome!', condition: () => user.login_count >= 1 },
      { id: 'loyal_user', name: 'Loyal User', condition: () => user.login_count >= 30 },
      { id: 'points_collector', name: 'Points Collector', condition: () => loyalty.total_points_earned >= 1000 },
      { id: 'big_spender', name: 'Big Spender', condition: () => loyalty.total_points_spent >= 5000 },
      { id: 'referral_master', name: 'Referral Master', condition: () => loyalty.referral_count >= 10 },
      { id: 'level_5', name: 'Level 5 Achiever', condition: () => loyalty.loyalty_level >= 5 }
    ];

    // Check each achievement
    for (const achievement of achievements) {
      if (!currentAchievements.includes(achievement.id) && achievement.condition()) {
        currentAchievements.push(achievement.id);
        newAchievements.push(achievement);
        
        // Award achievement points
        await UserLoyaltyModel.updatePoints(userId, 250, 'add');
      }
    }

    // Update achievements if any new ones unlocked
    if (newAchievements.length > 0) {
      await UserLoyaltyModel.updateAchievements(userId, JSON.stringify(currentAchievements));
    }

    return newAchievements;
  }

  /**
   * Get leaderboard
   * @param {string} type - Leaderboard type (points, level, referrals)
   * @param {number} limit - Number of users to return
   * @returns {Promise<Array>} Leaderboard data
   */
  static async getLeaderboard(type = 'points', limit = 10) {
    // For now, only support points leaderboard
    const topUsers = await UserLoyaltyModel.getTopUsersByPoints(limit);
    
    return topUsers.map((user, index) => ({
      rank: index + 1,
      username: user.username,
      loyalty_points: user.loyalty_points,
      loyalty_level: user.loyalty_level,
      badges_count: JSON.parse(user.badges_earned || '[]').length
    }));
  }

  /**
   * Calculate points needed for next level
   * @param {number} currentLevel - Current level
   * @returns {number} Points needed
   */
  static calculateNextLevelPoints(currentLevel) {
    return (currentLevel * 1000) - ((currentLevel - 1) * 1000);
  }

  /**
   * Award badge
   * @param {number} userId - User ID
   * @param {string} badgeId - Badge ID
   * @param {string} badgeName - Badge name
   * @returns {Promise<boolean>} Success status
   */
  static async awardBadge(userId, badgeId, badgeName) {
    const loyalty = await UserLoyaltyModel.findByUserId(userId);
    const badges = JSON.parse(loyalty.badges_earned || '[]');
    
    // Check if already has badge
    if (badges.some(b => b.id === badgeId)) {
      return false;
    }

    // Add badge
    badges.push({
      id: badgeId,
      name: badgeName,
      earned_at: new Date().toISOString()
    });

    await UserLoyaltyModel.updateBadges(userId, JSON.stringify(badges));
    
    // Award bonus points for badge
    await UserLoyaltyModel.updatePoints(userId, 100, 'add');

    return true;
  }
}

module.exports = LoyaltyService;