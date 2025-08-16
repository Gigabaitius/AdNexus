/**
 * *project*\backend/services/user/subscriptionService.js
 * Subscription Service - handles user subscription operations
 */

const UserFinanceModel = require('../../models/user/userFinanceModel');
const UserModel = require('../../models/user/userModel');

class SubscriptionService {
  // Subscription plans configuration
  static PLANS = {
    free: {
      name: 'Free',
      price: 0,
      features: {
        campaigns_limit: 3,
        platforms_limit: 5,
        api_calls: 100,
        support: 'community',
        analytics: 'basic',
        ai_generations: 5
      }
    },
    standard: {
      name: 'Standard',
      price: 29.99,
      features: {
        campaigns_limit: 20,
        platforms_limit: 30,
        api_calls: 5000,
        support: 'email',
        analytics: 'advanced',
        ai_generations: 50
      }
    },
    premium: {
      name: 'Premium',
      price: 99.99,
      features: {
        campaigns_limit: -1, // unlimited
        platforms_limit: -1,
        api_calls: -1,
        support: 'priority',
        analytics: 'full',
        ai_generations: -1
      }
    }
  };

  /**
   * Get user subscription
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Subscription data
   */
  static async getSubscription(userId) {
    const finance = await UserFinanceModel.findByUserId(userId);
    if (!finance) {
      throw new Error('Finance record not found');
    }

    const plan = SubscriptionService.PLANS[finance.subscription_plan];
    const isActive = finance.subscription_plan === 'free' || 
                    (finance.subscription_expires_at && new Date(finance.subscription_expires_at) > new Date());

    return {
      plan: finance.subscription_plan,
      plan_name: plan.name,
      price: plan.price,
      features: plan.features,
      expires_at: finance.subscription_expires_at,
      auto_renew: finance.subscription_auto_renew,
      is_active: isActive,
      days_remaining: SubscriptionService.calculateDaysRemaining(finance.subscription_expires_at)
    };
  }

  /**
   * Subscribe to plan
   * @param {number} userId - User ID
   * @param {string} planName - Plan name
   * @param {number} months - Subscription duration in months
   * @returns {Promise<Object>} Subscription result
   */
  static async subscribe(userId, planName, months = 1) {
    if (!SubscriptionService.PLANS[planName]) {
      throw new Error('Invalid plan');
    }

    const plan = SubscriptionService.PLANS[planName];
    if (plan.price === 0) {
      throw new Error('Cannot subscribe to free plan');
    }

    // Get user finance data
    const finance = await UserFinanceModel.findByUserId(userId);
    if (!finance) {
      throw new Error('Finance record not found');
    }

    // Calculate total price
    const totalPrice = plan.price * months;

    // Check balance
    if (finance.balance < totalPrice) {
      throw new Error('Insufficient balance');
    }

    // Calculate expiration date
    const currentExpiry = finance.subscription_expires_at ? new Date(finance.subscription_expires_at) : new Date();
    const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
    const expiresAt = new Date(baseDate);
    expiresAt.setMonth(expiresAt.getMonth() + months);

    // Update subscription
    await UserFinanceModel.updateSubscription(userId, {
      plan: planName,
      expires_at: expiresAt.toISOString(),
      auto_renew: true
    });

    // Deduct payment
    await UserFinanceModel.updateBalance(userId, totalPrice, 'subtract');
    await UserFinanceModel.updateStats(userId, 'total_spent', totalPrice);

    return {
      plan: planName,
      expires_at: expiresAt.toISOString(),
      amount_paid: totalPrice,
      months: months
    };
  }

  /**
   * Cancel subscription
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  static async cancelSubscription(userId) {
    await UserFinanceModel.updateSubscription(userId, {
      plan: await SubscriptionService.getCurrentPlan(userId),
      expires_at: await SubscriptionService.getCurrentExpiry(userId),
      auto_renew: false
    });

    return true;
  }

  /**
   * Check feature availability
   * @param {number} userId - User ID
   * @param {string} feature - Feature name
   * @param {number} currentUsage - Current usage count
   * @returns {Promise<Object>} Feature availability
   */
  static async checkFeature(userId, feature, currentUsage = 0) {
    const subscription = await SubscriptionService.getSubscription(userId);
    
    if (!subscription.is_active) {
      return {
        available: false,
        reason: 'Subscription expired'
      };
    }

    const limit = subscription.features[feature];
    
    if (limit === -1) {
      return {
        available: true,
        unlimited: true
      };
    }

    if (currentUsage >= limit) {
      return {
        available: false,
        reason: 'Feature limit reached',
        limit: limit,
        current: currentUsage
      };
    }

    return {
      available: true,
      limit: limit,
      current: currentUsage,
      remaining: limit - currentUsage
    };
  }

  /**
   * Process subscription renewals
   * @returns {Promise<Object>} Renewal results
   */
  static async processRenewals() {
    // Get expiring subscriptions with auto-renew enabled
    const expiringSubscriptions = await UserFinanceModel.findExpiringSubscriptions(1); // 1 day ahead
    
    let renewed = 0;
    let failed = 0;
    const failures = [];

    for (const subscription of expiringSubscriptions) {
      if (!subscription.subscription_auto_renew) continue;

      try {
        const plan = SubscriptionService.PLANS[subscription.subscription_plan];
        
        // Check if user has sufficient balance
        if (subscription.balance >= plan.price) {
          // Renew for 1 month
          await SubscriptionService.subscribe(subscription.user_id, subscription.subscription_plan, 1);
          renewed++;
        } else {
          // Insufficient balance - disable auto-renew
          await SubscriptionService.cancelSubscription(subscription.user_id);
          failures.push({
            user_id: subscription.user_id,
            reason: 'Insufficient balance'
          });
          failed++;
        }
      } catch (error) {
        failures.push({
          user_id: subscription.user_id,
          reason: error.message
        });
        failed++;
      }
    }

    return {
      renewed,
      failed,
      failures
    };
  }

  /**
   * Downgrade expired subscriptions
   * @returns {Promise<number>} Number of downgraded subscriptions
   */
  static async downgradeExpired() {
    // Find expired non-free subscriptions
    const expired = await UserFinanceModel.findExpiringSubscriptions(-1); // Already expired
    
    let downgraded = 0;
    
    for (const subscription of expired) {
      if (subscription.subscription_plan !== 'free') {
        await UserFinanceModel.updateSubscription(subscription.user_id, {
          plan: 'free',
          expires_at: null,
          auto_renew: false
        });
        downgraded++;
      }
    }

    return downgraded;
  }

  /**
   * Get subscription statistics
   * @returns {Promise<Object>} Subscription statistics
   */
  static async getStatistics() {
    // In production, these would be optimized queries
    const stats = {
      total_subscribers: 0,
      by_plan: {
        free: 0,
        standard: 0,
        premium: 0
      },
      revenue: {
        monthly: 0,
        yearly: 0
      }
    };

    // This would be implemented with proper SQL queries
    return stats;
  }

  /**
   * Apply promo code
   * @param {number} userId - User ID
   * @param {string} promoCode - Promo code
   * @param {string} planName - Plan to apply promo to
   * @returns {Promise<Object>} Promo application result
   */
  static async applyPromoCode(userId, promoCode, planName) {
    // In production, validate promo code from database
    const validPromoCodes = {
      'WELCOME50': { discount: 0.5, validUntil: '2025-12-31' },
      'PREMIUM30': { discount: 0.3, validUntil: '2025-06-30', requiredPlan: 'premium' }
    };

    const promo = validPromoCodes[promoCode];
    if (!promo) {
      throw new Error('Invalid promo code');
    }

    if (new Date(promo.validUntil) < new Date()) {
      throw new Error('Promo code expired');
    }

    if (promo.requiredPlan && promo.requiredPlan !== planName) {
      throw new Error(`Promo code only valid for ${promo.requiredPlan} plan`);
    }

    const plan = SubscriptionService.PLANS[planName];
    const discountedPrice = plan.price * (1 - promo.discount);

    return {
      original_price: plan.price,
      discount: promo.discount,
      discounted_price: discountedPrice,
      savings: plan.price - discountedPrice
    };
  }

  /**
   * Calculate days remaining
   * @param {string} expiresAt - Expiration date
   * @returns {number|null} Days remaining or null if no expiration
   */
  static calculateDaysRemaining(expiresAt) {
    if (!expiresAt) return null;
    
    const expiry = new Date(expiresAt);
    const now = new Date();
    
    if (expiry <= now) return 0;
    
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.ceil((expiry - now) / msPerDay);
  }

  /**
   * Get current plan
   * @param {number} userId - User ID
   * @returns {Promise<string>} Current plan name
   */
  static async getCurrentPlan(userId) {
    const finance = await UserFinanceModel.findByUserId(userId);
    return finance?.subscription_plan || 'free';
  }

  /**
   * Get current expiry
   * @param {number} userId - User ID
   * @returns {Promise<string|null>} Current expiry date
   */
  static async getCurrentExpiry(userId) {
    const finance = await UserFinanceModel.findByUserId(userId);
    return finance?.subscription_expires_at || null;
  }
}

module.exports = SubscriptionService;