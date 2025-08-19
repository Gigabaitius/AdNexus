/**
 * *project*\backend/services/user/userService.js
 * Обновления для работы с новыми моделями
 */

const UserFinanceModel = require('../../models/user/userFinanceModel');
const UserModel = require('../../models/user/userModel');

class UserService {
    // Обновить getUserById:
    static async getUserById(userId, options = {}) {
        const {
            includeProfile = true,
            includeFinance = false,
            includeLoyalty = false,
            includeApiKeys = false
        } = options;

        const user = await UserModel.findById(userId);

        if (!user) {
            throw new NotFoundError('User not found');
        }

        const result = { ...this.sanitizeUser(user) };

        // Параллельная загрузка связанных данных
        const promises = [];

        if (includeProfile) {
            promises.push(UserProfileModel.findByUserId(userId).then(profile => {
                result.profile = profile;
            }));
        }

        if (includeFinance) {
            promises.push(UserFinanceModel.findByUserId(userId).then(finance => {
                result.finance = finance;
            }));
        }

        if (includeLoyalty) {
            promises.push(UserLoyaltyModel.findByUserId(userId).then(loyalty => {
                result.loyalty = loyalty;
            }));
        }

        if (includeApiKeys) {
            promises.push(UserApiModel.findByUserId(userId).then(keys => {
                result.apiKeys = keys.map(key => ({
                    ...key,
                    api_secret_hash: undefined // Не возвращаем хеш
                }));
            }));
        }

        await Promise.all(promises);

        return result;
    }

    // Добавить метод для связи с кампаниями:
    static async getUserCampaignStatistics(userId) {
        const [campaigns, platforms] = await Promise.all([
            CampaignModel.countByStatus(userId),
            // Когда будет PlatformModel
            // PlatformModel.countByStatus(userId)
        ]);

        const finance = await UserFinanceModel.findByUserId(userId);

        return {
            campaigns: {
                total: Object.values(campaigns).reduce((sum, count) => sum + count, 0),
                byStatus: campaigns
            },
            platforms: {
                // total: Object.values(platforms).reduce((sum, count) => sum + count, 0),
                // byStatus: platforms
            },
            spending: {
                totalSpent: finance?.total_spent || 0,
                currentBalance: finance?.balance || 0,
                onHold: finance?.balance_on_hold || 0
            }
        };
    }

    // Обновить updateUser для работы с профилем:
    static async updateUser(userId, updates) {
        const { profile, ...userUpdates } = updates;

        return await UserModel.transaction(async () => {
            let updatedUser = null;

            // Обновляем основную информацию
            if (Object.keys(userUpdates).length > 0) {
                updatedUser = await UserModel.update(userId, userUpdates);
            }

            // Обновляем профиль
            if (profile) {
                await UserProfileModel.updateByUserId(userId, profile);
            }

            return await this.getUserById(userId);
        });
    }
}

module.exports = UserService;