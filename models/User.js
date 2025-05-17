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
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    companyName: {
      type: String,
      required: function () {
        return this.role === "seller";
      },
    },
    tradeLicenseNumber: {
      type: String,
      required: function () {
        return this.role === "seller";
      },
    },
    managerName: {
      type: String,
      required: function () {
        return this.role === "seller";
      },
    },
    tradeLicenseCopy: {
      type: String, // This will store the file path or URL
      required: function () {
        return this.role === "seller";
      },
    },
    profileImage: {
      type: String,
      default: "",
    },
    subscription: {
      planId: { type: mongoose.Schema.Types.ObjectId, ref: "SubscriptionPlan" },
      startDate: { type: Date },
      endDate: { type: Date },
      status: {
        type: String,
        enum: ["active", "expired", "cancelled"],
        default: "active",
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
