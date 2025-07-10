const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    itemCategory: {
      type: String,
      required: true,
      enum: ["fruits", "vegetables"], // Add more if needed
    },

    itemName: {
      type: String,
      required: true,
    },
    itemSubCategory: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    pricePerKg: {
      type: Map,
      of: Number,
      default: {}, // No need to set required as Map can be empty
    },
    availableKg: {
      type: Number,
      min: 0,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    images: {
      type: [String], // Paths or URLs
      validate: [arrayLimit, "Minimum 1 image required"], // Ensure validation works
    },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    addedByModel: {
      type: String,
      enum: ["Admin", "User"],
      required: true,
    },
  },
  { timestamps: true }
);

function arrayLimit(val) {
  return val.length >= 1; 
}
// productSchema.index({ createdAt: 1 }, {  expireAfterSeconds: 7 * 24 * 60 * 60 }); 


module.exports = mongoose.model("Product", productSchema);
