const mongoose=require("mongoose");
const subscriptionHistorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
  startDate: { type: Date, required: true },
  isActive:{type:Boolean, required:true},
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['active', 'expired', 'cancelled'], required: true },
});

module.exports = mongoose.model('SubscriptionHistory', subscriptionHistorySchema);
