const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },

    role: {
      type: String,
      enum: ["buyer", "seller"],
      default: "buyer",
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    // Trade License Info (optional at signup)
    companyName: {
      type: String,
      default: null,
    },
    tradeLicenseNumber: {
      type: String,
      default: null,
    },
    tradeLicenseCopy: {
      type: String, // File path or URL
      default: null,
    },
    tradeLicenseExpiry: {
      type: Date,
      default: null,
    },
    tradeLicenseStatus: {
      type: String,
      enum: ["Yes", "No"],
      default: "No", // No means license details not added yet
    },

    managerName: {
      type: String,
      default: null,
    },

    profileImage: {
      type: String,
      default: "",
    },

    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
    },

    assignedAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agent",
      default: null,
    },

    fcmToken: {
      type: String,
      default: null,
    },

    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
