/**
 * *project*\backend/models/campaign/campaignSchedulingModel.js
 * Модель для работы с таблицей campaign_scheduling
 */

const BaseModel = require('../BaseModel');

class CampaignSchedulingModel extends BaseModel {
  static tableName = 'campaign_scheduling';

  /**
   * Создает запись расписания для кампании
   * @param {number} campaignId - ID кампании
   * @param {Object} schedulingData - Данные расписания
   * @returns {Promise<boolean>} Успешность операции
   */
  static async create(campaignId, schedulingData = {}) {
    const {
      schedule_type = 'continuous',
      schedule_settings = '{}',
      frequency_cap_enabled = false,
      frequency_cap_amount = null,
      frequency_cap_period = null,
      report_schedule = 'weekly',
      report_recipients = '[]'
    } = schedulingData;

    const query = `
      INSERT INTO campaign_scheduling (
        campaign_id, schedule_type, schedule_settings,
        frequency_cap_enabled, frequency_cap_amount, frequency_cap_period,
        report_schedule, report_recipients
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      await this.db.run(query, [
        campaignId, schedule_type, schedule_settings,
        frequency_cap_enabled, frequency_cap_amount, frequency_cap_period,
        report_schedule, report_recipients
      ]);
      return true;
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Находит расписание по ID кампании
   * @param {number} campaignId - ID кампании
   * @returns {Promise<Object|null>} Данные расписания
   */
  static async findByCampaignId(campaignId) {
    const query = `SELECT * FROM campaign_scheduling WHERE campaign_id = ?`;
    return await this.db.get(query, [campaignId]);
  }

  /**
   * Обновляет расписание кампании
   * @param {number} campaignId - ID кампании
   * @param {Object} updates - Обновляемые поля
   * @returns {Promise<boolean>} Успешность операции
   */
  static async update(campaignId, updates) {
    const allowedFields = [
      'schedule_type', 'schedule_settings',
      'frequency_cap_enabled', 'frequency_cap_amount', 'frequency_cap_period',
      'auto_start', 'auto_stop', 'auto_renew',
      'renewal_budget', 'renewal_period',
      'pause_conditions', 'resume_conditions',
      'report_schedule', 'report_recipients'
    ];

    const fieldsToUpdate = Object.keys(updates)
      .filter(key => allowedFields.includes(key));

    if (fieldsToUpdate.length === 0) {
      return false;
    }

    const setClause = fieldsToUpdate.map(field => `${field} = ?`).join(', ');
    const values = fieldsToUpdate.map(field => updates[field]);
    values.push(campaignId);

    const query = `UPDATE campaign_scheduling SET ${setClause} WHERE campaign_id = ?`;
    const result = await this.db.run(query, values);

    return result.changes > 0;
  }

  /**
   * Обновляет время последней отправки отчета
   * @param {number} campaignId - ID кампании
   * @returns {Promise<boolean>} Успешность операции
   */
  static async updateLastReportSent(campaignId) {
    const query = `
      UPDATE campaign_scheduling
      SET last_report_sent_at = CURRENT_TIMESTAMP
      WHERE campaign_id = ?
    `;

    const result = await this.db.run(query, [campaignId]);
    return result.changes > 0;
  }

  /**
   * Находит кампании, требующие отправки отчета
   * @param {string} schedule - Расписание (daily, weekly, monthly)
   * @returns {Promise<Array>} Массив кампаний
   */
  static async findDueForReport(schedule) {
    let interval;
    switch (schedule) {
      case 'daily':
        interval = '-1 day';
        break;
      case 'weekly':
        interval = '-7 days';
        break;
      case 'monthly':
        interval = '-1 month';
        break;
      default:
        return [];
    }

    const query = `
      SELECT cs.*, c.title, c.user_id
      FROM campaign_scheduling cs
      JOIN campaigns c ON cs.campaign_id = c.id
      WHERE cs.report_schedule = ?
        AND c.status = 'active'
        AND c.deleted_at IS NULL
        AND (
          cs.last_report_sent_at IS NULL 
          OR cs.last_report_sent_at < datetime('now', ?)
        )
    `;

    return await this.db.all(query, [schedule, interval]);
  }

  /**
   * Находит кампании для автоматического запуска
   * @returns {Promise<Array>} Массив кампаний
   */
  static async findForAutoStart() {
    const query = `
      SELECT cs.campaign_id
      FROM campaign_scheduling cs
      JOIN campaigns c ON cs.campaign_id = c.id
      WHERE cs.auto_start = 1
        AND c.status = 'draft'
        AND c.approval_status = 'approved'
        AND date('now') >= c.start_date
        AND c.deleted_at IS NULL
    `;

    const results = await this.db.all(query);
    return results.map(row => row.campaign_id);
  }

  /**
   * Находит кампании для автоматической остановки
   * @returns {Promise<Array>} Массив кампаний
   */
  static async findForAutoStop() {
    const query = `
      SELECT cs.campaign_id
      FROM campaign_scheduling cs
      JOIN campaigns c ON cs.campaign_id = c.id
      WHERE cs.auto_stop = 1
        AND c.status = 'active'
        AND (
          date('now') > c.end_date
          OR c.budget_spent >= c.budget_total * 0.95
        )
    `;

    const results = await this.db.all(query);
    return results.map(row => row.campaign_id);
  }

  /**
   * Находит кампании для автоматического продления
   * @returns {Promise<Array>} Массив кампаний
   */
  static async findForAutoRenew() {
    const query = `
      SELECT cs.*, c.end_date, c.budget_total
      FROM campaign_scheduling cs
      JOIN campaigns c ON cs.campaign_id = c.id
      WHERE cs.auto_renew = 1
        AND c.status = 'active'
        AND date('now') >= date(c.end_date, '-1 day')
        AND cs.renewal_budget > 0
    `;

    return await this.db.all(query);
  }
}

module.exports = CampaignSchedulingModel;