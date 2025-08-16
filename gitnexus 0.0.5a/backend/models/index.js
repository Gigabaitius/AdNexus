/**
 * *project*\backend/models/index.js
 * Models index file - exports all models
 */

module.exports = {
  // User models
  UserModel: require('./user/userModel'),
  UserProfileModel: require('./user/userProfileModel'),
  UserFinanceModel: require('./user/userFinanceModel'),
  UserLoyaltyModel: require('./user/userLoyaltyModel'),
  UserApiModel: require('./user/userApiModel'),
  UserVerificationModel: require('./user/userVerificationModel'),

  // Other models can be added here
};