/**
 * *project*\backend/models/index.js
 * Models index file - exports all models
 */

module.exports = {
  // Base model
  BaseModel: require('./BaseModel'),

  // User models
  UserModel: require('./user/userModel'),
  UserProfileModel: require('./user/userProfileModel'),
  UserFinanceModel: require('./user/userFinanceModel'),
  UserLoyaltyModel: require('./user/userLoyaltyModel'),
  UserApiModel: require('./user/userApiModel'),
  UserVerificationModel: require('./user/userVerificationModel'),

  // Campaign models
  CampaignModel: require('./campaign/campaignModel'),
  CampaignTargetingModel: require('./campaign/campaignTargetingModel'),
  CampaignCreativeModel: require('./campaign/campaignCreativeModel'),
  CampaignPerformanceModel: require('./campaign/campaignPerformanceModel'),
  CampaignSchedulingModel: require('./campaign/campaignSchedulingModel'),
  CampaignOptimizationModel: require('./campaign/campaignOptimizationModel'),

  // Other models can be added here
};