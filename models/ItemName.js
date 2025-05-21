// models/ItemName.js
const mongoose = require("mongoose");

const itemNameSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  category: {
    type: String,
    enum: ["fruits", "vegetables"],
    required: true
  }
});

module.exports = mongoose.model("ItemName", itemNameSchema);
