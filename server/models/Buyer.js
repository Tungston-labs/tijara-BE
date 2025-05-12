const mongoose = require("mongoose");

const buyerSchema = new mongoose.Schema(
  {
    buyerName: {
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
      default: "buyer",
      enum: ["buyer"],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },

  { timestamps: true }
);

const Buyer = mongoose.model("Buyer", buyerSchema);
module.exports = Buyer;
