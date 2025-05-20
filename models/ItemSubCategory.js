// models/ItemSubCategory.js
const mongoose = require("mongoose");

const itemSubCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  itemName: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ItemName",
    required: true
  }
});

module.exports = mongoose.model("ItemSubCategory", itemSubCategorySchema);
