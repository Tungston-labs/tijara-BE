const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema({
  country: {
    type: String,
    default: "UAE",
  },
  location: {
    type: {
      type: String,
      enum: ["Point"],
      required: true,       
      default: "Point",
    },
    coordinates: {
      type: [Number],
      required: true,        
      validate: {
        validator: function (value) {
          return value.length === 2;
        },
        message: "Coordinates must be [longitude, latitude]",
      },
    },
  },
});

locationSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Location", locationSchema);
