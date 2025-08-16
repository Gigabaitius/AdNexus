// *project*\backend\models\platformModel.js

/**
 * ИНДЕКС МЕТОДОВ МОДЕЛИ Platform
 * 
 * === CRUD ОПЕРАЦИИ ===
 * createPlatform(platformData) - создает площадку v2 (все поля) -> возвращает созданную площадку
 * getPlatformById(id) - получает площадку по ID с полными данными v2 -> возвращает площадку или null
 * updatePlatform(id, updateData) - обновляет площадку v2 (все поля) -> возвращает обновленную площадку
 * deletePlatform(id) - soft delete (deleted_at) -> возвращает boolean
 * hardDeletePlatform(id) - полное удаление из БД -> возвращает boolean
 * softDelete(platformId) - soft delete (deleted_at, status='archived') -> void
 * restore(platformId) - восстанавливает удаленную площадку -> void
 * archive(id, userId) - архивирует площадку (проверяет права) -> возвращает boolean
 * clonePlatform(platformId, userId, newName) - клонирует площадку -> возвращает новую площадку
 * 
 * === ПОИСК И ВЫБОРКА ===
 * findAll(options) - получает площадки v1 с фильтрацией -> {data, pagination}
 * getAllPlatforms(filters, sort, pagination) - получает все площадки v2 с фильтрацией -> {data, pagination}
 * getPlatformsByUser(userId) - все площадки пользователя -> массив площадок
 * getActivePlatforms(options) - только активные площадки -> {data, pagination}
 * searchPlatforms(query, filters) - полнотекстовый поиск -> массив результатов
 * searchFullText(query, options) - полнотекстовый поиск v2 -> массив результатов  ❌ УПОМИНАЕТСЯ, НО ОТСУТСТВУЕТ
 * getPlatformsByTags(tagIds) - площадки по тегам (заглушка) -> массив площадок
 * getPlatformsByCategory(category) - площадки по категории -> массив площадок
 * getPlatformsBySubtype(subtype) - площадки по подтипу -> массив площадок
 * getNegotiablePlatforms() - площадки с возможностью торга -> массив площадок
 * findSimilar(platformId, limit) - похожие площадки v1 -> массив площадок  ❌ УПОМИНАЕТСЯ, НО ОТСУТСТВУЕТ
 * getSimilarPlatforms(platformId, limit) - похожие площадки v2 -> массив площадок
 * getTopPlatforms(criteria, limit) - топ площадок по критерию -> массив площадок
 * getPendingModeration(options) - площадки на модерации -> {data, pagination}
 * getPlatformsReadyForReview() - площадки готовые к проверке -> массив площадок
 * getExpiringVerifications(daysBeforeExpiry) - площадки с истекающей верификацией -> массив площадок
 * getExpiringPremium(daysBeforeExpiry) - площадки с истекающим премиум -> массив площадок
 * 
 * === СТАТУСЫ И МОДЕРАЦИЯ ===
 * updateStatus(id, newStatus, userId) - изменяет статус (проверяет права) -> обновленная площадка  ❌ УПОМИНАЕТСЯ, НО ОТСУТСТВУЕТ
 * updatePlatformStatus(id, newStatus, userId) - изменяет статус (проверяет права) -> обновленная площадка  ✅ ДУБЛИРУЕТ updateStatus
 * updateModerationStatus(id, status, moderatorId, notes) - обновляет модерацию -> обновленная площадка
 * moderate(id, decision, moderatorId, notes) - модерирует площадку -> обновленная площадка
 * 
 * === ВЕРИФИКАЦИЯ ===
 * updateVerificationStatus(id, status, data) - обновляет статус верификации v2 -> обновленная площадка
 * incrementVerificationAttempts(id) - увеличивает счетчик попыток -> новое количество
 * expireVerifications() - истекает верификации -> количество обновленных
 * setVerificationMethod(platformId, method) - устанавливает метод верификации -> void
 * 
 * === МЕТРИКИ И КАЧЕСТВО ===
 * updateQualityMetrics(id, rating, qualityScore) - обновляет метрики качества -> void  ❌ УПОМИНАЕТСЯ, НО ОТСУТСТВУЕТ
 * calculateQualityScore(platform) - вычисляет quality_score -> число (0-10)  ❌ УПОМИНАЕТСЯ, НО ОТСУТСТВУЕТ
 * updateQualityScore(id) - пересчитывает и сохраняет quality_score -> новый score
 * updateTrustScore(id) - пересчитывает и сохраняет trust_score -> новый score
 * updateRating(id, newRating, reviewsCount) - обновляет рейтинг -> void
 * updateEngagementLevel(platformId) - обновляет уровень вовлеченности -> новый уровень
 * updatePlatformMetrics(id, metrics) - обновляет метрики v1 -> void
 * updatePerformanceMetrics(platformId, metrics) - обновляет метрики v2 -> void
 * addPerformanceHistory(platformId, performanceData) - добавляет в историю -> void
 * addHistoricalPerformance(id, performanceData) - добавляет в историю v2 -> void  ❌ УПОМИНАЕТСЯ, НО ОТСУТСТВУЕТ
 * 
 * === АУДИТОРИЯ И ВЛАДЕЛЕЦ ===
 * updateOwnerInfo(platformId, ownerData) - обновляет данные владельца -> void
 * updateAudienceDetails(platformId, audienceData) - обновляет данные аудитории -> void
 * touchAudienceLastUpdated(platformId) - обновляет время последнего обновления аудитории -> void
 * 
 * === БРОНИРОВАНИЕ И КАМПАНИИ ===
 * addBooking(platformId, campaignId, startDate, endDate, options) - добавляет бронирование -> возвращает созданное бронирование
 * removeBooking(platformId, campaignId) - удаляет бронирование -> void
 * updateBookingStatus(platformId, campaignPlatformId, newStatus) - обновляет статус бронирования -> void
 * getBookingDetails(platformId, campaignId) - получает детали бронирования -> объект или null
 * cancelBooking(platformId, campaignPlatformId, reason) - отменяет бронирование -> void
 * activatePendingBookings() - активирует готовые бронирования -> количество активированных
 * completeExpiredBookings() - завершает истекшие бронирования -> количество завершенных
 * checkAvailability(platformId, startDate, endDate) - проверяет доступность -> boolean
 * getBookedDates(platformId) - получает забронированные даты -> массив бронирований
 * checkScheduleAvailability(schedule, startDate, endDate) - проверяет по расписанию -> boolean
 * calculateBookingPrice(platform, startDate, endDate, pricingModel, adFormat) - рассчитывает стоимость -> объект с ценой
 * updateCampaignCounts(id, delta) - обновляет счетчики кампаний -> void
 * completeCampaign(platformId, revenue) - завершает кампанию -> void
 * 
 * === ИНТЕГРАЦИИ И НАСТРОЙКИ ===
 * updateIntegrationSettings(platformId, integrationType, settings) - настройки интеграции -> void
 * connectAnalytics(platformId, service, connectionData) - подключает аналитику -> void
 * updateSettings(platformId, settings) - обновляет настройки -> void
 * updateCustomFields(platformId, customFields) - обновляет кастомные поля -> void
 * 
 * === ПРЕМИУМ И ЭКСКЛЮЗИВ ===
 * setPremiumStatus(platformId, until) - устанавливает премиум -> void
 * cancelPremiumStatus(platformId) - отменяет премиум -> void
 * setExclusiveStatus(platformId, isExclusive) - устанавливает эксклюзивность -> void
 * expirePremiumStatuses() - истекает премиум статусы -> количество обновленных
 * 
 * === КАТЕГОРИИ И ПОИСК ===
 * updateSearchData(platformId, searchData) - обновляет данные для поиска -> void
 * bulkUpdateCategories(platforms) - массово обновляет категории -> количество обновленных
 * 
 * === КОНТАКТЫ И ПЛАТЕЖИ ===
 * updateContactInfo(platformId, contactInfo) - обновляет контакты -> void
 * updatePaymentDetails(platformId, paymentDetails) - обновляет платежные данные -> void
 * updateNotes(platformId, notes) - обновляет заметки -> void
 * 
 * === ФОРМАТЫ РЕКЛАМЫ ===
 * updateAdFormats(platformId, formats, specifications, restrictions) - обновляет форматы -> void
 * updateAvailabilitySchedule(platformId, schedule, advanceBookingDays) - расписание -> void
 * updateLanguages(platformId, primaryLanguage, supportedLanguages) - языки -> void
 * 
 * === СИНХРОНИЗАЦИЯ ===
 * updateLastActiveAt(id) - обновляет последнюю активность -> void
 * updateSyncStatus(id, status, error) - обновляет статус синхронизации -> void
 * 
 * === СТАТИСТИКА И АНАЛИТИКА ===
 * getUserPlatformsStats(userId) - статистика площадок пользователя v2 (расширенная) -> объект статистики
 * calculatePriceRanges() - рассчитывает диапазоны цен -> объект с диапазонами
 * calculateAudienceSizeRanges() - рассчитывает диапазоны аудитории -> объект с диапазонами
 * getPlatformAnalytics(platformId, days) - аналитика площадки за период -> объект аналитики
 * generatePlatformReport(platformId, startDate, endDate) - генерирует отчет -> объект отчета
 * updateAllPlatformsStats() - обновляет статистику всех площадок -> {updated, errors, total}
 * getGlobalStats() - глобальная статистика (только админ) -> объект статистики  ❌ УПОМИНАЕТСЯ, НО ОТСУТСТВУЕТ
 * recalculatePriceRange(platformId) - пересчитывает ценовой диапазон -> новый диапазон
 * calculateAverageCTR(data) - вычисляет средний CTR -> число
 * 
 * === УТИЛИТЫ ===
 * checkUrlAvailability(url) - проверяет доступность URL -> boolean
 * parseJSON(jsonString) - парсит JSON строку -> объект или null
 * validatePlatformData(platformData) - валидирует данные -> {valid: boolean, errors: Array}
 * isValidUrl(url) - проверяет валидность URL -> boolean
 * checkAccess(platformId, userId, action) - проверяет права доступа -> boolean
 * 
 * === МАССОВЫЕ ОПЕРАЦИИ ===
 * archiveInactivePlatforms(days) - архивирует неактивные -> количество архивированных
 * bulkImport(platformsData, userId) - массовый импорт -> {imported, failed, errors}
 * exportUserPlatforms(userId, format) - экспорт площадок -> данные в формате
 * mergePlatforms(platformIds, primaryId) - объединяет площадки -> результат объединения
 */

/**
 * Модель для работы с рекламными площадками
 * @extends BaseModel
 */
class Platform extends BaseModel {
    static tableName = 'adPlatforms';


    /*  === CRUD ОПЕРАЦИИ ===
     * createPlatform(platformData) - создает площадку v2 (все поля) -> возвращает созданную площадку
     * getPlatformById(id) - получает площадку по ID с полными данными v2 -> возвращает площадку или null
     * updatePlatform(id, updateData) - обновляет площадку v2 (все поля) -> возвращает обновленную площадку
     * deletePlatform(id) - soft delete (deleted_at) -> возвращает boolean
     * hardDeletePlatform(id) - полное удаление из БД -> возвращает boolean
     * softDelete(platformId) - soft delete (deleted_at, status='archived') -> void
     * restore(platformId) - восстанавливает удаленную площадку -> void
     * archive(id, userId) - архивирует площадку (проверяет права) -> возвращает boolean
     * clonePlatform(platformId, userId, newName) - клонирует площадку -> возвращает новую площадку
     */

    /** Создает новую площадку с расширенными полями v2
     * @param {Object} platformData - Полные данные площадки v2
     * @returns {Promise<Object>} Созданная площадка
     */
    static async createPlatform(platformData) {
        const {
            // Основные поля
            user_id,
            name,
            type,
            subtype,
            url,
            verification_url,
            description,
            language = 'en',
            languages_supported = ['en'],

            // Аудитория
            audience_size = 0,
            audience_daily_active = 0,
            audience_demographics = {},
            audience_interests = [],

            // Ценообразование
            pricing_model,
            pricing = {},
            minimum_budget = 0,
            currency = 'USD',
            price_negotiable = false,

            // Форматы рекламы
            ad_formats_supported = [],
            ad_specifications = {},
            content_restrictions = [],

            // Расписание
            availability_schedule = {},
            advance_booking_days = 1,

            // Контакты
            contact_info = {},

            // Категории
            primary_category,
            categories = [],
            keywords,

            // Настройки
            settings = {},
            notes
        } = platformData;

        // Получаем информацию о владельце для денормализации
        const owner = await this.db.get('SELECT username, is_verified FROM users WHERE id = ?', [user_id]);
        if (!owner) throw new Error('User not found');

        // Определяем диапазон размера аудитории
        const audience_size_range =
            audience_size < 1000 ? 'micro' :
                audience_size < 10000 ? 'small' :
                    audience_size < 100000 ? 'medium' : 'large';

        const result = await this.db.run(
            `INSERT INTO ${this.tableName} (
        user_id, owner_username, owner_verified,
        name, type, subtype, url, verification_url, description,
        language, languages_supported,
        audience_size, audience_daily_active, audience_demographics, 
        audience_interests, audience_size_range,
        pricing_model, pricing, minimum_budget, currency, price_negotiable,
        ad_formats_supported, ad_specifications, content_restrictions,
        availability_schedule, advance_booking_days,
        contact_info, primary_category, categories, keywords,
        settings, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                user_id, owner.username, owner.is_verified,
                name, type, subtype, url, verification_url, description,
                language, JSON.stringify(languages_supported),
                audience_size, audience_daily_active, JSON.stringify(audience_demographics),
                JSON.stringify(audience_interests), audience_size_range,
                pricing_model, JSON.stringify(pricing), minimum_budget, currency, price_negotiable,
                JSON.stringify(ad_formats_supported), JSON.stringify(ad_specifications),
                JSON.stringify(content_restrictions),
                JSON.stringify(availability_schedule), advance_booking_days,
                JSON.stringify(contact_info), primary_category, JSON.stringify(categories), keywords,
                JSON.stringify(settings), notes
            ]
        );

        return this.getPlatformById(result.lastID);
    }

    /** Получает площадку по ID с полными данными v2
     * @param {number} id - ID площадки
     * @returns {Promise<Object|null>} Площадка с расширенными полями
     */
    static async getPlatformById(id) {
        const platform = await this.db.get(`
      SELECT 
        p.*,
        CASE WHEN p.deleted_at IS NULL THEN 0 ELSE 1 END as is_deleted,
        CASE WHEN p.premium_until > datetime('now') THEN 1 ELSE 0 END as is_premium_active
      FROM ${this.tableName} p
      WHERE p.id = ?
    `, [id]);

        if (!platform) return null;

        // Парсим все JSON поля
        const jsonFields = [
            'languages_supported', 'audience_demographics', 'audience_interests',
            'metrics', 'historical_performance', 'pricing', 'ad_formats_supported',
            'ad_specifications', 'content_restrictions', 'availability_schedule',
            'booking_calendar', 'verification_data', 'integration_settings',
            'analytics_connected', 'categories', 'contact_info', 'payment_details',
            'custom_fields', 'settings'
        ];

        jsonFields.forEach(field => {
            if (platform[field]) {
                platform[field] = this.parseJSON(platform[field]);
            }
        });

        return platform;
    }

    /** Обновляет данные площадки с валидацией новых полей
     * @param {number} id - ID площадки
     * @param {Object} updateData - Данные для обновления
     * @returns {Promise<Object>} Обновленная площадка
     */
    static async updatePlatform(id, updateData) {

        const allowedFields = [
            'name', 'type', 'subtype', 'url', 'verification_url', 'description',
            'language', 'languages_supported', 'audience_size', 'audience_daily_active',
            'audience_demographics', 'audience_interests', 'audience_verified',
            'pricing_model', 'pricing', 'minimum_budget', 'currency', 'price_negotiable',
            'ad_formats_supported', 'ad_specifications', 'content_restrictions',
            'availability_schedule', 'advance_booking_days', 'contact_info',
            'primary_category', 'categories', 'keywords', 'notes', 'custom_fields',
            'settings'
        ];

        const updates = [];
        const values = [];
        const jsonFields = [
            'languages_supported', 'audience_demographics', 'audience_interests',
            'pricing', 'ad_formats_supported', 'ad_specifications', 'content_restrictions',
            'availability_schedule', 'contact_info', 'categories', 'custom_fields', 'settings'
        ];

        for (const [key, value] of Object.entries(updateData)) {
            if (allowedFields.includes(key) && value !== undefined) {
                updates.push(`${key} = ?`);
                values.push(jsonFields.includes(key) ? JSON.stringify(value) : value);
            }
        }

        if (updates.length === 0) return this.getPlatformById(id);

        // Обновляем audience_size_range если меняется audience_size
        if ('audience_size' in updateData) {
            updates.push('audience_size_range = ?');
            const range =
                updateData.audience_size < 1000 ? 'micro' :
                    updateData.audience_size < 10000 ? 'small' :
                        updateData.audience_size < 100000 ? 'medium' : 'large';
            values.push(range);
        }

        values.push(id);
        await this.db.run(
            `UPDATE ${this.tableName} SET ${updates.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
            values
        );

        return this.getPlatformById(id);
    }

    /** Выполняет soft delete площадки
     * @param {number} id - ID площадки
     * @returns {Promise<boolean>} Успешность удаления
     */
    static async deletePlatform(id) {
        const result = await this.db.run(
            `UPDATE ${this.tableName} 
       SET deleted_at = CURRENT_TIMESTAMP, status = 'archived'
       WHERE id = ? AND deleted_at IS NULL`,
            [id]
        );
        return result.changes > 0;
    }

    /** Полностью удаляет площадку из БД
     * @param {number} id - ID площадки
     * @returns {Promise<boolean>} Успешность удаления
     */
    static async hardDeletePlatform(id) {
        const result = await this.db.run(
            `DELETE FROM ${this.tableName} WHERE id = ?`,
            [id]
        );
        return result.changes > 0;
    }

    /** Soft delete площадки
     * @param {number} platformId - ID площадки
     */
    static async softDelete(platformId) {
        await this.db.run(
            `UPDATE ${this.tableName} 
       SET deleted_at = CURRENT_TIMESTAMP,
           status = 'archived'
       WHERE id = ?`,
            [platformId]
        );
    }

    /** Восстанавливает удаленную площадку
     * @param {number} platformId - ID площадки
     */
    static async restore(platformId) {
        await this.db.run(
            `UPDATE ${this.tableName} 
       SET deleted_at = NULL,
           status = 'draft'
       WHERE id = ?`,
            [platformId]
        );
    }

    /** Архивирует площадку
     * @param {number} id - ID площадки
     * @param {number} userId - ID пользователя
     * @returns {Promise<boolean>} Успешность архивации
     */
    static async archive(id, userId) {
        const platform = await this.getPlatformById(id);
        if (!platform) {
            throw new Error('Platform not found');
        }

        // Проверка прав
        const user = await this.db.get('SELECT is_Admin FROM users WHERE id = ?', [userId]);
        if (platform.user_id !== userId && !user?.is_Admin) {
            throw new Error('Unauthorized to archive this platform');
        }

        const result = await this.db.run(
            `UPDATE ${this.tableName} SET status = 'archived' WHERE id = ?`,
            [id]
        );

        return result.changes > 0;
    }

    /** Клонирует площадку (создает копию с новым ID)
     * @param {number} platformId - ID исходной площадки
     * @param {number} userId - ID нового владельца
     * @param {string} newName - Новое название
     * @returns {Promise<Object>} Новая площадка
     */
    static async clonePlatform(platformId, userId, newName) {
        const original = await this.getPlatformById(platformId);
        if (!original) throw new Error('Platform not found');

        // Удаляем поля, которые не должны копироваться
        const platformData = { ...original };
        delete platformData.id;
        delete platformData.created_at;
        delete platformData.updated_at;
        delete platformData.published_at;
        delete platformData.last_active_at;
        delete platformData.deleted_at;
        delete platformData.verification_status;
        delete platformData.verification_data;
        delete platformData.verification_attempts;
        delete platformData.moderation_status;
        delete platformData.moderated_by;
        delete platformData.moderated_at;
        delete platformData.rating;
        delete platformData.quality_score;
        delete platformData.trust_score;
        delete platformData.total_reviews;
        delete platformData.total_campaigns_completed;
        delete platformData.total_revenue_generated;
        delete platformData.active_campaigns_count;
        delete platformData.total_campaigns_count;
        delete platformData.last_campaign_date;
        delete platformData.booking_calendar;
        delete platformData.is_premium;
        delete platformData.premium_until;

        // Обновляем данные
        platformData.user_id = userId;
        platformData.name = newName;
        platformData.status = 'draft';
        platformData.url = `${original.url}-copy-${Date.now()}`;

        return this.createPlatform(platformData);
    }

    /* === ПОИСК И ВЫБОРКА ===
     * findAll(options) - получает площадки v1 с фильтрацией -> {data, pagination}
     * getAllPlatforms(filters, sort, pagination) - получает все площадки v2 с фильтрацией -> {data, pagination}
     * getPlatformsByUser(userId) - все площадки пользователя -> массив площадок
     * getActivePlatforms(options) - только активные площадки -> {data, pagination}
     * searchPlatforms(query, filters) - полнотекстовый поиск -> массив результатов
     * searchFullText(query, options) - полнотекстовый поиск v2 -> массив результатов
     * getPlatformsByTags(tagIds) - площадки по тегам (заглушка) -> массив площадок
     * getPlatformsByCategory(category) - площадки по категории -> массив площадок
     * getPlatformsBySubtype(subtype) - площадки по подтипу -> массив площадок
     * getNegotiablePlatforms() - площадки с возможностью торга -> массив площадок
     * getSimilarPlatforms(platformId, limit) - похожие площадки v2 -> массив площадок
     * getTopPlatforms(criteria, limit) - топ площадок по критерию -> массив площадок
     * getPendingModeration(options) - площадки на модерации -> {data, pagination}
     * getPlatformsReadyForReview() - площадки готовые к проверке -> массив площадок
     * getExpiringVerifications(daysBeforeExpiry) - площадки с истекающей верификацией -> массив площадок
     * getExpiringPremium(daysBeforeExpiry) - площадки с истекающим премиум -> массив площадок
     */

    /** Получает все площадки с фильтрацией
     * @param {Object} options - Опции фильтрации
     * @returns {Promise<{data: Array, pagination: Object}>}
     */
    static async findAll(options = {}) {
        const {
            user_id,
            type,
            status,
            moderation_status,
            verification_status,
            pricing_model,
            currency,
            audience_min,
            audience_max,
            price_max,
            search,
            sort = 'created_at:desc',
            page = 1,
            limit = 20
        } = options;

        let whereConditions = ['1=1'];
        const params = [];

        // Фильтры
        if (user_id) {
            whereConditions.push('p.user_id = ?');
            params.push(user_id);
        }

        if (type) {
            if (Array.isArray(type)) {
                whereConditions.push(`p.type IN (${type.map(() => '?').join(',')})`);
                params.push(...type);
            } else {
                whereConditions.push('p.type = ?');
                params.push(type);
            }
        }

        if (status) {
            whereConditions.push('p.status = ?');
            params.push(status);
        }

        if (moderation_status) {
            whereConditions.push('p.moderation_status = ?');
            params.push(moderation_status);
        }

        if (verification_status) {
            whereConditions.push('p.verification_status = ?');
            params.push(verification_status);
        }

        if (pricing_model) {
            whereConditions.push('p.pricing_model = ?');
            params.push(pricing_model);
        }

        if (currency) {
            whereConditions.push('p.currency = ?');
            params.push(currency);
        }

        if (audience_min) {
            whereConditions.push('p.audience_size >= ?');
            params.push(audience_min);
        }

        if (audience_max) {
            whereConditions.push('p.audience_size <= ?');
            params.push(audience_max);
        }

        if (search) {
            whereConditions.push('(p.name LIKE ? OR p.description LIKE ? OR p.url LIKE ?)');
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        // Фильтр по максимальной цене (для любой модели ценообразования)
        if (price_max) {
            // Это потребует более сложной логики с JSON
            // Пока упрощенная версия - будет доработано при расширении
        }

        const whereClause = whereConditions.join(' AND ');

        // Подсчет общего количества
        const countResult = await this.db.get(
            `SELECT COUNT(*) as total FROM ${this.tableName} p WHERE ${whereClause}`,
            params
        );

        // Сортировка и пагинация
        const [sortField, sortOrder] = sort.split(':');
        const offset = (page - 1) * limit;

        // Получение данных
        const platforms = await this.db.all(`
          SELECT 
            p.*,
            u.username as owner_username,
            CASE 
              WHEN p.audience_size < 1000 THEN 'micro'
              WHEN p.audience_size < 10000 THEN 'small'
              WHEN p.audience_size < 100000 THEN 'medium'
              ELSE 'large'
            END as audience_size_category
          FROM ${this.tableName} p
          LEFT JOIN users u ON p.user_id = u.id
          WHERE ${whereClause}
          ORDER BY p.${sortField} ${sortOrder.toUpperCase()}
          LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        // Парсим JSON поля для каждой площадки
        platforms.forEach(platform => {
            platform.audience_demographics = this.parseJSON(platform.audience_demographics);
            platform.pricing = this.parseJSON(platform.pricing);
        });

        return {
            data: platforms,
            pagination: {
                total: countResult.total,
                page,
                limit,
                pages: Math.ceil(countResult.total / limit)
            }
        };
    }

    /** Получает все площадки с расширенной фильтрацией v2
     * @param {Object} filters - Фильтры
     * @param {string} sort - Сортировка
     * @param {Object} pagination - Пагинация
     * @returns {Promise<{data: Array, pagination: Object}>}
     */
    static async getAllPlatforms(filters = {}, sort = 'created_at:desc', pagination = {}) {
        const { page = 1, limit = 20 } = pagination;
        const offset = (page - 1) * limit;

        let whereConditions = ['p.deleted_at IS NULL'];
        const params = [];

        // Расширенные фильтры v2
        const filterMappings = {
            user_id: 'p.user_id = ?',
            type: 'p.type = ?',
            subtype: 'p.subtype = ?',
            status: 'p.status = ?',
            moderation_status: 'p.moderation_status = ?',
            verification_status: 'p.verification_status = ?',
            pricing_model: 'p.pricing_model = ?',
            currency: 'p.currency = ?',
            language: 'p.language = ?',
            primary_category: 'p.primary_category = ?',
            price_range: 'p.price_range = ?',
            audience_size_range: 'p.audience_size_range = ?',
            engagement_level: 'p.engagement_level = ?',
            is_premium: 'p.is_premium = ?',
            is_exclusive: 'p.is_exclusive = ?',
            owner_verified: 'p.owner_verified = ?',
            audience_verified: 'p.audience_verified = ?'
        };

        // Применяем простые фильтры
        for (const [key, condition] of Object.entries(filterMappings)) {
            if (filters[key] !== undefined) {
                whereConditions.push(condition);
                params.push(filters[key]);
            }
        }

        // Диапазонные фильтры
        if (filters.audience_min) {
            whereConditions.push('p.audience_size >= ?');
            params.push(filters.audience_min);
        }
        if (filters.audience_max) {
            whereConditions.push('p.audience_size <= ?');
            params.push(filters.audience_max);
        }
        if (filters.minimum_budget_max) {
            whereConditions.push('p.minimum_budget <= ?');
            params.push(filters.minimum_budget_max);
        }
        if (filters.quality_score_min) {
            whereConditions.push('p.quality_score >= ?');
            params.push(filters.quality_score_min);
        }
        if (filters.trust_score_min) {
            whereConditions.push('p.trust_score >= ?');
            params.push(filters.trust_score_min);
        }
        if (filters.rating_min) {
            whereConditions.push('p.rating >= ?');
            params.push(filters.rating_min);
        }

        // Поиск по тексту
        if (filters.search) {
            whereConditions.push('(p.name LIKE ? OR p.description LIKE ? OR p.url LIKE ? OR p.keywords LIKE ?)');
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        // Фильтр по категориям (JSON массив)
        if (filters.categories && filters.categories.length > 0) {
            const categoryConditions = filters.categories.map(() => `p.categories LIKE ?`).join(' OR ');
            whereConditions.push(`(${categoryConditions})`);
            filters.categories.forEach(cat => params.push(`%"${cat}"%`));
        }

        const whereClause = whereConditions.join(' AND ');

        // Подсчет общего количества
        const countResult = await this.db.get(
            `SELECT COUNT(*) as total FROM ${this.tableName} p WHERE ${whereClause}`,
            params
        );

        // Сортировка
        const [sortField, sortOrder] = sort.split(':');
        const validSortFields = [
            'created_at', 'updated_at', 'published_at', 'name', 'audience_size',
            'quality_score', 'trust_score', 'rating', 'minimum_budget',
            'total_campaigns_completed', 'total_revenue_generated'
        ];
        const finalSortField = validSortFields.includes(sortField) ? sortField : 'created_at';
        const finalSortOrder = sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        // Получение данных
        const platforms = await this.db.all(`
      SELECT p.*
      FROM ${this.tableName} p
      WHERE ${whereClause}
      ORDER BY p.${finalSortField} ${finalSortOrder}
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

        // Парсим JSON поля
        platforms.forEach(platform => {
            const jsonFields = [
                'languages_supported', 'audience_demographics', 'audience_interests',
                'pricing', 'ad_formats_supported', 'categories', 'contact_info'
            ];
            jsonFields.forEach(field => {
                if (platform[field]) {
                    platform[field] = this.parseJSON(platform[field]);
                }
            });
        });

        return {
            data: platforms,
            pagination: {
                total: countResult.total,
                page,
                limit,
                pages: Math.ceil(countResult.total / limit)
            }
        };
    }

    /** Получает все площадки пользователя
     * @param {number} userId - ID пользователя
     * @returns {Promise<Array>} Массив площадок
     */
    static async getPlatformsByUser(userId) {
        const platforms = await this.db.all(`
      SELECT * FROM ${this.tableName}
      WHERE user_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC
    `, [userId]);

        // Парсим JSON поля
        platforms.forEach(platform => {
            ['pricing', 'audience_demographics', 'categories'].forEach(field => {
                if (platform[field]) {
                    platform[field] = this.parseJSON(platform[field]);
                }
            });
        });

        return platforms;
    }

    /** Получает только активные площадки
     * @param {Object} options - Опции (пагинация, сортировка)
     * @returns {Promise<{data: Array, pagination: Object}>}
     */
    static async getActivePlatforms(options = {}) {
        return this.getAllPlatforms(
            {
                status: 'active',
                moderation_status: 'approved',
                ...options.filters
            },
            options.sort || 'published_at:desc',
            options.pagination
        );
    }

    /** Выполняет полнотекстовый поиск по площадкам
     * @param {string} query - Поисковый запрос
     * @param {Object} filters - Дополнительные фильтры
     * @returns {Promise<Array>} Результаты поиска
     */
    static async searchPlatforms(query, filters = {}) {
        const { limit = 20, offset = 0 } = filters;

        let whereConditions = ['p.deleted_at IS NULL'];
        const params = [query];

        if (filters.status) {
            whereConditions.push('p.status = ?');
            params.push(filters.status);
        }

        if (filters.type) {
            whereConditions.push('p.type = ?');
            params.push(filters.type);
        }

        const whereClause = whereConditions.join(' AND ');

        const results = await this.db.all(`
      SELECT 
        p.*,
        snippet(adPlatforms_fts, 0, '<mark>', '</mark>', '...', 32) as name_snippet,
        snippet(adPlatforms_fts, 1, '<mark>', '</mark>', '...', 64) as description_snippet,
        snippet(adPlatforms_fts, 2, '<mark>', '</mark>', '...', 32) as keywords_snippet
      FROM ${this.tableName} p
      JOIN adPlatforms_fts ON p.id = adPlatforms_fts.rowid
      WHERE adPlatforms_fts MATCH ?
        AND ${whereClause}
      ORDER BY rank
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

        // Парсим JSON поля
        results.forEach(platform => {
            ['pricing', 'audience_demographics', 'categories', 'ad_formats_supported'].forEach(field => {
                if (platform[field]) {
                    platform[field] = this.parseJSON(platform[field]);
                }
            });
        });

        return results;
    }

    /** Полнотекстовый поиск по площадкам
    * @param {string} query - Поисковый запрос
    * @param {Object} options - Опции поиска 
    */
    static async searchFullText(query, options = {}) {
        const { limit = 20, offset = 0 } = options;
        javascript

        const results = await this.db.all(`
          SELECT 
            p.*,
            u.username as owner_username,
            snippet(adPlatforms_fts, 1, '<mark>', '</mark>', '...', 32) as description_snippet
          FROM adPlatforms p
          JOIN adPlatforms_fts ON p.id = adPlatforms_fts.rowid
          LEFT JOIN users u ON p.user_id = u.id
          WHERE adPlatforms_fts MATCH ?
            AND p.deleted_at IS NULL
            AND p.status = 'active'
          ORDER BY rank
          LIMIT ? OFFSET ?
        `, [query, limit, offset]);

        // Парсим JSON поля
        results.forEach(platform => {
            platform.audience_demographics = this.parseJSON(platform.audience_demographics);
            platform.pricing = this.parseJSON(platform.pricing);
            platform.metrics = this.parseJSON(platform.metrics);
            platform.categories = this.parseJSON(platform.categories);
        });

        return results;
    }

    /** Получает площадки по тегам (будет реализовано после создания системы тегов)
     * @param {Array<number>} tagIds - ID тегов
     * @returns {Promise<Array>} Площадки с указанными тегами
     */
    static async getPlatformsByTags(tagIds) {
        // Заглушка для будущей реализации
        // Потребует создание таблиц tags и platform_tags
        return [];
    }

    /** Получает площадки по категории
     * @param {string} category - Категория
     * @returns {Promise<Array>} Площадки в категории
     */
    static async getPlatformsByCategory(category) {
        const platforms = await this.db.all(`
      SELECT * FROM ${this.tableName}
      WHERE (primary_category = ? OR categories LIKE ?)
        AND deleted_at IS NULL
        AND status = 'active'
      ORDER BY quality_score DESC, rating DESC
    `, [category, `%"${category}"%`]);

        platforms.forEach(platform => {
            ['pricing', 'audience_demographics', 'categories'].forEach(field => {
                if (platform[field]) {
                    platform[field] = this.parseJSON(platform[field]);
                }
            });
        });

        return platforms;
    }

    /** Получает площадки по подтипу
     * @param {string} subtype - Подтип площадки
     * @returns {Promise<Array>} Массив площадок
     */
    static async getPlatformsBySubtype(subtype) {
        return await this.db.all(`
    SELECT * FROM ${this.tableName}
    WHERE subtype = ? AND deleted_at IS NULL
    ORDER BY quality_score DESC
  `, [subtype]);
    }

    /** Получает площадки с возможностью торга
     * @returns {Promise<Array>} Массив площадок
     */
    static async getNegotiablePlatforms() {
        return await this.db.all(`
    SELECT * FROM ${this.tableName}
    WHERE price_negotiable = TRUE 
      AND status = 'active' 
      AND deleted_at IS NULL
    ORDER BY audience_size DESC
  `);
    }

    /** Получает похожие площадки по различным критериям
     * @param {number} platformId - ID площадки
     * @param {number} [limit=5] - Количество результатов
     * @returns {Promise<Array>} Массив похожих площадок
     */
    static async getSimilarPlatforms(platformId, limit = 5) {
        const platform = await this.getPlatformById(platformId);
        if (!platform) {
            throw new Error('Platform not found');
        }

        // Создаем веса для различных критериев схожести
        const similar = await this.db.all(`
      SELECT 
        p.*,
        (
          -- Схожесть по типу (30%)
          CASE WHEN p.type = ? THEN 30 ELSE 0 END +
          
          -- Схожесть по размеру аудитории (25%)
          CASE 
            WHEN p.audience_size_range = ? THEN 25
            WHEN ABS(p.audience_size - ?) < ? THEN 15
            ELSE 0
          END +
          
          -- Схожесть по модели ценообразования (20%)
          CASE WHEN p.pricing_model = ? THEN 20 ELSE 0 END +
          
          -- Схожесть по категории (15%)
          CASE 
            WHEN p.primary_category = ? THEN 15
            WHEN p.categories LIKE ? THEN 10
            ELSE 0
          END +
          
          -- Схожесть по языку (10%)
          CASE WHEN p.language = ? THEN 10 ELSE 0 END
        ) as similarity_score
      FROM ${this.tableName} p
      WHERE p.id != ?
        AND p.status = 'active'
        AND p.deleted_at IS NULL
      ORDER BY similarity_score DESC, p.quality_score DESC
      LIMIT ?
    `, [
            platform.type,
            platform.audience_size_range,
            platform.audience_size,
            platform.audience_size * 0.5, // 50% отклонение
            platform.pricing_model,
            platform.primary_category,
            `%"${platform.primary_category}"%`,
            platform.language,
            platformId,
            limit
        ]);

        // Парсим JSON поля
        similar.forEach(p => {
            ['audience_demographics', 'pricing', 'categories', 'ad_formats_supported'].forEach(field => {
                if (p[field]) {
                    p[field] = this.parseJSON(p[field]);
                }
            });
        });

        return similar;
    }

    /** Получает топ площадки по различным критериям
     * @param {string} criteria - Критерий (rating, quality, trust, revenue, audience)
     * @param {number} limit - Количество результатов
     * @returns {Promise<Array>} Топ площадки
     */
    static async getTopPlatforms(criteria = 'rating', limit = 10) {
        const sortMap = {
            'rating': 'rating DESC',
            'quality': 'quality_score DESC',
            'trust': 'trust_score DESC',
            'revenue': 'total_revenue_generated DESC',
            'audience': 'audience_size DESC',
            'campaigns': 'total_campaigns_completed DESC'
        };

        const sortBy = sortMap[criteria] || 'rating DESC';

        const platforms = await this.db.all(`
      SELECT * FROM ${this.tableName}
      WHERE status = 'active'
        AND moderation_status = 'approved'
        AND deleted_at IS NULL
      ORDER BY ${sortBy}
      LIMIT ?
    `, [limit]);

        platforms.forEach(platform => {
            ['pricing', 'audience_demographics', 'categories'].forEach(field => {
                if (platform[field]) {
                    platform[field] = this.parseJSON(platform[field]);
                }
            });
        });

        return platforms;
    }

    /** Получает площадки для модерации
     * @param {Object} options - Опции фильтрации
     * @returns {Promise<{data: Array, pagination: Object}>}
     */
    static async getPendingModeration(options = {}) {
        return this.findAll({
            ...options,
            moderation_status: 'pending',
            sort: 'created_at:asc' // Старые первыми
        });
    }

    /** Получает площадки, готовые к публикации
     * @returns {Promise<Array>} Площадки в статусе pending_review
     */
    static async getPlatformsReadyForReview() {
        return await this.db.all(`
      SELECT * FROM ${this.tableName}
      WHERE status = 'pending_review'
        AND moderation_status = 'pending'
        AND deleted_at IS NULL
      ORDER BY updated_at ASC
    `);
    }

    /** Получает площадки с истекающей верификацией
     * @param {number} daysBeforeExpiry - За сколько дней до истечения
     * @returns {Promise<Array>} Площадки с истекающей верификацией
     */
    static async getExpiringVerifications(daysBeforeExpiry = 30) {
        const platforms = await this.db.all(`
      SELECT * FROM ${this.tableName}
      WHERE verification_status = 'verified'
        AND json_extract(verification_data, '$.expires_at') IS NOT NULL
        AND datetime(json_extract(verification_data, '$.expires_at')) 
            BETWEEN datetime('now') AND datetime('now', '+${daysBeforeExpiry} days')
        AND deleted_at IS NULL
      ORDER BY json_extract(verification_data, '$.expires_at') ASC
    `);

        platforms.forEach(platform => {
            platform.verification_data = this.parseJSON(platform.verification_data);
        });

        return platforms;
    }

    /** Получает площадки с истекающим премиум статусом
     * @param {number} daysBeforeExpiry - За сколько дней до истечения
     * @returns {Promise<Array>} Площадки с истекающим премиум
     */
    static async getExpiringPremium(daysBeforeExpiry = 7) {
        return await this.db.all(`
      SELECT * FROM ${this.tableName}
      WHERE is_premium = TRUE
        AND premium_until BETWEEN datetime('now') AND datetime('now', '+${daysBeforeExpiry} days')
        AND deleted_at IS NULL
      ORDER BY premium_until ASC
    `);
    }

    /* === СТАТУСЫ И МОДЕРАЦИЯ ===
     * updatePlatformStatus(id, newStatus, userId) - изменяет статус (проверяет права) -> обновленная площадка
     * updateModerationStatus(id, status, moderatorId, notes) - обновляет модерацию -> обновленная площадка
     * moderate(id, decision, moderatorId, notes) - модерирует площадку -> обновленная площадка
     */

    /** Изменяет статус площадки
     * @param {number} id - ID площадки
     * @param {string} newStatus - Новый статус
     * @param {number} userId - ID пользователя
     * @returns {Promise<Object>} Обновленная площадка
     */
    static async updatePlatformStatus(id, newStatus, userId) {
        const platform = await this.getPlatformById(id);
        if (!platform) {
            throw new Error('Platform not found');
        }

        // Проверка прав
        const user = await this.db.get('SELECT is_Admin FROM users WHERE id = ?', [userId]);
        if (platform.user_id !== userId && !user?.is_Admin) {
            throw new Error('Unauthorized to change platform status');
        }

        // Валидация статуса
        const validStatuses = ['draft', 'pending_review', 'active', 'paused', 'suspended', 'rejected', 'archived'];
        if (!validStatuses.includes(newStatus)) {
            throw new Error(`Invalid status: ${newStatus}`);
        }

        await this.db.run(
            `UPDATE ${this.tableName} SET status = ? WHERE id = ?`,
            [newStatus, id]
        );

        return this.getPlatformById(id);
    }

    /** Обновляет статус модерации с дополнительными данными
     * @param {number} id - ID площадки
     * @param {string} status - Новый статус модерации
     * @param {number} moderatorId - ID модератора
     * @param {string} notes - Заметки модератора
     * @returns {Promise<Object>} Обновленная площадка
     */
    static async updateModerationStatus(id, status, moderatorId, notes = null) {
        const validStatuses = ['pending', 'approved', 'rejected', 'requires_changes'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid moderation status: ${status}`);
        }

        // Определяем новый статус площадки на основе решения модерации
        let platformStatus = null;
        if (status === 'approved') {
            platformStatus = 'active';
        } else if (status === 'rejected') {
            platformStatus = 'rejected';
        }

        const updates = ['moderation_status = ?', 'moderated_by = ?', 'moderated_at = CURRENT_TIMESTAMP'];
        const values = [status, moderatorId];

        if (notes) {
            updates.push('moderation_notes = ?');
            values.push(notes);
        }

        if (platformStatus) {
            updates.push('status = ?');
            values.push(platformStatus);
        }

        values.push(id);
        await this.db.run(
            `UPDATE ${this.tableName} 
       SET ${updates.join(', ')}
       WHERE id = ? AND deleted_at IS NULL`,
            values
        );

        return this.getPlatformById(id);
    }

    /** Обновляет полную модерацию площадки
     * @param {number} id - ID площадки
     * @param {string} status - Статус модерации
     * @param {number} moderatorId - ID модератора
     * @param {string} [notes] - Заметки модератора
     * @returns {Promise<Object>} Обновленная площадка
     */
    static async moderate(id, decision, moderatorId, notes = null) {
        return this.updateModerationStatus(id, decision, moderatorId, notes);
    }

    /* === ВЕРИФИКАЦИЯ ===
     * updateVerificationStatus(id, status, data) - обновляет статус верификации v2 -> обновленная площадка
     * incrementVerificationAttempts(id) - увеличивает счетчик попыток -> новое количество
     * expireVerifications() - истекает верификации -> количество обновленных
     * setVerificationMethod(platformId, method) - устанавливает метод верификации -> void
     */

    /** Обновляет статус верификации с дополнительными данными
     * @param {number} id - ID площадки
     * @param {string} status - Новый статус верификации
     * @param {Object} [data] - Дополнительные данные верификации
     * @returns {Promise<Object>} Обновленная площадка
     */
    static async updateVerificationStatus(id, status, data = null) {
        const validStatuses = ['unverified', 'pending', 'verified', 'failed', 'expired'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid verification status: ${status}`);
        }

        const updates = ['verification_status = ?'];
        const values = [status];

        if (data) {
            const currentPlatform = await this.getPlatformById(id);
            const currentData = this.parseJSON(currentPlatform?.verification_data) || {};
            const updatedData = { ...currentData, ...data };

            if (status === 'verified') {
                updatedData.verified_at = new Date().toISOString();
                // Устанавливаем срок истечения через 1 год
                updatedData.expires_at = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
            } else if (status === 'failed') {
                updatedData.failed_at = new Date().toISOString();
            }

            updates.push('verification_data = ?');
            values.push(JSON.stringify(updatedData));
        }

        values.push(id);
        await this.db.run(
            `UPDATE ${this.tableName} 
       SET ${updates.join(', ')}
       WHERE id = ? AND deleted_at IS NULL`,
            values
        );

        return this.getPlatformById(id);
    }

    /** Увеличивает счетчик попыток верификации
     * @param {number} id - ID площадки
     * @returns {Promise<number>} Новое количество попыток
     */
    static async incrementVerificationAttempts(id) {
        await this.db.run(
            `UPDATE ${this.tableName} 
       SET verification_attempts = verification_attempts + 1
       WHERE id = ?`,
            [id]
        );

        const platform = await this.db.get(
            `SELECT verification_attempts FROM ${this.tableName} WHERE id = ?`,
            [id]
        );

        return platform?.verification_attempts || 0;
    }

    /** Помечает истекшие верификации
     * @returns {Promise<number>} Количество обновленных записей
     */
    static async expireVerifications() {
        const result = await this.db.run(`
      UPDATE ${this.tableName}
      SET verification_status = 'expired'
      WHERE verification_status = 'verified'
        AND json_extract(verification_data, '$.expires_at') IS NOT NULL
        AND datetime(json_extract(verification_data, '$.expires_at')) < datetime('now')
        AND deleted_at IS NULL
    `);

        return result.changes;
    }

    /** Устанавливает метод верификации
     * @param {number} platformId - ID площадки
     * @param {string} method - Метод верификации
     */
    static async setVerificationMethod(platformId, method) {
        const validMethods = ['meta_tag', 'dns_record', 'file_upload', 'oauth', 'manual'];
        if (!validMethods.includes(method)) {
            throw new Error(`Invalid verification method: ${method}`);
        }

        await this.db.run(
            `UPDATE ${this.tableName} SET verification_method = ? WHERE id = ?`,
            [method, platformId]
        );
    }

    /* === МЕТРИКИ И КАЧЕСТВО ===
     * updateQualityMetrics(id, rating, qualityScore) - обновляет метрики качества -> void
     * calculateQualityScore(platform) - вычисляет quality_score -> число (0-10)
     * updateQualityScore(id) - пересчитывает и сохраняет quality_score -> новый score
     * updateTrustScore(id) - пересчитывает и сохраняет trust_score -> новый score
     * updateRating(id, newRating, reviewsCount) - обновляет рейтинг -> void
     * updateEngagementLevel(platformId) - обновляет уровень вовлеченности -> новый уровень
     * updatePlatformMetrics(id, metrics) - обновляет метрики v1 -> void
     * updatePerformanceMetrics(platformId, metrics) - обновляет метрики v2 -> void
     * addPerformanceHistory(platformId, performanceData) - добавляет в историю -> void
     */

    /** Обновляет метрики качества площадки
     * @param {number} id - ID площадки
     * @param {number} rating - Новый рейтинг (0-5)
     * @param {number} qualityScore - Новый показатель качества (0-10)
     * @returns {Promise<void>}
     */
    static async updateQualityMetrics(id, rating = null, qualityScore = null) {
        const updates = [];
        const values = [];

        if (rating !== null) {
            if (rating < 0 || rating > 5) {
                throw new Error('Rating must be between 0 and 5');
            }
            updates.push('rating = ?');
            values.push(rating);
        }
        if (qualityScore !== null) {
            if (qualityScore < 0 || qualityScore > 10) {
                throw new Error('Quality score must be between 0 and 10');
            }
            updates.push('quality_score = ?');
            values.push(qualityScore);
        }

        if (updates.length === 0) return;

        values.push(id);
        await this.db.run(
            `UPDATE ${this.tableName} SET ${updates.join(', ')} WHERE id = ?`,
            values
        );
    }

    /** Рассчитывает качественный показатель площадки (статический метод)
     * @param {Object} platform - Объект площадки
     * @returns {number} Качественный показатель (0-10)
     */
    static calculateQualityScore(platform) {
        let score = 0;

        // Верификация (3 балла)
        if (platform.verification_status === 'verified') score += 3;
        else if (platform.verification_status === 'pending') score += 1;

        // Размер аудитории (2 балла)
        if (platform.audience_size >= 100000) score += 2;
        else if (platform.audience_size >= 10000) score += 1.5;
        else if (platform.audience_size >= 1000) score += 1;
        else if (platform.audience_size > 0) score += 0.5;

        // Заполненность профиля (2 балла)
        if (platform.description && platform.description.length > 100) score += 0.5;
        if (platform.audience_demographics && Object.keys(platform.audience_demographics).length > 0) score += 0.5;
        if (platform.ad_formats_supported && platform.ad_formats_supported.length > 0) score += 0.5;
        if (platform.categories && platform.categories.length > 0) score += 0.5;

        // Рейтинг (2 балла)
        if (platform.rating > 0) {
            score += (platform.rating / 5) * 2;
        }

        // История производительности (1 балл)
        if (platform.total_campaigns_completed > 10) score += 1;
        else if (platform.total_campaigns_completed > 5) score += 0.5;

        return Math.min(10, Math.round(score * 10) / 10);
    }

    /** Пересчитывает quality_score на основе различных факторов
     * @param {number} id - ID площадки
     * @returns {Promise<number>} Новый quality_score
     */
    static async updateQualityScore(id) {
        const platform = await this.getPlatformById(id);
        if (!platform) throw new Error('Platform not found');

        let score = 0;

        // Верификация (3 балла)
        if (platform.verification_status === 'verified') score += 3;
        else if (platform.verification_status === 'pending') score += 1;

        // Размер аудитории (2 балла)
        if (platform.audience_size >= 100000) score += 2;
        else if (platform.audience_size >= 10000) score += 1.5;
        else if (platform.audience_size >= 1000) score += 1;
        else if (platform.audience_size > 0) score += 0.5;

        // Заполненность профиля (2 балла)
        if (platform.description && platform.description.length > 100) score += 0.5;
        if (platform.audience_demographics && Object.keys(platform.audience_demographics).length > 0) score += 0.5;
        if (platform.ad_formats_supported && platform.ad_formats_supported.length > 0) score += 0.5;
        if (platform.categories && platform.categories.length > 0) score += 0.5;

        // Рейтинг (2 балла)
        if (platform.rating > 0) {
            score += (platform.rating / 5) * 2;
        }

        // История производительности (1 балл)
        if (platform.total_campaigns_completed > 10) score += 1;
        else if (platform.total_campaigns_completed > 5) score += 0.5;

        const finalScore = Math.min(10, Math.round(score * 10) / 10);

        await this.db.run(
            `UPDATE ${this.tableName} SET quality_score = ? WHERE id = ?`,
            [finalScore, id]
        );

        return finalScore;
    }

    /** Пересчитывает trust_score на основе верификации, истории и отзывов
     * @param {number} id - ID площадки
     * @returns {Promise<number>} Новый trust_score
     */
    static async updateTrustScore(id) {
        const platform = await this.getPlatformById(id);
        if (!platform) throw new Error('Platform not found');

        let score = 0;

        // Верификация (4 балла)
        if (platform.verification_status === 'verified') score += 4;
        if (platform.owner_verified) score += 1;
        if (platform.audience_verified) score += 1;

        // История (2 балла)
        const accountAge = (Date.now() - new Date(platform.created_at).getTime()) / (1000 * 60 * 60 * 24);
        if (accountAge > 365) score += 2;
        else if (accountAge > 180) score += 1.5;
        else if (accountAge > 90) score += 1;
        else if (accountAge > 30) score += 0.5;

        // Активность (2 балла)
        if (platform.total_campaigns_completed > 50) score += 2;
        else if (platform.total_campaigns_completed > 20) score += 1.5;
        else if (platform.total_campaigns_completed > 10) score += 1;
        else if (platform.total_campaigns_completed > 5) score += 0.5;

        // Отзывы (2 балла)
        if (platform.total_reviews > 10 && platform.rating >= 4.5) score += 2;
        else if (platform.total_reviews > 5 && platform.rating >= 4.0) score += 1.5;
        else if (platform.total_reviews > 3 && platform.rating >= 3.5) score += 1;
        else if (platform.total_reviews > 0 && platform.rating >= 3.0) score += 0.5;

        const finalScore = Math.min(10, Math.round(score * 10) / 10);

        await this.db.run(
            `UPDATE ${this.tableName} SET trust_score = ? WHERE id = ?`,
            [finalScore, id]
        );

        return finalScore;
    }

    /** Обновляет рейтинг площадки
     * @param {number} id - ID площадки
     * @param {number} newRating - Новый средний рейтинг
     * @param {number} reviewsCount - Новое количество отзывов
     * @returns {Promise<void>}
     */
    static async updateRating(id, newRating, reviewsCount) {
        if (newRating < 0 || newRating > 5) {
            throw new Error('Rating must be between 0 and 5');
        }

        await this.db.run(
            `UPDATE ${this.tableName} 
       SET rating = ?, total_reviews = ?
       WHERE id = ?`,
            [newRating, reviewsCount, id]
        );
    }

    /** Обновляет уровень вовлеченности на основе метрик
     * @param {number} platformId - ID площадки
     * @returns {Promise<string>} Новый уровень вовлеченности
     */
    static async updateEngagementLevel(platformId) {
        const platform = await this.getPlatformById(platformId);
        if (!platform) throw new Error('Platform not found');

        const metrics = this.parseJSON(platform.metrics) || {};
        let level = 'medium';

        // Простая логика определения уровня вовлеченности
        const avgEngagement = metrics.avg_engagement || 0;
        if (avgEngagement >= 5) level = 'high';
        else if (avgEngagement < 2) level = 'low';

        await this.db.run(
            `UPDATE ${this.tableName} 
       SET engagement_level = ?
       WHERE id = ?`,
            [level, platformId]
        );

        return level;
    }

    /** Обновляет метрики площадки
     * @param {number} id - ID площадки
     * @param {Object} metrics - Новые метрики
     * @returns {Promise<void>}
     */
    static async updatePlatformMetrics(id, metrics) {
        await this.db.run(
            `UPDATE ${this.tableName} 
       SET metrics = ?
       WHERE id = ?`,
            [JSON.stringify(metrics), id]
        );
    }

    /** Обновляет метрики производительности
     * @param {number} platformId - ID площадки
     * @param {Object} metrics - Новые метрики
     */
    static async updatePerformanceMetrics(platformId, metrics) {
        await this.db.run(
            `UPDATE ${this.tableName} 
       SET metrics = ?
       WHERE id = ?`,
            [JSON.stringify(metrics), platformId]
        );
    }

    /** Добавляет запись в историю производительности
     * @param {number} platformId - ID площадки
     * @param {Object} performanceData - Данные производительности
     */
    static async addPerformanceHistory(platformId, performanceData) {
        const platform = await this.getPlatformById(platformId);
        if (!platform) throw new Error('Platform not found');

        const history = this.parseJSON(platform.historical_performance) || [];
        history.push({
            date: new Date().toISOString(),
            ...performanceData
        });

        // Ограничиваем историю последними 12 месяцами
        if (history.length > 12) {
            history.shift();
        }

        await this.db.run(
            `UPDATE ${this.tableName} 
       SET historical_performance = ?
       WHERE id = ?`,
            [JSON.stringify(history), platformId]
        );
    }

    /* === АУДИТОРИЯ И ВЛАДЕЛЕЦ ===
     * updateOwnerInfo(platformId, ownerData) - обновляет данные владельца -> void
     * updateAudienceDetails(platformId, audienceData) - обновляет данные аудитории -> void
     * touchAudienceLastUpdated(platformId) - обновляет время последнего обновления аудитории -> void
     */

    /** Обновляет информацию о владельце (денормализация)
      * @param {number} platformId - ID площадки
      * @param {Object} ownerData - Данные владельца
      */
    static async updateOwnerInfo(platformId, ownerData) {
        const { username, verified } = ownerData;
        await this.db.run(
            `UPDATE ${this.tableName} 
          SET owner_username = ?, owner_verified = ?
          WHERE id = ?`,
            [username, verified, platformId]
        );
    }

    /** Обновляет детальную информацию об аудитории
     * @param {number} platformId - ID площадки
     * @param {Object} audienceData - Данные аудитории
     */
    static async updateAudienceDetails(platformId, audienceData) {
        const {
            daily_active,
            interests,
            verified,
            demographics
        } = audienceData;

        const updates = [];
        const values = [];

        if (daily_active !== undefined) {
            updates.push('audience_daily_active = ?');
            values.push(daily_active);
        }

        if (interests) {
            updates.push('audience_interests = ?');
            values.push(JSON.stringify(interests));
        }

        if (verified !== undefined) {
            updates.push('audience_verified = ?');
            values.push(verified);
        }

        if (demographics) {
            updates.push('audience_demographics = ?');
            values.push(JSON.stringify(demographics));
        }

        updates.push('audience_last_updated = CURRENT_TIMESTAMP');

        values.push(platformId);
        await this.db.run(
            `UPDATE ${this.tableName} 
       SET ${updates.join(', ')}
       WHERE id = ?`,
            values
        );
    }

    /** Обновляет время последнего обновления аудитории
     * @param {number} platformId - ID площадки
     */
    static async touchAudienceLastUpdated(platformId) {
        await this.db.run(
            `UPDATE ${this.tableName} 
     SET audience_last_updated = CURRENT_TIMESTAMP 
     WHERE id = ?`,
            [platformId]
        );
    }

    /* === БРОНИРОВАНИЕ И КАМПАНИИ ===
     * addBooking(platformId, campaignId, startDate, endDate, options) - добавляет бронирование -> возвращает созданное бронирование
     * removeBooking(platformId, campaignId) - удаляет бронирование -> void
     * updateBookingStatus(platformId, campaignPlatformId, newStatus) - обновляет статус бронирования -> void
     * getBookingDetails(platformId, campaignId) - получает детали бронирования -> объект или null
     * cancelBooking(platformId, campaignPlatformId, reason) - отменяет бронирование -> void
     * activatePendingBookings() - активирует готовые бронирования -> количество активированных
     * completeExpiredBookings() - завершает истекшие бронирования -> количество завершенных
     * checkAvailability(platformId, startDate, endDate) - проверяет доступность -> boolean
     * getBookedDates(platformId) - получает забронированные даты -> массив бронирований
     * checkScheduleAvailability(schedule, startDate, endDate) - проверяет по расписанию -> boolean
     * calculateBookingPrice(platform, startDate, endDate, pricingModel, adFormat) - рассчитывает стоимость -> объект с ценой
     * updateCampaignCounts(id, delta) - обновляет счетчики кампаний -> void
     * completeCampaign(platformId, revenue) - завершает кампанию -> void
     */

    /** Добавляет бронирование кампании на площадку
     * @param {number} platformId - ID площадки
     * @param {number} campaignId - ID кампании
     * @param {string} startDate - Дата начала (YYYY-MM-DD)
     * @param {string} endDate - Дата окончания (YYYY-MM-DD)
     * @param {Object} [options] - Дополнительные параметры бронирования
     * @param {number} options.agreed_price - Согласованная цена
     * @param {string} options.pricing_model - Модель ценообразования
     * @param {Object} options.pricing_details - Детали ценообразования
     * @param {string} options.ad_format - Формат рекламы
     * @param {number} options.created_by - ID пользователя, создающего бронирование
     * @returns {Promise<Object>} Созданное бронирование
     */
    static async addBooking(platformId, campaignId, startDate, endDate, options = {}) {
        // Получаем площадку
        const platform = await this.getPlatformById(platformId);
        if (!platform) {
            throw new Error('Platform not found');
        }

        // Проверяем статус площадки
        if (platform.status !== 'active') {
            throw new Error('Platform is not active');
        }

        // Получаем информацию о кампании
        const campaign = await this.db.get(
            'SELECT id, user_id, title, status FROM campaigns WHERE id = ?',
            [campaignId]
        );

        if (!campaign) {
            throw new Error('Campaign not found');
        }

        if (campaign.status !== 'active' && campaign.status !== 'pending') {
            throw new Error('Campaign is not active');
        }

        // Валидация дат
        const start = new Date(startDate);
        const end = new Date(endDate);
        const now = new Date();

        if (start > end) {
            throw new Error('Start date must be before end date');
        }

        // Проверяем advance_booking_days
        const minBookingDate = new Date();
        minBookingDate.setDate(minBookingDate.getDate() + platform.advance_booking_days);

        if (start < minBookingDate) {
            throw new Error(`Booking must be made at least ${platform.advance_booking_days} days in advance`);
        }

        // Проверяем доступность дат в календаре площадки
        const isAvailable = await this.checkAvailability(platformId, startDate, endDate);
        if (!isAvailable) {
            throw new Error('Platform is not available for selected dates');
        }

        // Проверяем расписание доступности (availability_schedule)
        const schedule = this.parseJSON(platform.availability_schedule) || {};
        if (Object.keys(schedule).length > 0) {
            const isWithinSchedule = this.checkScheduleAvailability(schedule, start, end);
            if (!isWithinSchedule) {
                throw new Error('Selected dates are outside platform availability schedule');
            }
        }

        // Рассчитываем стоимость, если не указана
        let agreedPrice = options.agreed_price;
        let pricingModel = options.pricing_model || platform.pricing_model;
        let pricingDetails = options.pricing_details || {};

        if (!agreedPrice) {
            const calculatedPrice = this.calculateBookingPrice(
                platform,
                start,
                end,
                pricingModel,
                options.ad_format
            );
            agreedPrice = calculatedPrice.total;
            pricingDetails = calculatedPrice.details;
        }

        // Проверяем минимальный бюджет
        if (agreedPrice < platform.minimum_budget) {
            throw new Error(`Booking price must be at least ${platform.minimum_budget} ${platform.currency}`);
        }

        // Начинаем транзакцию
        try {
            // 1. Создаем запись в campaign_platforms
            const bookingResult = await this.db.run(`
      INSERT INTO campaign_platforms (
        campaign_id,
        platform_id,
        status,
        start_date,
        end_date,
        agreed_price,
        pricing_model,
        pricing_details,
        currency,
        ad_format,
        created_by,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
                campaignId,
                platformId,
                'pending',
                startDate,
                endDate,
                agreedPrice,
                pricingModel,
                JSON.stringify(pricingDetails),
                platform.currency,
                options.ad_format || null,
                options.created_by || campaign.user_id
            ]);

            // 2. Обновляем календарь бронирований в площадке
            const calendar = this.parseJSON(platform.booking_calendar) || [];
            calendar.push({
                campaign_id: campaignId,
                campaign_platform_id: bookingResult.lastID,
                start_date: startDate,
                end_date: endDate,
                status: 'pending',
                created_at: new Date().toISOString()
            });

            // Сортируем календарь по датам
            calendar.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

            // 3. Обновляем площадку
            await this.db.run(`
      UPDATE ${this.tableName} 
      SET 
        booking_calendar = ?,
        total_campaigns_count = total_campaigns_count + 1,
        last_campaign_date = CURRENT_TIMESTAMP,
        last_active_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [JSON.stringify(calendar), platformId]);

            // 4. Получаем созданное бронирование с полной информацией
            const booking = await this.db.get(`
      SELECT 
        cp.*,
        c.title as campaign_title,
        c.user_id as advertiser_id,
        p.name as platform_name,
        p.user_id as platform_owner_id,
        u1.username as advertiser_username,
        u2.username as platform_owner_username
      FROM campaign_platforms cp
      JOIN campaigns c ON cp.campaign_id = c.id
      JOIN adPlatforms p ON cp.platform_id = p.id
      JOIN users u1 ON c.user_id = u1.id
      JOIN users u2 ON p.user_id = u2.id
      WHERE cp.id = ?
    `, [bookingResult.lastID]);

            // Парсим JSON поля
            booking.pricing_details = this.parseJSON(booking.pricing_details);

            // 5. Логируем событие (если есть система логирования)
            console.log(`Booking created: Campaign ${campaignId} on Platform ${platformId} for ${startDate} to ${endDate}`);

            return booking;

        } catch (error) {
            // В случае ошибки откатываем изменения
            console.error('Error creating booking:', error);
            throw error;
        }
    }

    /** Удаляет бронирование из календаря
     * @param {number} platformId - ID площадки
     * @param {number} campaignId - ID кампании
     * @returns {Promise<void>}
     */
    static async removeBooking(platformId, campaignId) {
        const platform = await this.getPlatformById(platformId);
        if (!platform) throw new Error('Platform not found');

        const calendar = this.parseJSON(platform.booking_calendar) || [];
        const updatedCalendar = calendar.filter(booking => booking.campaign_id !== campaignId);

        await this.db.run(
            `UPDATE ${this.tableName} 
       SET booking_calendar = ?,
           active_campaigns_count = MAX(0, active_campaigns_count - 1)
       WHERE id = ?`,
            [JSON.stringify(updatedCalendar), platformId]
        );
    }

    /** Обновляет статус бронирования в календаре
     * @param {number} platformId - ID площадки
     * @param {number} campaignPlatformId - ID записи в campaign_platforms
     * @param {string} newStatus - Новый статус
     * @returns {Promise<void>}
     */
    static async updateBookingStatus(platformId, campaignPlatformId, newStatus) {
        const platform = await this.getPlatformById(platformId);
        if (!platform) throw new Error('Platform not found');

        const calendar = this.parseJSON(platform.booking_calendar) || [];
        const bookingIndex = calendar.findIndex(b => b.campaign_platform_id === campaignPlatformId);

        if (bookingIndex === -1) {
            throw new Error('Booking not found in calendar');
        }

        calendar[bookingIndex].status = newStatus;
        calendar[bookingIndex].updated_at = new Date().toISOString();

        // Если бронирование активировано, увеличиваем счетчик активных кампаний
        let activeCountDelta = 0;
        if (newStatus === 'active' && calendar[bookingIndex].status !== 'active') {
            activeCountDelta = 1;
        } else if (newStatus !== 'active' && calendar[bookingIndex].status === 'active') {
            activeCountDelta = -1;
        }

        await this.db.run(`
    UPDATE ${this.tableName} 
    SET 
      booking_calendar = ?,
      active_campaigns_count = active_campaigns_count + ?
    WHERE id = ?
  `, [JSON.stringify(calendar), activeCountDelta, platformId]);
    }

    /** Получает детальную информацию о бронировании
     * @param {number} platformId - ID площадки
     * @param {number} campaignId - ID кампании
     * @returns {Promise<Object|null>} Информация о бронировании
     */
    static async getBookingDetails(platformId, campaignId) {
        const booking = await this.db.get(`
    SELECT 
      cp.*,
      c.title as campaign_title,
      c.budget as campaign_budget,
      c.status as campaign_status,
      p.name as platform_name,
      p.type as platform_type,
      p.audience_size as platform_audience,
      u1.username as advertiser_username,
      u2.username as platform_owner_username
    FROM campaign_platforms cp
    JOIN campaigns c ON cp.campaign_id = c.id
    JOIN adPlatforms p ON cp.platform_id = p.id
    JOIN users u1 ON c.user_id = u1.id
    JOIN users u2 ON p.user_id = u2.id
    WHERE cp.platform_id = ? AND cp.campaign_id = ?
  `, [platformId, campaignId]);

        if (booking) {
            booking.pricing_details = this.parseJSON(booking.pricing_details);
            booking.ad_content = this.parseJSON(booking.ad_content);
            booking.targeting_settings = this.parseJSON(booking.targeting_settings);
        }

        return booking;
    }

    /** Отменяет бронирование
     * @param {number} platformId - ID площадки
     * @param {number} campaignPlatformId - ID записи в campaign_platforms
     * @param {string} reason - Причина отмены
     * @returns {Promise<void>}
     */
    static async cancelBooking(platformId, campaignPlatformId, reason) {
        const platform = await this.getPlatformById(platformId);
        if (!platform) throw new Error('Platform not found');

        // Обновляем статус в campaign_platforms
        await this.db.run(`
    UPDATE campaign_platforms
    SET 
      status = 'cancelled',
      rejection_reason = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND platform_id = ?
  `, [reason, campaignPlatformId, platformId]);

        // Обновляем календарь
        await this.updateBookingStatus(platformId, campaignPlatformId, 'cancelled');
    }

    /** Проверяет и активирует бронирования, которые должны начаться
     * @returns {Promise<number>} Количество активированных бронирований
     */
    static async activatePendingBookings() {
        const today = new Date().toISOString().split('T')[0];

        const pendingBookings = await this.db.all(`
    SELECT cp.*, p.booking_calendar
    FROM campaign_platforms cp
    JOIN adPlatforms p ON cp.platform_id = p.id
    WHERE cp.status = 'approved'
      AND cp.start_date <= ?
      AND cp.end_date >= ?
      AND cp.payment_status IN ('paid', 'partial')
  `, [today, today]);

        let activated = 0;

        for (const booking of pendingBookings) {
            try {
                // Обновляем статус в campaign_platforms
                await this.db.run(`
        UPDATE campaign_platforms
        SET 
          status = 'active',
          actual_start_date = CASE 
            WHEN actual_start_date IS NULL THEN ? 
            ELSE actual_start_date 
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [today, booking.id]);

                // Обновляем календарь площадки
                await this.updateBookingStatus(booking.platform_id, booking.id, 'active');

                activated++;
            } catch (error) {
                console.error(`Error activating booking ${booking.id}:`, error);
            }
        }

        return activated;
    }

    /** Завершает истекшие бронирования
     * @returns {Promise<number>} Количество завершенных бронирований
     */
    static async completeExpiredBookings() {
        const today = new Date().toISOString().split('T')[0];

        const expiredBookings = await this.db.all(`
    SELECT cp.*
    FROM campaign_platforms cp
    WHERE cp.status = 'active'
      AND cp.end_date < ?
  `, [today]);

        let completed = 0;

        for (const booking of expiredBookings) {
            try {
                // Обновляем статус в campaign_platforms
                await this.db.run(`
        UPDATE campaign_platforms
        SET 
          status = 'completed',
          actual_end_date = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [booking.end_date, booking.id]);

                // Обновляем календарь и счетчики площадки
                const platform = await this.getPlatformById(booking.platform_id);
                const calendar = this.parseJSON(platform.booking_calendar) || [];
                const bookingIndex = calendar.findIndex(b => b.campaign_platform_id === booking.id);

                if (bookingIndex !== -1) {
                    calendar[bookingIndex].status = 'completed';
                    calendar[bookingIndex].updated_at = new Date().toISOString();
                }

                await this.db.run(`
        UPDATE ${this.tableName}
        SET 
          booking_calendar = ?,
          active_campaigns_count = MAX(0, active_campaigns_count - 1),
          total_campaigns_completed = total_campaigns_completed + 1,
          total_revenue_generated = total_revenue_generated + ?
        WHERE id = ?
      `, [JSON.stringify(calendar), booking.agreed_price, booking.platform_id]);

                completed++;
            } catch (error) {
                console.error(`Error completing booking ${booking.id}:`, error);
            }
        }

        return completed;
    }

    /** Проверяет доступность площадки на указанные даты
     * @param {number} platformId - ID площадки
     * @param {string} startDate - Начальная дата
     * @param {string} endDate - Конечная дата
     * @returns {Promise<boolean>} Доступна ли площадка
     */
    static async checkAvailability(platformId, startDate, endDate) {
        const platform = await this.getPlatformById(platformId);
        if (!platform) throw new Error('Platform not found');

        const calendar = this.parseJSON(platform.booking_calendar) || [];
        const newStart = new Date(startDate);
        const newEnd = new Date(endDate);

        const hasConflict = calendar.some(booking => {
            const bookingStart = new Date(booking.start_date);
            const bookingEnd = new Date(booking.end_date);
            return (newStart <= bookingEnd && newEnd >= bookingStart);
        });

        return !hasConflict;
    }

    /** Получает забронированные даты площадки
     * @param {number} platformId - ID площадки
     * @returns {Promise<Array>} Массив бронирований
     */
    static async getBookedDates(platformId) {
        const platform = await this.getPlatformById(platformId);
        if (!platform) throw new Error('Platform not found');

        return this.parseJSON(platform.booking_calendar) || [];
    }

    /** Проверяет доступность по расписанию площадки
     * @private
     * @param {Object} schedule - Расписание площадки
     * @param {Date} startDate - Начальная дата
     * @param {Date} endDate - Конечная дата
     * @returns {boolean} Доступна ли площадка в указанные даты
     */
    static checkScheduleAvailability(schedule, startDate, endDate) {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

        // Проверяем каждый день в диапазоне дат
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const dayName = days[currentDate.getDay()];
            const daySchedule = schedule[dayName];

            // Если для этого дня недели нет расписания или нет слотов - недоступно
            if (!daySchedule || !daySchedule.slots || daySchedule.slots.length === 0) {
                return false;
            }

            // Переходим к следующему дню
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return true;
    }

    /** Рассчитывает стоимость бронирования
     * @private
     * @param {Object} platform - Данные площадки
     * @param {Date} startDate - Начальная дата
     * @param {Date} endDate - Конечная дата
     * @param {string} pricingModel - Модель ценообразования
     * @param {string} [adFormat] - Формат рекламы
     * @returns {Object} Объект с общей стоимостью и деталями расчета
     */
    static calculateBookingPrice(platform, startDate, endDate, pricingModel, adFormat) {
        const pricing = this.parseJSON(platform.pricing) || {};
        const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

        let total = 0;
        const details = {
            base_price: 0,
            days: days,
            pricing_model: pricingModel,
            calculations: {}
        };

        switch (pricingModel) {
            case 'flat_rate':
                // Рассчитываем на основе периода
                if (days >= 30 && pricing.flat_monthly) {
                    const months = Math.floor(days / 30);
                    const remainingDays = days % 30;
                    details.calculations.months = months;
                    details.calculations.monthly_rate = pricing.flat_monthly;
                    details.calculations.remaining_days = remainingDays;
                    details.calculations.daily_rate = pricing.flat_daily || (pricing.flat_monthly / 30);

                    total = (months * pricing.flat_monthly) + (remainingDays * details.calculations.daily_rate);
                } else if (days >= 7 && pricing.flat_weekly) {
                    const weeks = Math.floor(days / 7);
                    const remainingDays = days % 7;
                    details.calculations.weeks = weeks;
                    details.calculations.weekly_rate = pricing.flat_weekly;
                    details.calculations.remaining_days = remainingDays;
                    details.calculations.daily_rate = pricing.flat_daily || (pricing.flat_weekly / 7);

                    total = (weeks * pricing.flat_weekly) + (remainingDays * details.calculations.daily_rate);
                } else {
                    details.calculations.daily_rate = pricing.flat_daily || 0;
                    total = days * details.calculations.daily_rate;
                }
                break;

            case 'cpm':
                // Для CPM модели указываем только ставку, фактическая стоимость будет рассчитана по факту
                details.calculations.cpm_rate = pricing.cpm || 0;
                details.calculations.estimated_impressions = platform.audience_daily_active * days;
                total = (details.calculations.estimated_impressions / 1000) * details.calculations.cpm_rate;
                details.is_estimate = true;
                break;

            case 'cpc':
                // Для CPC модели указываем только ставку
                details.calculations.cpc_rate = pricing.cpc || 0;
                const avgCtr = (platform.metrics && platform.metrics.avg_ctr) || 0.02; // 2% по умолчанию
                details.calculations.estimated_clicks = platform.audience_daily_active * days * avgCtr;
                total = details.calculations.estimated_clicks * details.calculations.cpc_rate;
                details.is_estimate = true;
                break;

            case 'cpa':
                // Для CPA модели указываем только ставку
                details.calculations.cpa_rate = pricing.cpa || 0;
                const avgConversion = (platform.metrics && platform.metrics.avg_conversion) || 0.01; // 1% по умолчанию
                details.calculations.estimated_conversions = platform.audience_daily_active * days * avgConversion;
                total = details.calculations.estimated_conversions * details.calculations.cpa_rate;
                details.is_estimate = true;
                break;

            case 'hybrid':
                // Гибридная модель - комбинация фиксированной ставки и результатов
                const basePrice = pricing.flat_daily ? days * pricing.flat_daily : 0;
                const performancePrice = pricing.cpm ?
                    ((platform.audience_daily_active * days / 1000) * pricing.cpm) : 0;

                details.calculations.base_price = basePrice;
                details.calculations.performance_price = performancePrice;
                total = basePrice + performancePrice;
                details.is_estimate = true;
                break;
        }

        // Применяем модификаторы цены для разных форматов рекламы
        if (adFormat && platform.ad_specifications) {
            const specs = this.parseJSON(platform.ad_specifications);
            if (specs[adFormat] && specs[adFormat].price_modifier) {
                details.calculations.format_modifier = specs[adFormat].price_modifier;
                total *= specs[adFormat].price_modifier;
            }
        }

        // Округляем до 2 знаков после запятой
        total = Math.round(total * 100) / 100;
        details.base_price = total;

        return {
            total,
            details,
            currency: platform.currency
        };
    }
    
    /** Обновляет счетчики кампаний
     * @param {number} id - ID площадки
     * @param {number} delta - Изменение активных кампаний (+1 или -1)
     * @returns {Promise<void>}
     */
    static async updateCampaignCounts(id, delta) {
        await this.db.run(
            `UPDATE ${this.tableName} 
       SET active_campaigns_count = MAX(0, active_campaigns_count + ?)
       WHERE id = ?`,
            [delta, id]
        );
    }

    /** Увеличивает счетчик завершенных кампаний и обновляет доход
     * @param {number} platformId - ID площадки
     * @param {number} revenue - Доход от кампании
     * @returns {Promise<void>}
     */
    static async completeCampaign(platformId, revenue) {
        await this.db.run(
            `UPDATE ${this.tableName} 
       SET total_campaigns_completed = total_campaigns_completed + 1,
           total_revenue_generated = total_revenue_generated + ?,
           last_campaign_date = CURRENT_TIMESTAMP
       WHERE id = ?`,
            [revenue, platformId]
        );
    }

    /* === ИНТЕГРАЦИИ И НАСТРОЙКИ ===
     * updateIntegrationSettings(platformId, integrationType, settings) - настройки интеграции -> void
     * connectAnalytics(platformId, service, connectionData) - подключает аналитику -> void
     * updateSettings(platformId, settings) - обновляет настройки -> void
     * updateCustomFields(platformId, customFields) - обновляет кастомные поля -> void
     */

    /** Обновляет настройки интеграции
     * @param {number} platformId - ID площадки
     * @param {string} integrationType - Тип интеграции
     * @param {Object} settings - Настройки
     */
    static async updateIntegrationSettings(platformId, integrationType, settings) {
        await this.db.run(
            `UPDATE ${this.tableName} 
       SET integration_type = ?,
           integration_settings = ?
       WHERE id = ?`,
            [integrationType, JSON.stringify(settings), platformId]
        );
    }

    /** Подключает внешнюю аналитику
     * @param {number} platformId - ID площадки
     * @param {string} service - Название сервиса (google_analytics, facebook_pixel и т.д.)
     * @param {Object} connectionData - Данные подключения
     */
    static async connectAnalytics(platformId, service, connectionData) {
        const platform = await this.getPlatformById(platformId);
        if (!platform) throw new Error('Platform not found');

        const analytics = this.parseJSON(platform.analytics_connected) || {};
        analytics[service] = {
            connected: true,
            connected_at: new Date().toISOString(),
            ...connectionData
        };

        await this.db.run(
            `UPDATE ${this.tableName} 
       SET analytics_connected = ?
       WHERE id = ?`,
            [JSON.stringify(analytics), platformId]
        );
    }

    /** Обновляет настройки площадки
     * @param {number} platformId - ID площадки
     * @param {Object} settings - Настройки
     * @returns {Promise<void>}
     */
    static async updateSettings(platformId, settings) {
        const platform = await this.getPlatformById(platformId);
        if (!platform) throw new Error('Platform not found');

        const currentSettings = this.parseJSON(platform.settings) || {};
        const updatedSettings = { ...currentSettings, ...settings };

        await this.db.run(
            `UPDATE ${this.tableName} 
       SET settings = ?
       WHERE id = ?`,
            [JSON.stringify(updatedSettings), platformId]
        );
    }
    
    /** Добавляет кастомные поля
     * @param {number} platformId - ID площадки
     * @param {Object} customFields - Дополнительные поля
     * @returns {Promise<void>}
     */
    static async updateCustomFields(platformId, customFields) {
        const platform = await this.getPlatformById(platformId);
        if (!platform) throw new Error('Platform not found');

        const currentFields = this.parseJSON(platform.custom_fields) || {};
        const updatedFields = { ...currentFields, ...customFields };

        await this.db.run(
            `UPDATE ${this.tableName} 
       SET custom_fields = ?
       WHERE id = ?`,
            [JSON.stringify(updatedFields), platformId]
        );
    }

    /* === ПРЕМИУМ И ЭКСКЛЮЗИВ ===
     * setPremiumStatus(platformId, until) - устанавливает премиум -> void
     * cancelPremiumStatus(platformId) - отменяет премиум -> void
     * setExclusiveStatus(platformId, isExclusive) - устанавливает эксклюзивность -> void
     * expirePremiumStatuses() - истекает премиум статусы -> количество обновленных
     */

    /** Устанавливает премиум статус
     * @param {number} platformId - ID площадки
     * @param {Date} until - До какой даты действует премиум
     */
    static async setPremiumStatus(platformId, until) {
        await this.db.run(
            `UPDATE ${this.tableName} 
       SET is_premium = TRUE,
           premium_until = ?
       WHERE id = ?`,
            [until.toISOString(), platformId]
        );
    }

    /** Отменяет премиум статус
     * @param {number} platformId - ID площадки
     * @returns {Promise<void>}
     */
    static async cancelPremiumStatus(platformId) {
        await this.db.run(
            `UPDATE ${this.tableName} 
       SET is_premium = FALSE, premium_until = NULL
       WHERE id = ?`,
            [platformId]
        );
    }

    /** Устанавливает эксклюзивность площадки
     * @param {number} platformId - ID площадки
     * @param {boolean} isExclusive - Флаг эксклюзивности
     * @returns {Promise<void>}
     */
    static async setExclusiveStatus(platformId, isExclusive) {
        await this.db.run(
            `UPDATE ${this.tableName} 
       SET is_exclusive = ?
       WHERE id = ?`,
            [isExclusive, platformId]
        );
    }

    /** Удаляет премиум статус у истекших подписок
     * @returns {Promise<number>} Количество обновленных записей
     */
    static async expirePremiumStatuses() {
        const result = await this.db.run(`
      UPDATE ${this.tableName}
      SET is_premium = FALSE
      WHERE is_premium = TRUE
        AND premium_until < datetime('now')
        AND deleted_at IS NULL
    `);

        return result.changes;
    }

    /* === КАТЕГОРИИ И ПОИСК ===
     * updateSearchData(platformId, searchData) - обновляет данные для поиска -> void
     * bulkUpdateCategories(platforms) - массово обновляет категории -> количество обновленных
     */

    /** Обновляет категории и теги для поиска
     * @param {number} platformId - ID площадки
     * @param {Object} searchData - Данные для поиска
     */
    static async updateSearchData(platformId, searchData) {
        const {
            primary_category,
            categories,
            keywords,
            tags_count
        } = searchData;

        const updates = [];
        const values = [];

        if (primary_category) {
            updates.push('primary_category = ?');
            values.push(primary_category);
        }

        if (categories) {
            updates.push('categories = ?');
            values.push(JSON.stringify(categories));
        }

        if (keywords) {
            updates.push('keywords = ?');
            values.push(keywords);
        }

        if (tags_count !== undefined) {
            updates.push('tags_count = ?');
            values.push(tags_count);
        }

        values.push(platformId);
        await this.db.run(
            `UPDATE ${this.tableName} 
       SET ${updates.join(', ')}
       WHERE id = ?`,
            values
        );
    }

    /** Массово обновляет категории площадок
     * @param {Array<{id: number, categories: Array}>} platforms - Массив с ID и категориями
     * @returns {Promise<number>} Количество обновленных площадок
     */
    static async bulkUpdateCategories(platforms) {
        let updated = 0;

        for (const { id, categories, primary_category } of platforms) {
            const updates = [];
            const values = [];

            if (categories) {
                updates.push('categories = ?');
                values.push(JSON.stringify(categories));
            }

            if (primary_category) {
                updates.push('primary_category = ?');
                values.push(primary_category);
            }

            if (updates.length > 0) {
                values.push(id);
                const result = await this.db.run(
                    `UPDATE ${this.tableName} 
           SET ${updates.join(', ')}
           WHERE id = ? AND deleted_at IS NULL`,
                    values
                );
                updated += result.changes;
            }
        }

        return updated;
    }

    /* === КОНТАКТЫ И ПЛАТЕЖИ ===
     * updateContactInfo(platformId, contactInfo) - обновляет контакты -> void
     * updatePaymentDetails(platformId, paymentDetails) - обновляет платежные данные -> void
     * updateNotes(platformId, notes) - обновляет заметки -> void
     */

    /** Обновляет контактную информацию
     * @param {number} platformId - ID площадки
     * @param {Object} contactInfo - Контактные данные
     * @returns {Promise<void>}
     */
    static async updateContactInfo(platformId, contactInfo) {
        await this.db.run(
            `UPDATE ${this.tableName} 
       SET contact_info = ?
       WHERE id = ?`,
            [JSON.stringify(contactInfo), platformId]
        );
    }

    /** Обновляет платежные данные (зашифрованные)
     * @param {number} platformId - ID площадки
     * @param {Object} paymentDetails - Платежные реквизиты
     * @returns {Promise<void>}
     */
    static async updatePaymentDetails(platformId, paymentDetails) {
        // В реальном приложении здесь должно быть шифрование
        await this.db.run(
            `UPDATE ${this.tableName} 
       SET payment_details = ?
       WHERE id = ?`,
            [JSON.stringify(paymentDetails), platformId]
        );
    }

    /** Обновляет заметки владельца
     * @param {number} platformId - ID площадки
     * @param {string} notes - Заметки
     * @returns {Promise<void>}
     */
    static async updateNotes(platformId, notes) {
        await this.db.run(
            `UPDATE ${this.tableName} 
       SET notes = ?
       WHERE id = ?`,
            [notes, platformId]
        );
    }

    /* === ФОРМАТЫ РЕКЛАМЫ ===
     * updateAdFormats(platformId, formats, specifications, restrictions) - обновляет форматы -> void
     * updateAvailabilitySchedule(platformId, schedule, advanceBookingDays) - расписание -> void
     * updateLanguages(platformId, primaryLanguage, supportedLanguages) - языки -> void
     */

    /** Обновляет форматы рекламы и спецификации
     * @param {number} platformId - ID площадки
     * @param {Array<string>} formats - Поддерживаемые форматы
     * @param {Object} specifications - Спецификации форматов
     * @param {Array<string>} restrictions - Ограничения контента
     * @returns {Promise<void>}
     */
    static async updateAdFormats(platformId, formats, specifications, restrictions) {
        await this.db.run(
            `UPDATE ${this.tableName} 
       SET ad_formats_supported = ?,
           ad_specifications = ?,
           content_restrictions = ?
       WHERE id = ?`,
            [
                JSON.stringify(formats),
                JSON.stringify(specifications),
                JSON.stringify(restrictions),
                platformId
            ]
        );
    }

    /** Обновляет расписание доступности
     * @param {number} platformId - ID площадки
     * @param {Object} schedule - Расписание по дням недели
     * @param {number} advanceBookingDays - Дни для предварительного бронирования
     * @returns {Promise<void>}
     */
    static async updateAvailabilitySchedule(platformId, schedule, advanceBookingDays) {
        await this.db.run(
            `UPDATE ${this.tableName} 
       SET availability_schedule = ?,
           advance_booking_days = ?
       WHERE id = ?`,
            [JSON.stringify(schedule), advanceBookingDays, platformId]
        );
    }

    /** Обновляет язык и поддерживаемые языки
     * @param {number} platformId - ID площадки
     * @param {string} primaryLanguage - Основной язык
     * @param {Array<string>} supportedLanguages - Поддерживаемые языки
     * @returns {Promise<void>}
     */
    static async updateLanguages(platformId, primaryLanguage, supportedLanguages) {
        await this.db.run(
            `UPDATE ${this.tableName} 
       SET language = ?, languages_supported = ?
       WHERE id = ?`,
            [primaryLanguage, JSON.stringify(supportedLanguages), platformId]
        );
    }

    /* === СИНХРОНИЗАЦИЯ ===
     * updateLastActiveAt(id) - обновляет последнюю активность -> void
     * updateSyncStatus(id, status, error) - обновляет статус синхронизации -> void
     */

    /** Обновляет время последней активности
     * @param {number} id - ID площадки
     * @returns {Promise<void>}
     */
    static async updateLastActiveAt(id) {
        await this.db.run(
            `UPDATE ${this.tableName} 
       SET last_active_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
            [id]
        );
    }

    /** Обновляет статус синхронизации
     * @param {number} id - ID площадки
     * @param {string} status - Статус синхронизации ('pending', 'success', 'failed')
     * @param {string} [error] - Сообщение об ошибке
     * @returns {Promise<void>}
     */
    static async updateSyncStatus(id, status, error = null) {
        const validStatuses = ['pending', 'success', 'failed'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid sync status: ${status}`);
        }

        const updates = ['sync_status = ?', 'last_sync_attempt = CURRENT_TIMESTAMP'];
        const values = [status];

        if (error) {
            updates.push('last_error = ?');
            values.push(error);
        }

        values.push(id);
        await this.db.run(
            `UPDATE ${this.tableName} 
       SET ${updates.join(', ')}
       WHERE id = ?`,
            values
        );
    }

    /* === СТАТИСТИКА И АНАЛИТИКА ===
     * getUserPlatformsStats(userId) - статистика площадок пользователя v2 (расширенная) -> объект статистики
     * calculatePriceRanges() - рассчитывает диапазоны цен -> объект с диапазонами
     * calculateAudienceSizeRanges() - рассчитывает диапазоны аудитории -> объект с диапазонами
     * getPlatformAnalytics(platformId, days) - аналитика площадки за период -> объект аналитики
     * generatePlatformReport(platformId, startDate, endDate) - генерирует отчет -> объект отчета
     * updateAllPlatformsStats() - обновляет статистику всех площадок -> {updated, errors, total}
     * getGlobalStats() - глобальная статистика (только админ) -> объект статистики
     * recalculatePriceRange(platformId) - пересчитывает ценовой диапазон -> новый диапазон
     * calculateAverageCTR(data) - вычисляет средний CTR -> число
     */

    /** Получает расширенную статистику по площадкам пользователя
     * @param {number} userId - ID пользователя
     * @returns {Promise<Object>} Объект со статистикой
     */
    static async getUserPlatformsStats(userId) {
        const stats = await this.db.get(`
      SELECT 
        COUNT(*) as total_platforms,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_platforms,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_platforms,
        COUNT(CASE WHEN status = 'paused' THEN 1 END) as paused_platforms,
        COUNT(CASE WHEN verification_status = 'verified' THEN 1 END) as verified_platforms,
        COUNT(CASE WHEN is_premium = 1 AND premium_until > datetime('now') THEN 1 END) as premium_platforms,
        AVG(rating) as average_rating,
        AVG(quality_score) as average_quality_score,
        AVG(trust_score) as average_trust_score,
        SUM(audience_size) as total_audience,
        SUM(total_campaigns_completed) as total_campaigns,
        SUM(total_revenue_generated) as total_revenue,
        SUM(active_campaigns_count) as active_campaigns
      FROM ${this.tableName}
      WHERE user_id = ? AND deleted_at IS NULL
    `, [userId]);

        // Получаем распределение по типам
        const typeDistribution = await this.db.all(`
      SELECT type, COUNT(*) as count
      FROM ${this.tableName}
      WHERE user_id = ? AND deleted_at IS NULL
      GROUP BY type
    `, [userId]);

        // Получаем топ категории
        const topCategories = await this.db.all(`
      SELECT primary_category, COUNT(*) as count
      FROM ${this.tableName}
      WHERE user_id = ? AND primary_category IS NOT NULL AND deleted_at IS NULL
      GROUP BY primary_category
      ORDER BY count DESC
      LIMIT 5
    `, [userId]);

        return {
            summary: {
                totalPlatforms: stats.total_platforms || 0,
                activePlatforms: stats.active_platforms || 0,
                draftPlatforms: stats.draft_platforms || 0,
                pausedPlatforms: stats.paused_platforms || 0,
                verifiedPlatforms: stats.verified_platforms || 0,
                premiumPlatforms: stats.premium_platforms || 0
            },
            metrics: {
                averageRating: parseFloat(stats.average_rating || 0).toFixed(2),
                averageQualityScore: parseFloat(stats.average_quality_score || 0).toFixed(2),
                averageTrustScore: parseFloat(stats.average_trust_score || 0).toFixed(2),
                totalAudience: stats.total_audience || 0,
                totalCampaigns: stats.total_campaigns || 0,
                activeCampaigns: stats.active_campaigns || 0,
                totalRevenue: parseFloat(stats.total_revenue || 0).toFixed(2)
            },
            distribution: {
                byType: typeDistribution.reduce((acc, item) => {
                    acc[item.type] = item.count;
                    return acc;
                }, {}),
                topCategories: topCategories
            }
        };
    }

    /** Рассчитывает диапазоны цен для фильтров
     * @returns {Promise<Object>} Объект с диапазонами цен
     */
    static async calculatePriceRanges() {
        const platforms = await this.db.all(`
      SELECT pricing, pricing_model 
      FROM ${this.tableName} 
      WHERE status = 'active' AND deleted_at IS NULL
    `);

        const prices = {
            cpm: [],
            cpc: [],
            cpa: [],
            flat_daily: [],
            flat_weekly: [],
            flat_monthly: []
        };

        platforms.forEach(platform => {
            const pricing = this.parseJSON(platform.pricing) || {};
            Object.keys(prices).forEach(key => {
                if (pricing[key]) {
                    prices[key].push(parseFloat(pricing[key]));
                }
            });
        });

        const ranges = {};
        Object.keys(prices).forEach(key => {
            if (prices[key].length > 0) {
                prices[key].sort((a, b) => a - b);
                ranges[key] = {
                    min: prices[key][0],
                    max: prices[key][prices[key].length - 1],
                    median: prices[key][Math.floor(prices[key].length / 2)],
                    quartiles: {
                        low: prices[key][Math.floor(prices[key].length * 0.25)],
                        medium: prices[key][Math.floor(prices[key].length * 0.5)],
                        high: prices[key][Math.floor(prices[key].length * 0.75)]
                    }
                };
            }
        });

        return ranges;
    }

    /** Рассчитывает диапазоны размеров аудитории
     * @returns {Promise<Object>} Объект с диапазонами аудитории
     */
    static async calculateAudienceSizeRanges() {
        const result = await this.db.get(`
      SELECT 
        COUNT(CASE WHEN audience_size < 1000 THEN 1 END) as micro_count,
        COUNT(CASE WHEN audience_size >= 1000 AND audience_size < 10000 THEN 1 END) as small_count,
        COUNT(CASE WHEN audience_size >= 10000 AND audience_size < 100000 THEN 1 END) as medium_count,
        COUNT(CASE WHEN audience_size >= 100000 THEN 1 END) as large_count,
        MIN(audience_size) as min_size,
        MAX(audience_size) as max_size,
        AVG(audience_size) as avg_size
      FROM ${this.tableName}
      WHERE status = 'active' AND deleted_at IS NULL
    `);

        return {
            distribution: {
                micro: result.micro_count || 0,
                small: result.small_count || 0,
                medium: result.medium_count || 0,
                large: result.large_count || 0
            },
            stats: {
                min: result.min_size || 0,
                max: result.max_size || 0,
                average: Math.round(result.avg_size || 0)
            }
        };
    }

    /** Получает аналитику по площадке за период
     * @param {number} platformId - ID площадки
     * @param {number} days - Количество дней
     * @returns {Promise<Object>} Аналитика
     */
    static async getPlatformAnalytics(platformId, days = 30) {
        const platform = await this.getPlatformById(platformId);
        if (!platform) throw new Error('Platform not found');

        const historicalData = this.parseJSON(platform.historical_performance) || [];
        const recentData = historicalData.filter(item => {
            const itemDate = new Date(item.date);
            const daysAgo = new Date();
            daysAgo.setDate(daysAgo.getDate() - days);
            return itemDate >= daysAgo;
        });

        // Подсчет средних показателей
        const analytics = {
            period_days: days,
            total_impressions: 0,
            total_clicks: 0,
            total_conversions: 0,
            average_ctr: 0,
            average_conversion_rate: 0,
            performance_trend: 'stable' // 'growing', 'declining', 'stable'
        };

        if (recentData.length > 0) {
            recentData.forEach(data => {
                analytics.total_impressions += data.impressions || 0;
                analytics.total_clicks += data.clicks || 0;
                analytics.total_conversions += data.conversions || 0;
            });

            if (analytics.total_impressions > 0) {
                analytics.average_ctr = (analytics.total_clicks / analytics.total_impressions * 100).toFixed(2);
            }

            if (analytics.total_clicks > 0) {
                analytics.average_conversion_rate = (analytics.total_conversions / analytics.total_clicks * 100).toFixed(2);
            }

            // Определяем тренд
            if (recentData.length >= 2) {
                const firstHalf = recentData.slice(0, Math.floor(recentData.length / 2));
                const secondHalf = recentData.slice(Math.floor(recentData.length / 2));

                const firstHalfCTR = this.calculateAverageCTR(firstHalf);
                const secondHalfCTR = this.calculateAverageCTR(secondHalf);

                if (secondHalfCTR > firstHalfCTR * 1.1) {
                    analytics.performance_trend = 'growing';
                } else if (secondHalfCTR < firstHalfCTR * 0.9) {
                    analytics.performance_trend = 'declining';
                }
            }
        }

        return analytics;
    }

    /** Генерирует отчет по площадке
     * @param {number} platformId - ID площадки
     * @param {string} startDate - Начальная дата
     * @param {string} endDate - Конечная дата
     * @returns {Promise<Object>} Отчет
     */
    static async generatePlatformReport(platformId, startDate, endDate) {
        const platform = await this.getPlatformById(platformId);
        if (!platform) throw new Error('Platform not found');

        // Получаем бронирования за период
        const bookings = (this.parseJSON(platform.booking_calendar) || [])
            .filter(booking => {
                const bookingStart = new Date(booking.start_date);
                return bookingStart >= new Date(startDate) && bookingStart <= new Date(endDate);
            });

        // Получаем историческую производительность за период
        const historicalData = (this.parseJSON(platform.historical_performance) || [])
            .filter(data => {
                const dataDate = new Date(data.date);
                return dataDate >= new Date(startDate) && dataDate <= new Date(endDate);
            });

        return {
            platform: {
                id: platform.id,
                name: platform.name,
                type: platform.type,
                status: platform.status
            },
            period: {
                start: startDate,
                end: endDate
            },
            bookings: {
                total: bookings.length,
                list: bookings
            },
            performance: {
                historical: historicalData,
                metrics: this.parseJSON(platform.metrics) || {}
            },
            revenue: {
                total: platform.total_revenue_generated,
                period: bookings.reduce((sum, booking) => sum + (booking.revenue || 0), 0)
            }
        };
    }

    /** Обновляет статистику всех площадок (для cron job)
     * @returns {Promise<Object>} Результат обновления
     */
    static async updateAllPlatformsStats() {
        let updated = 0;
        let errors = 0;

        const platforms = await this.db.all(`
      SELECT id FROM ${this.tableName}
      WHERE status = 'active' AND deleted_at IS NULL
    `);

        for (const platform of platforms) {
            try {
                await this.updateQualityScore(platform.id);
                await this.updateTrustScore(platform.id);
                await this.updateEngagementLevel(platform.id);
                updated++;
            } catch (error) {
                console.error(`Error updating stats for platform ${platform.id}:`, error);
                errors++;
            }
        }

        return { updated, errors, total: platforms.length };
    }

    /** Получает глобальную статистику по всем площадкам (только для админов)
     * @returns {Promise<Object>} Объект со статистикой
     */
    static async getGlobalStats() {
        // Основная статистика
        const generalStats = await this.db.get(`
    SELECT 
      COUNT(*) as total_platforms,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active_platforms,
      COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_platforms,
      COUNT(CASE WHEN status = 'pending_review' THEN 1 END) as pending_review,
      COUNT(CASE WHEN status = 'paused' THEN 1 END) as paused_platforms,
      COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended_platforms,
      COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_platforms,
      COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived_platforms,
      COUNT(CASE WHEN verification_status = 'verified' THEN 1 END) as verified_platforms,
      COUNT(CASE WHEN is_premium = 1 AND premium_until > datetime('now') THEN 1 END) as premium_platforms,
      COUNT(CASE WHEN is_exclusive = 1 THEN 1 END) as exclusive_platforms,
      AVG(rating) as average_rating,
      AVG(quality_score) as average_quality_score,
      AVG(trust_score) as average_trust_score,
      SUM(audience_size) as total_audience_reach,
      SUM(total_campaigns_completed) as total_campaigns_completed,
      SUM(total_revenue_generated) as total_revenue_generated,
      SUM(active_campaigns_count) as total_active_campaigns
    FROM ${this.tableName}
    WHERE deleted_at IS NULL
  `);

        // Распределение по типам
        const typeDistribution = await this.db.all(`
    SELECT type, COUNT(*) as count
    FROM ${this.tableName}
    WHERE deleted_at IS NULL
    GROUP BY type
    ORDER BY count DESC
  `);

        // Распределение по моделям ценообразования
        const pricingModelDistribution = await this.db.all(`
    SELECT pricing_model, COUNT(*) as count
    FROM ${this.tableName}
    WHERE deleted_at IS NULL
    GROUP BY pricing_model
    ORDER BY count DESC
  `);

        // Распределение по диапазонам цен
        const priceRangeDistribution = await this.db.all(`
    SELECT price_range, COUNT(*) as count
    FROM ${this.tableName}
    WHERE deleted_at IS NULL
    GROUP BY price_range
    ORDER BY CASE price_range
      WHEN 'low' THEN 1
      WHEN 'medium' THEN 2
      WHEN 'high' THEN 3
      WHEN 'premium' THEN 4
    END
  `);

        // Распределение по размерам аудитории
        const audienceRangeDistribution = await this.db.all(`
    SELECT audience_size_range, COUNT(*) as count
    FROM ${this.tableName}
    WHERE deleted_at IS NULL
    GROUP BY audience_size_range
    ORDER BY CASE audience_size_range
      WHEN 'micro' THEN 1
      WHEN 'small' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'large' THEN 4
    END
  `);

        // Топ категории
        const topCategories = await this.db.all(`
    SELECT primary_category, COUNT(*) as count
    FROM ${this.tableName}
    WHERE primary_category IS NOT NULL AND deleted_at IS NULL
    GROUP BY primary_category
    ORDER BY count DESC
    LIMIT 10
  `);

        // Статистика по языкам
        const languageDistribution = await this.db.all(`
    SELECT language, COUNT(*) as count
    FROM ${this.tableName}
    WHERE deleted_at IS NULL
    GROUP BY language
    ORDER BY count DESC
    LIMIT 10
  `);

        // Статистика по модерации
        const moderationStats = await this.db.get(`
    SELECT 
      COUNT(CASE WHEN moderation_status = 'pending' THEN 1 END) as pending_moderation,
      COUNT(CASE WHEN moderation_status = 'approved' THEN 1 END) as approved,
      COUNT(CASE WHEN moderation_status = 'rejected' THEN 1 END) as rejected,
      COUNT(CASE WHEN moderation_status = 'requires_changes' THEN 1 END) as requires_changes
    FROM ${this.tableName}
    WHERE deleted_at IS NULL
  `);

        // Тренды (последние 30 дней)
        const trends = await this.db.get(`
    SELECT 
      COUNT(CASE WHEN created_at >= datetime('now', '-30 days') THEN 1 END) as new_platforms_30d,
      COUNT(CASE WHEN created_at >= datetime('now', '-7 days') THEN 1 END) as new_platforms_7d,
      COUNT(CASE WHEN created_at >= datetime('now', '-1 days') THEN 1 END) as new_platforms_24h,
      COUNT(CASE WHEN last_active_at >= datetime('now', '-7 days') THEN 1 END) as active_in_last_7d,
      COUNT(CASE WHEN last_active_at >= datetime('now', '-30 days') THEN 1 END) as active_in_last_30d
    FROM ${this.tableName}
    WHERE deleted_at IS NULL
  `);

        return {
            general: {
                total: generalStats.total_platforms || 0,
                active: generalStats.active_platforms || 0,
                draft: generalStats.draft_platforms || 0,
                pending_review: generalStats.pending_review || 0,
                paused: generalStats.paused_platforms || 0,
                suspended: generalStats.suspended_platforms || 0,
                rejected: generalStats.rejected_platforms || 0,
                archived: generalStats.archived_platforms || 0,
                verified: generalStats.verified_platforms || 0,
                premium: generalStats.premium_platforms || 0,
                exclusive: generalStats.exclusive_platforms || 0
            },
            metrics: {
                average_rating: parseFloat(generalStats.average_rating || 0).toFixed(2),
                average_quality_score: parseFloat(generalStats.average_quality_score || 0).toFixed(2),
                average_trust_score: parseFloat(generalStats.average_trust_score || 0).toFixed(2),
                total_audience_reach: generalStats.total_audience_reach || 0,
                total_campaigns_completed: generalStats.total_campaigns_completed || 0,
                total_revenue_generated: parseFloat(generalStats.total_revenue_generated || 0).toFixed(2),
                total_active_campaigns: generalStats.total_active_campaigns || 0
            },
            distributions: {
                by_type: typeDistribution.reduce((acc, item) => {
                    acc[item.type] = item.count;
                    return acc;
                }, {}),
                by_pricing_model: pricingModelDistribution.reduce((acc, item) => {
                    acc[item.pricing_model] = item.count;
                    return acc;
                }, {}),
                by_price_range: priceRangeDistribution.reduce((acc, item) => {
                    acc[item.price_range] = item.count;
                    return acc;
                }, {}),
                by_audience_range: audienceRangeDistribution.reduce((acc, item) => {
                    acc[item.audience_size_range] = item.count;
                    return acc;
                }, {}),
                by_language: languageDistribution.reduce((acc, item) => {
                    acc[item.language] = item.count;
                    return acc;
                }, {})
            },
            moderation: moderationStats,
            top_categories: topCategories,
            trends: trends
        };
    }

    /** Проверяет и обновляет диапазон цен на основе текущих цен
     * @param {number} platformId - ID площадки
     * @returns {Promise<string>} Новый price_range
     */
    static async recalculatePriceRange(platformId) {
        const platform = await this.getPlatformById(platformId);
        if (!platform) throw new Error('Platform not found');

        const pricing = this.parseJSON(platform.pricing) || {};
        let range = 'medium';

        // Определяем диапазон на основе цен
        const cpm = pricing.cpm || 0;
        const flatDaily = pricing.flat_daily || 0;

        if (cpm > 0) {
            if (cpm < 5) range = 'low';
            else if (cpm > 50) range = 'premium';
            else if (cpm > 20) range = 'high';
        } else if (flatDaily > 0) {
            if (flatDaily < 50) range = 'low';
            else if (flatDaily > 500) range = 'premium';
            else if (flatDaily > 200) range = 'high';
        }

        await this.db.run(
            `UPDATE ${this.tableName} SET price_range = ? WHERE id = ?`,
            [range, platformId]
        );

        return range;
    }

    /** Вспомогательный метод для расчета среднего CTR
     * @private
     * @param {Array} data - Массив данных производительности
     * @returns {number} Средний CTR
     */
    static calculateAverageCTR(data) {
        const totalImpressions = data.reduce((sum, item) => sum + (item.impressions || 0), 0);
        const totalClicks = data.reduce((sum, item) => sum + (item.clicks || 0), 0);
        return totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    }

    /* === УТИЛИТЫ ===
     * checkUrlAvailability(url) - проверяет доступность URL -> boolean
     * parseJSON(jsonString) - парсит JSON строку -> объект или null
     * validatePlatformData(platformData) - валидирует данные -> {valid: boolean, errors: Array}
     * isValidUrl(url) - проверяет валидность URL -> boolean
     * checkAccess(platformId, userId, action) - проверяет права доступа -> boolean
     */

    /** Проверяет доступность URL площадки
     * @param {string} url - URL для проверки
     * @returns {Promise<boolean>} Доступен ли URL
     */
    static async checkUrlAvailability(url) {
        const existing = await this.db.get(
            `SELECT id FROM ${this.tableName} WHERE url = ? AND status != 'archived'`,
            [url]
        );
        return !existing;
    }

    /** Парсит JSON строку в объект
     * @private
     * @param {string} jsonString - JSON строка
     * @returns {Object|Array|null} Распарсенный объект
     */
    static parseJSON(jsonString) {
        try {
            return jsonString ? JSON.parse(jsonString) : null;
        } catch (e) {
            console.error('Error parsing JSON:', e);
            return null;
        }
    }

    /** Валидирует данные площадки перед сохранением
     * @param {Object} platformData - Данные для валидации
     * @returns {Object} Результат валидации {valid: boolean, errors: Array}
     */
    static validatePlatformData(platformData) {
        const errors = [];

        // Обязательные поля
        if (!platformData.name || platformData.name.trim().length < 3) {
            errors.push('Name must be at least 3 characters long');
        }

        if (!platformData.type) {
            errors.push('Platform type is required');
        }

        if (!platformData.url || !this.isValidUrl(platformData.url)) {
            errors.push('Valid URL is required');
        }

        if (!platformData.pricing_model) {
            errors.push('Pricing model is required');
        }

        // Валидация pricing в зависимости от модели
        if (platformData.pricing_model && platformData.pricing) {
            const pricing = typeof platformData.pricing === 'string'
                ? this.parseJSON(platformData.pricing)
                : platformData.pricing;

            if (platformData.pricing_model === 'cpm' && !pricing.cpm) {
                errors.push('CPM price is required for CPM pricing model');
            }
            if (platformData.pricing_model === 'cpc' && !pricing.cpc) {
                errors.push('CPC price is required for CPC pricing model');
            }
            if (platformData.pricing_model === 'cpa' && !pricing.cpa) {
                errors.push('CPA price is required for CPA pricing model');
            }
            if (platformData.pricing_model === 'flat_rate' &&
                !pricing.flat_daily && !pricing.flat_weekly && !pricing.flat_monthly) {
                errors.push('At least one flat rate price is required');
            }
        }

        // Валидация числовых полей
        if (platformData.audience_size !== undefined && platformData.audience_size < 0) {
            errors.push('Audience size cannot be negative');
        }

        if (platformData.minimum_budget !== undefined && platformData.minimum_budget < 0) {
            errors.push('Minimum budget cannot be negative');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /** Проверяет валидность URL
     * @private
     * @param {string} url - URL для проверки
     * @returns {boolean} Валидный ли URL
     */
    static isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch (e) {
            return false;
        }
    }

    /** Проверяет права доступа к площадке
     * @param {number} platformId - ID площадки
     * @param {number} userId - ID пользователя
     * @param {string} action - Действие (view, edit, delete, moderate)
     * @returns {Promise<boolean>} Есть ли доступ
     */
    static async checkAccess(platformId, userId, action = 'view') {
        const platform = await this.getPlatformById(platformId);
        if (!platform) return false;

        const user = await this.db.get(
            'SELECT is_Admin, is_Moderator FROM users WHERE id = ?',
            [userId]
        );

        // Админы имеют полный доступ
        if (user?.is_Admin) return true;

        // Модераторы могут просматривать и модерировать
        if (user?.is_Moderator && ['view', 'moderate'].includes(action)) return true;

        // Владелец может все, кроме модерации
        if (platform.user_id === userId && action !== 'moderate') return true;

        // Публичный просмотр активных площадок
        if (action === 'view' && platform.status === 'active' && !platform.deleted_at) return true;

        return false;
    }

    /* === МАССОВЫЕ ОПЕРАЦИИ ===
     * archiveInactivePlatforms(days) - архивирует неактивные -> количество архивированных
     * bulkImport(platformsData, userId) - массовый импорт -> {imported, failed, errors}
     * exportUserPlatforms(userId, format) - экспорт площадок -> данные в формате
     * mergePlatforms(platformIds, primaryId) - объединяет площадки -> результат объединения
     */

    /** Архивирует неактивные площадки
     * @param {number} days - Количество дней неактивности
     * @returns {Promise<number>} Количество архивированных площадок
     */
    static async archiveInactivePlatforms(days) {
        const result = await this.db.run(`
      UPDATE ${this.tableName}
      SET status = 'archived', 
          deleted_at = CURRENT_TIMESTAMP
      WHERE status IN ('draft', 'paused')
        AND datetime(COALESCE(last_active_at, updated_at)) < datetime('now', '-${days} days')
        AND deleted_at IS NULL
    `);

        return result.changes;
    }

    /** Импортирует площадки из CSV
     * @param {Array<Object>} platformsData - Массив данных площадок
     * @param {number} userId - ID владельца
     * @returns {Promise<Object>} Результат импорта
     */
    static async bulkImport(platformsData, userId) {
        const results = {
            imported: 0,
            failed: 0,
            errors: []
        };

        for (const data of platformsData) {
            try {
                const validation = this.validatePlatformData(data);
                if (!validation.valid) {
                    results.failed++;
                    results.errors.push({
                        data,
                        errors: validation.errors
                    });
                    continue;
                }

                data.user_id = userId;
                await this.createPlatform(data);
                results.imported++;
            } catch (error) {
                results.failed++;
                results.errors.push({
                    data,
                    errors: [error.message]
                });
            }
        }

        return results;
    }

    /** Экспортирует площадки пользователя
     * @param {number} userId - ID пользователя
     * @param {string} format - Формат экспорта (json, csv)
     * @returns {Promise<Object|string>} Экспортированные данные
     */
    static async exportUserPlatforms(userId, format = 'json') {
        const platforms = await this.getPlatformsByUser(userId);

        if (format === 'json') {
            return platforms;
        }

        if (format === 'csv') {
            // Простая конвертация в CSV
            const headers = ['id', 'name', 'type', 'url', 'status', 'audience_size', 'pricing_model'];
            const rows = platforms.map(p => [
                p.id,
                p.name,
                p.type,
                p.url,
                p.status,
                p.audience_size,
                p.pricing_model
            ]);

            const csv = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');

            return csv;
        }

        throw new Error(`Unsupported export format: ${format}`);
    }

    /** Объединяет дублирующиеся площадки
     * @param {Array<number>} platformIds - ID площадок для объединения
     * @param {number} primaryId - ID основной площадки
     * @returns {Promise<Object>} Результат объединения
     */
    static async mergePlatforms(platformIds, primaryId) {
        if (!platformIds.includes(primaryId)) {
            throw new Error('Primary ID must be in the list of platforms to merge');
        }

        const primary = await this.getPlatformById(primaryId);
        if (!primary) throw new Error('Primary platform not found');

        // Проверяем, что все площадки принадлежат одному владельцу
        const platforms = await Promise.all(platformIds.map(id => this.getPlatformById(id)));
        const owners = [...new Set(platforms.map(p => p?.user_id))];

        if (owners.length > 1) {
            throw new Error('All platforms must belong to the same owner');
        }

        // Объединяем данные
        let totalAudience = 0;
        let totalCampaigns = 0;
        let totalRevenue = 0;
        const allCategories = new Set(primary.categories || []);
        const allFormats = new Set(primary.ad_formats_supported || []);
        const allLanguages = new Set(primary.languages_supported || []);

        for (const platform of platforms) {
            if (!platform || platform.id === primaryId) continue;

            totalAudience += platform.audience_size || 0;
            totalCampaigns += platform.total_campaigns_completed || 0;
            totalRevenue += platform.total_revenue_generated || 0;

            (platform.categories || []).forEach(cat => allCategories.add(cat));
            (platform.ad_formats_supported || []).forEach(fmt => allFormats.add(fmt));
            (platform.languages_supported || []).forEach(lang => allLanguages.add(lang));

            // Архивируем объединенную площадку
            await this.softDelete(platform.id);
        }

        // Обновляем основную площадку
        await this.db.run(`
      UPDATE ${this.tableName}
      SET 
        audience_size = audience_size + ?,
        total_campaigns_completed = total_campaigns_completed + ?,
        total_revenue_generated = total_revenue_generated + ?,
        categories = ?,
        ad_formats_supported = ?,
        languages_supported = ?
      WHERE id = ?
    `, [
            totalAudience,
            totalCampaigns,
            totalRevenue,
            JSON.stringify([...allCategories]),
            JSON.stringify([...allFormats]),
            JSON.stringify([...allLanguages]),
            primaryId
        ]);

        return {
            merged: platformIds.length - 1,
            primary_id: primaryId,
            total_audience: primary.audience_size + totalAudience,
            total_campaigns: primary.total_campaigns_completed + totalCampaigns,
            total_revenue
        }
    };
}
module.exports = Platform;
