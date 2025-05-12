const mongoose = require("mongoose");

const sellerSchema = new mongoose.Schema(
  {
    sellerName: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    companyName: {
      type: String,
      required: true,
    },
    tradeLicenseNumber: {
      type: String,
      required: true
    },
    managerName: {
      type: String,
      required: true,
    },
    tradeLicenseCopy: {
      type: String, // This will store the file path or URL
      required: [true, "Trade license copy is required"],
    },
    role: {
        type: String,
        default: 'seller',
        enum: ['seller'],  
      },
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
      },
      subscription: {
        plan: { type: String, enum: ['free', 'basic', 'pro'], default: 'free' },
        startDate: Date,
        endDate: Date,
        isActive: { type: Boolean, default: false }
      }
      
  },
  { timestamps: true }
);

module.exports = mongoose.model("Seller", sellerSchema);
