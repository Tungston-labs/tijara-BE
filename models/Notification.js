// models/Notification.js
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
type: { type: String, enum: ["order", "order_update", "status", "message"], required: true },
  isRead: { type: Boolean, default: false },
  metadata: { type: Object }, // optional: store orderId, etc.
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Notification", notificationSchema);
