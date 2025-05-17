// models/Agent.js
const mongoose = require("mongoose");


const agentSchema = new mongoose.Schema({
  agentName: {
    type: String,
    required: [true, "Agent name is required"],
    trim: true,

  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,

  },
  phone: {
    type: String,
    required: [true, "Phone number is required"],
    unique: true,
    trim: true,
    
  },
  address: {
    type: String,
    required: [true, "Address is required"],
    trim: true,
    maxlength: 255,
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Agent", agentSchema);
