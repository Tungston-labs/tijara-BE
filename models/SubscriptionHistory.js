const mongoose=require("mongoose");

const subscriptionHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SubscriptionPlan",
    required: true,
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true }, // Expiry date
  status: {
    type: String,
    enum: ["active", "expired", "cancelled"],
  },
  paymentType: {
    type: String,
    enum: ["card", "bank", "upi", "paypal", "cash"],
    required: true,
  },
  // transactionId: {
  //   type: String, // Optional: Store Stripe/UPI ID
  // },
  paymentStatus: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending",
  },
}, {
  timestamps: true, // adds createdAt and updatedAt
});



module.exports = mongoose.model('SubscriptionHistory', subscriptionHistorySchema);
