const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  duration: { type: String, enum: ['monthly', 'annually'], required: true },
  durationInDays:{type:Number,},
  price: { type: Number, required: true },
  description: { type: String, required: true },
});


module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
