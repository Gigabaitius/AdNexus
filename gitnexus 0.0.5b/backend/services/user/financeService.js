/**
 * *project*\backend/services/user/financeService.js
 * Finance Service - handles user financial operations
 */

const UserFinanceModel = require('../../models/user/userFinanceModel');
const UserModel = require('../../models/user/userModel');

class FinanceService {
  /**
   * Get user balance
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Balance information
   */
  static async getBalance(userId) {
    const finance = await UserFinanceModel.findByUserId(userId);
    if (!finance) {
      throw new Error('Finance record not found');
    }

    return {
      balance: finance.balance,
      balance_on_hold: finance.balance_on_hold,
      available_balance: finance.balance - finance.balance_on_hold,
      total_earned: finance.total_earned,
      total_spent: finance.total_spent,
      total_withdrawn: finance.total_withdrawn
    };
  }

  /**
   * Deposit funds
   * @param {number} userId - User ID
   * @param {number} amount - Amount to deposit
   * @param {Object} metadata - Transaction metadata
   * @returns {Promise<Object>} Updated balance
   */
  static async addFunds(userId, amount, source, metadata = {}) {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    // Update balance
    const finance = await UserFinanceModel.addFunds(userId, amount, source, metadata);
    const loyaltyPoints = Math.floor(amount * 0.01); // 1% от суммы
    if (loyaltyPoints > 0) {
      await UserLoyaltyModel.addPoints(userId, loyaltyPoints, 'deposit_bonus');
    }

    // In production, create transaction record here

    return finance;
  }

  /**
   * Withdraw funds
   * @param {number} userId - User ID
   * @param {number} amount - Amount to withdraw
   * @param {Object} withdrawalData - Withdrawal details
   * @returns {Promise<Object>} Withdrawal request
   */
  static async withdrawFunds(userId, amount, destination, metadata = {}) {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    // Get current balance
    const finance = await UserFinanceModel.findByUserId(userId);
    if (!finance) {
      throw new Error('Finance record not found');
    }

    // Минимальная сумма вывода
    const MIN_WITHDRAWAL = 10;
    if (amount < MIN_WITHDRAWAL) {
      throw new BusinessError(`Minimum withdrawal amount is ${MIN_WITHDRAWAL}`);
    }

    const availableBalance = finance.balance - finance.balance_on_hold;
    if (availableBalance < amount) {
      throw new Error('Insufficient available balance');
    }

    // In production, create withdrawal request here

    return await UserFinanceModel.withdrawFunds(userId, amount, destination, metadata);
  }

  /**
   * Hold funds (for pending transactions)
   * @param {number} userId - User ID
   * @param {number} amount - Amount to hold
   * @param {string} reason - Reason for hold
   * @returns {Promise<Object>} Updated balance
   */
  static async holdFunds(userId, amount, reason) {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    // Get current balance
    const finance = await UserFinanceModel.findByUserId(userId);
    if (!finance) {
      throw new Error('Finance record not found');
    }

    if (finance.balance < amount) {
      throw new Error('Insufficient balance');
    }

    // Move funds from balance to hold
    await UserFinanceModel.updateBalance(userId, amount, 'subtract');
    await UserFinanceModel.updateBalanceOnHold(userId, amount, 'add');

    const balance = await FinanceService.getBalance(userId);
    return balance;
  }

  /**
   * Release held funds
   * @param {number} userId - User ID
   * @param {number} amount - Amount to release
   * @param {boolean} returnToBalance - Return to balance or process as spent
   * @returns {Promise<Object>} Updated balance
   */
  static async releaseFunds(userId, amount, returnToBalance = true) {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    // Get current balance
    const finance = await UserFinanceModel.findByUserId(userId);
    if (!finance) {
      throw new Error('Finance record not found');
    }

    if (finance.balance_on_hold < amount) {
      throw new Error('Insufficient held balance');
    }

    // Remove from hold
    await UserFinanceModel.updateBalanceOnHold(userId, amount, 'subtract');

    if (returnToBalance) {
      // Return to available balance
      await UserFinanceModel.updateBalance(userId, amount, 'add');
    } else {
      // Mark as spent
      await UserFinanceModel.updateStats(userId, 'total_spent', amount);
    }

    const balance = await FinanceService.getBalance(userId);
    return balance;
  }

  /**
   * Transfer funds between users
   * @param {number} fromUserId - Sender user ID
   * @param {number} toUserId - Recipient user ID
   * @param {number} amount - Amount to transfer
   * @param {Object} metadata - Transfer metadata
   * @returns {Promise<Object>} Transfer result
   */
  static async transfer(fromUserId, toUserId, amount, metadata = {}) {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    // Check sender balance
    const senderFinance = await UserFinanceModel.findByUserId(fromUserId);
    if (!senderFinance) {
      throw new Error('Sender finance record not found');
    }

    const availableBalance = senderFinance.balance - senderFinance.balance_on_hold;
    if (availableBalance < amount) {
      throw new Error('Insufficient available balance');
    }

    // Check recipient exists
    const recipient = await UserModel.findById(toUserId);
    if (!recipient) {
      throw new Error('Recipient not found');
    }

    // Process transfer
    await UserFinanceModel.updateBalance(fromUserId, amount, 'subtract');
    await UserFinanceModel.updateStats(fromUserId, 'total_spent', amount);

    await UserFinanceModel.updateBalance(toUserId, amount, 'add');
    await UserFinanceModel.updateStats(toUserId, 'total_earned', amount);

    // In production, create transaction record here

    return {
      from_user_id: fromUserId,
      to_user_id: toUserId,
      amount,
      status: 'completed',
      completed_at: new Date().toISOString()
    };
  }

  /**
   * Get transaction history
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Transaction history
   */
  static async getTransactionHistory(userId, options = {}) {
    // In production, fetch from transactions table
    // For now, return mock data
    return [];
  }

  /**
   * Calculate fees
   * @param {number} amount - Transaction amount
   * @param {string} type - Transaction type
   * @returns {Object} Fee calculation
   */
  static calculateFees(amount, type) {
    let feeRate = 0;

    switch (type) {
      case 'withdrawal':
        feeRate = 0.025; // 2.5%
        break;
      case 'platform_commission':
        feeRate = 0.10; // 10%
        break;
      default:
        feeRate = 0;
    }

    const fee = amount * feeRate;
    const netAmount = amount - fee;

    return {
      amount,
      fee,
      feeRate,
      netAmount
    };
  }
}

module.exports = FinanceService;