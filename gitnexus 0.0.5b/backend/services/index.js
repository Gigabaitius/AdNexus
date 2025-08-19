/**
 * *project*\backend/services/index.js
 * Services index file - exports all services
 */

module.exports = {
  // User services
  UserService: require('./user/userService'),
  AuthService: require('./user/authService'),
  ProfileService: require('./user/profileService'),
  FinanceService: require('./user/financeService'),
  LoyaltyService: require('./user/loyaltyService'),
  SubscriptionService: require('./user/subscriptionService'),

  // Campaign services
  CampaignService: require('./campaign/campaignService'),
  CampaignValidationService: require('./campaign/campaignValidationService'),
  CampaignFinanceService: require('./campaign/campaignFinanceService'),
  CampaignModerationService: require('./campaign/campaignModerationService'),
  TargetingService: require('./campaign/targetingService'),
  PerformanceService: require('./campaign/performanceService'),
  CreativeService: require('./campaign/creativeService'),
  OptimizationService: require('./campaign/optimizationService'),

  // Other services can be added here
};