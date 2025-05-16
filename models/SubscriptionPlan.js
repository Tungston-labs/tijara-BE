const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  duration: { type: String, enum: ['monthly', 'annually'], required: true },
  price: { type: Number, required: true },
  features: [String], 
});

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
