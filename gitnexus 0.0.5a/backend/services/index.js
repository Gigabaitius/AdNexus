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

  // Other services can be added here
};