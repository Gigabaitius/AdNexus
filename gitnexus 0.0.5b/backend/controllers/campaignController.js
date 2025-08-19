/**
 * *project*\backend/controllers/campaignController.js
 * Контроллер для работы с кампаниями через новую архитектуру
 */

const campaignService = require('../services/campaign/campaignService');
const targetingService = require('../services/campaign/targetingService');
const performanceService = require('../services/campaign/performanceService');
const { ValidationError, NotFoundError, BusinessError } = require('../utils/errors');

class CampaignController {
    /**
     * Создает новую кампанию
     * POST /api/campaigns
     */
    static async createCampaign(req, res) {
        try {
            const userId = req.user.id;
            const campaignData = req.body;

            const campaign = await campaignService.createCampaign(userId, campaignData);

            res.status(201).json({
                success: true,
                message: 'Campaign created successfully',
                data: campaign
            });
        } catch (error) {
            if (error instanceof ValidationError) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: error.errors
                });
            }

            if (error instanceof BusinessError) {
                return res.status(400).json({
                    success: false,
                    message: error.message,
                    details: error.details
                });
            }

            console.error('Create campaign error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create campaign'
            });
        }
    }

    /**
     * Получает список кампаний пользователя
     * GET /api/campaigns
     */
    static async getUserCampaigns(req, res) {
        try {
            const userId = req.user.id;
            const {
                page = 1,
                limit = 20,
                status,
                sort = 'created_at',
                order = 'desc',
                search
            } = req.query;

            const options = {
                page: parseInt(page),
                limit: parseInt(limit),
                status,
                sortBy: sort,
                sortOrder: order.toUpperCase(),
                search
            };

            const result = await campaignService.getUserCampaigns(userId, options);

            res.json({
                success: true,
                data: result.campaigns,
                pagination: result.pagination,
                stats: result.stats
            });
        } catch (error) {
            console.error('Get campaigns error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch campaigns'
            });
        }
    }

    /**
     * Получает детальную информацию о кампании
     * GET /api/campaigns/:id
     */
    static async getCampaign(req, res) {
        try {
            const campaignId = parseInt(req.params.id);
            const userId = req.user.id;

            const campaign = await campaignService.getCampaignById(campaignId, userId);

            res.json({
                success: true,
                data: campaign
            });
        } catch (error) {
            if (error instanceof NotFoundError) {
                return res.status(404).json({
                    success: false,
                    message: 'Campaign not found'
                });
            }

            if (error instanceof BusinessError) {
                return res.status(403).json({
                    success: false,
                    message: error.message
                });
            }

            console.error('Get campaign error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch campaign'
            });
        }
    }

    /**
     * Обновляет кампанию
     * PUT /api/campaigns/:id
     */
    static async updateCampaign(req, res) {
        try {
            const campaignId = parseInt(req.params.id);
            const userId = req.user.id;
            const updates = req.body;

            const campaign = await campaignService.updateCampaign(campaignId, userId, updates);

            res.json({
                success: true,
                message: 'Campaign updated successfully',
                data: campaign
            });
        } catch (error) {
            if (error instanceof ValidationError) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: error.errors
                });
            }

            if (error instanceof NotFoundError) {
                return res.status(404).json({
                    success: false,
                    message: 'Campaign not found'
                });
            }

            if (error instanceof BusinessError) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            console.error('Update campaign error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update campaign'
            });
        }
    }

    /**
     * Удаляет кампанию
     * DELETE /api/campaigns/:id
     */
    static async deleteCampaign(req, res) {
        try {
            const campaignId = parseInt(req.params.id);
            const userId = req.user.id;

            await campaignService.deleteCampaign(campaignId, userId);

            res.json({
                success: true,
                message: 'Campaign deleted successfully'
            });
        } catch (error) {
            if (error instanceof NotFoundError) {
                return res.status(404).json({
                    success: false,
                    message: 'Campaign not found'
                });
            }

            if (error instanceof BusinessError) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            console.error('Delete campaign error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete campaign'
            });
        }
    }

    /**
     * Управление статусом кампании
     * POST /api/campaigns/:id/status
     */
    static async updateCampaignStatus(req, res) {
        try {
            const campaignId = parseInt(req.params.id);
            const userId = req.user.id;
            const { action } = req.body; // 'launch', 'pause', 'resume', 'complete'

            let result;
            let message;

            switch (action) {
                case 'launch':
                    result = await campaignService.launchCampaign(campaignId, userId);
                    message = 'Campaign launched successfully';
                    break;
                case 'pause':
                    result = await campaignService.pauseCampaign(campaignId, userId);
                    message = 'Campaign paused successfully';
                    break;
                case 'resume':
                    result = await campaignService.resumeCampaign(campaignId, userId);
                    message = 'Campaign resumed successfully';
                    break;
                case 'complete':
                    result = await campaignService.completeCampaign(campaignId, userId);
                    message = 'Campaign completed successfully';
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid action'
                    });
            }

            res.json({
                success: true,
                message,
                data: result
            });
        } catch (error) {
            if (error instanceof BusinessError) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            console.error('Update campaign status error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update campaign status'
            });
        }
    }

    /**
     * Клонирует кампанию
     * POST /api/campaigns/:id/clone
     */
    static async cloneCampaign(req, res) {
        try {
            const campaignId = parseInt(req.params.id);
            const userId = req.user.id;
            const overrides = req.body;

            const newCampaign = await campaignService.cloneCampaign(campaignId, userId, overrides);

            res.status(201).json({
                success: true,
                message: 'Campaign cloned successfully',
                data: newCampaign
            });
        } catch (error) {
            if (error instanceof NotFoundError) {
                return res.status(404).json({
                    success: false,
                    message: 'Campaign not found'
                });
            }

            console.error('Clone campaign error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to clone campaign'
            });
        }
    }

    /**
     * Обновляет таргетинг кампании
     * PUT /api/campaigns/:id/targeting
     */
    static async updateTargeting(req, res) {
        try {
            const campaignId = parseInt(req.params.id);
            const userId = req.user.id;
            const targetingData = req.body;

            // Проверяем доступ к кампании
            await campaignService.getCampaignById(campaignId, userId);

            const targeting = await targetingService.updateTargeting(campaignId, targetingData);

            res.json({
                success: true,
                message: 'Targeting updated successfully',
                data: targeting
            });
        } catch (error) {
            if (error instanceof ValidationError) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid targeting data',
                    errors: error.errors
                });
            }

            console.error('Update targeting error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update targeting'
            });
        }
    }

    /**
     * Получает предложения тегов для кампании
     * POST /api/campaigns/suggest-tags
     */
    static async suggestTags(req, res) {
        try {
            const { title, description, objective } = req.body;

            if (!title || !objective) {
                return res.status(400).json({
                    success: false,
                    message: 'Title and objective are required'
                });
            }

            const tags = await targetingService.suggestTags(title, description || '', objective);

            res.json({
                success: true,
                data: tags
            });
        } catch (error) {
            console.error('Suggest tags error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to suggest tags'
            });
        }
    }

    /**
     * Оценивает охват аудитории
     * POST /api/campaigns/estimate-reach
     */
    static async estimateReach(req, res) {
        try {
            const targetingData = req.body;

            const reach = await targetingService.estimateReach(targetingData);

            res.json({
                success: true,
                data: reach
            });
        } catch (error) {
            console.error('Estimate reach error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to estimate reach'
            });
        }
    }

    /**
     * Получает аналитику кампании
     * GET /api/campaigns/:id/analytics
     */
    static async getCampaignAnalytics(req, res) {
        try {
            const campaignId = parseInt(req.params.id);
            const userId = req.user.id;
            const { period = 7 } = req.query;

            // Проверяем доступ к кампании
            await campaignService.getCampaignById(campaignId, userId);

            const analytics = await performanceService.getDetailedAnalytics(campaignId, {
                period: parseInt(period)
            });

            res.json({
                success: true,
                data: analytics
            });
        } catch (error) {
            if (error instanceof BusinessError) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            console.error('Get analytics error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch analytics'
            });
        }
    }

    /**
     * Получает сравнение с бенчмарками
     * GET /api/campaigns/:id/benchmarks
     */
    static async getCampaignBenchmarks(req, res) {
        try {
            const campaignId = parseInt(req.params.id);
            const userId = req.user.id;

            // Проверяем доступ к кампании
            await campaignService.getCampaignById(campaignId, userId);

            const benchmarks = await performanceService.getBenchmarks(campaignId);

            res.json({
                success: true,
                data: benchmarks
            });
        } catch (error) {
            console.error('Get benchmarks error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch benchmarks'
            });
        }
    }

    /**
     * Получает рекомендации по улучшению
     * GET /api/campaigns/:id/recommendations
     */
    static async getRecommendations(req, res) {
        try {
            const campaignId = parseInt(req.params.id);
            const userId = req.user.id;

            // Проверяем доступ к кампании
            await campaignService.getCampaignById(campaignId, userId);

            const recommendations = await performanceService.getPerformanceRecommendations(campaignId);

            res.json({
                success: true,
                data: recommendations
            });
        } catch (error) {
            console.error('Get recommendations error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch recommendations'
            });
        }
    }

    /**
     * Экспортирует данные кампании
     * GET /api/campaigns/:id/export
     */
    static async exportCampaign(req, res) {
        try {
            const campaignId = parseInt(req.params.id);
            const userId = req.user.id;
            const { format = 'json', includeHistory = true, period = 30 } = req.query;

            // Проверяем доступ к кампании
            await campaignService.getCampaignById(campaignId, userId);

            const exportData = await performanceService.exportPerformanceData(
                campaignId,
                format,
                {
                    includeHistory: includeHistory === 'true',
                    period: parseInt(period)
                }
            );

            if (format === 'csv') {
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename="campaign_${campaignId}_export.csv"`);
                res.send(exportData);
            } else {
                res.json({
                    success: true,
                    data: exportData
                });
            }
        } catch (error) {
            console.error('Export campaign error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to export campaign data'
            });
        }
    }

    /**
     * Проверяет аномалии в производительности
     * GET /api/campaigns/:id/anomalies
     */
    static async detectAnomalies(req, res) {
        try {
            const campaignId = parseInt(req.params.id);
            const userId = req.user.id;

            // Проверяем доступ к кампании
            await campaignService.getCampaignById(campaignId, userId);

            const anomalies = await performanceService.detectAnomalies(campaignId);

            res.json({
                success: true,
                data: anomalies,
                hasAnomalies: anomalies.length > 0
            });
        } catch (error) {
            console.error('Detect anomalies error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to detect anomalies'
            });
        }
    }

    /**
     * Обновляет метрики кампании (для внутреннего использования)
     * POST /api/campaigns/:id/metrics
     */
    static async updateMetrics(req, res) {
        try {
            // Этот эндпоинт должен быть доступен только для системы
            if (!req.isSystem && !req.user.is_admin) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            const campaignId = parseInt(req.params.id);
            const metrics = req.body;

            const updated = await performanceService.updateMetrics(campaignId, metrics);

            res.json({
                success: true,
                message: 'Metrics updated successfully',
                data: updated
            });
        } catch (error) {
            console.error('Update metrics error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update metrics'
            });
        }
    }

    /**
     * Получает список кампаний для модерации (admin/moderator)
     * GET /api/campaigns/moderation
     */
    static async getModerationQueue(req, res) {
        try {
            // Проверка прав доступа
            if (!req.user.is_admin && !req.user.is_moderator) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            const { page = 1, limit = 20 } = req.query;

            const campaigns = await campaignService.getCampaignsForModeration({
                page: parseInt(page),
                limit: parseInt(limit)
            });

            res.json({
                success: true,
                data: campaigns.campaigns,
                pagination: campaigns.pagination
            });
        } catch (error) {
            console.error('Get moderation queue error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch moderation queue'
            });
        }
    }

    /**
     * Модерирует кампанию (admin/moderator)
     * POST /api/campaigns/:id/moderate
     */
    static async moderateCampaign(req, res) {
        try {
            // Проверка прав доступа
            if (!req.user.is_admin && !req.user.is_moderator) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            const campaignId = parseInt(req.params.id);
            const { status, notes } = req.body; // 'approved', 'rejected', 'requires_changes'

            if (!['approved', 'rejected', 'requires_changes'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid moderation status'
                });
            }

            await campaignService.moderateCampaign(campaignId, req.user.id, status, notes);

            res.json({
                success: true,
                message: `Campaign ${status} successfully`
            });
        } catch (error) {
            if (error instanceof NotFoundError) {
                return res.status(404).json({
                    success: false,
                    message: 'Campaign not found'
                });
            }

            console.error('Moderate campaign error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to moderate campaign'
            });
        }
    }

    /**
     * Получает статистику по всем кампаниям пользователя
     * GET /api/campaigns/stats
     */
    static async getUserCampaignStats(req, res) {
        try {
            const userId = req.user.id;

            const stats = await campaignService.getUserCampaignStatistics(userId);

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('Get user stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch campaign statistics'
            });
        }
    }

    /**
     * Пакетные операции с кампаниями
     * POST /api/campaigns/batch
     */
    static async batchOperation(req, res) {
        try {
            const userId = req.user.id;
            const { operation, campaignIds } = req.body;

            if (!Array.isArray(campaignIds) || campaignIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Campaign IDs array is required'
                });
            }

            if (campaignIds.length > 50) {
                return res.status(400).json({
                    success: false,
                    message: 'Maximum 50 campaigns can be processed at once'
                });
            }

            const results = {
                success: [],
                failed: []
            };

            // Обрабатываем каждую кампанию
            for (const campaignId of campaignIds) {
                try {
                    switch (operation) {
                        case 'pause':
                            await campaignService.pauseCampaign(campaignId, userId);
                            results.success.push(campaignId);
                            break;
                        case 'resume':
                            await campaignService.resumeCampaign(campaignId, userId);
                            results.success.push(campaignId);
                            break;
                        case 'delete':
                            await campaignService.deleteCampaign(campaignId, userId);
                            results.success.push(campaignId);
                            break;
                        default:
                            results.failed.push({
                                campaignId,
                                error: 'Invalid operation'
                            });
                    }
                } catch (error) {
                    results.failed.push({
                        campaignId,
                        error: error.message
                    });
                }
            }

            res.json({
                success: true,
                message: `Batch operation completed. Success: ${results.success.length}, Failed: ${results.failed.length}`,
                results
            });
        } catch (error) {
            console.error('Batch operation error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to perform batch operation'
            });
        }
    }

    /**
     * Проверяет доступность имени кампании
     * GET /api/campaigns/check-name
     */
    static async checkCampaignName(req, res) {
        try {
            const userId = req.user.id;
            const { name } = req.query;

            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: 'Campaign name is required'
                });
            }

            const isAvailable = await campaignService.checkCampaignNameAvailability(userId, name);

            res.json({
                success: true,
                available: isAvailable,
                message: isAvailable ? 'Name is available' : 'Name is already in use'
            });
        } catch (error) {
            console.error('Check name error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to check name availability'
            });
        }
    }

    /**
     * Получает подходящие площадки для кампании
     * GET /api/campaigns/:id/matching-platforms
     */
    static async getMatchingPlatforms(req, res) {
        try {
            const campaignId = parseInt(req.params.id);
            const userId = req.user.id;
            const { limit = 20, minScore = 0.5 } = req.query;

            // Проверяем доступ к кампании
            await campaignService.getCampaignById(campaignId, userId);

            const platforms = await targetingService.findMatchingPlatforms(campaignId, {
                limit: parseInt(limit),
                minMatchScore: parseFloat(minScore)
            });

            res.json({
                success: true,
                data: platforms,
                count: platforms.length
            });
        } catch (error) {
            console.error('Get matching platforms error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch matching platforms'
            });
        }
    }

    /**
   * Управление креативами кампании
   * POST /api/campaigns/:id/creatives
   */
    static async addCreative(req, res) {
        try {
            const campaignId = parseInt(req.params.id);
            const userId = req.user.id;
            const creative = req.body;

            // Проверяем доступ к кампании
            await campaignService.getCampaignById(campaignId, userId);

            const addedCreative = await creativeService.addCreative(campaignId, creative);

            res.status(201).json({
                success: true,
                message: 'Creative added successfully',
                data: addedCreative
            });
        } catch (error) {
            if (error instanceof ValidationError) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid creative data',
                    errors: error.errors
                });
            }

            console.error('Add creative error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to add creative'
            });
        }
    }

    /**
     * Запускает автоматическую оптимизацию
     * POST /api/campaigns/:id/optimize
     */
    static async runOptimization(req, res) {
        try {
            const campaignId = parseInt(req.params.id);
            const userId = req.user.id;

            // Проверяем доступ к кампании
            await campaignService.getCampaignById(campaignId, userId);

            const result = await optimizationService.optimizeCampaign(campaignId);

            res.json({
                success: true,
                message: 'Optimization completed',
                data: result
            });
        } catch (error) {
            if (error instanceof BusinessError) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            console.error('Optimization error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to optimize campaign'
            });
        }
    }

    /**
     * Получает прогноз оптимизации
     * POST /api/campaigns/:id/optimization-preview
     */
    static async previewOptimization(req, res) {
        try {
            const campaignId = parseInt(req.params.id);
            const userId = req.user.id;
            const { optimizations } = req.body;

            // Проверяем доступ к кампании
            await campaignService.getCampaignById(campaignId, userId);

            const prediction = await optimizationService.predictOptimizationImpact(
                campaignId,
                optimizations
            );

            res.json({
                success: true,
                data: prediction
            });
        } catch (error) {
            console.error('Optimization preview error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate optimization preview'
            });
        }
    }
}

module.exports = CampaignController;