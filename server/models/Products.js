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
      required: true,
      min: 0,
    },
    expiryDate:{
   type:Date,
   required:true
    },
    description: {
      type: String,
      maxlength: 500,
    },
    images: {
      type: [String], // Paths or URLs
      validate: [arrayLimit, "Minimum 1 image required"], // Ensure validation works
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "addedByModel",
      required: true,
    },
    addedByModel: {
      type: String,
      enum: ["Admin", "Seller"],
      required: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
     
    },
    
    


  },
  { timestamps: true }
);

function arrayLimit(val) {
  return val.length >= 1; // Enforce minimum 1 image
}



module.exports = mongoose.model("Product", productSchema);
