const locationSchema = new mongoose.Schema({
  country: {
    type: String,
    default: "UAE",
  },
  name: {
    type: String,
    required: true,
  },
  location: {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
      default: "Point",
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true,
      validate: {
        validator: (val) => val.length === 2,
        message: "Coordinates must be [longitude, latitude]",
      },
    },
  },
});

locationSchema.index({ location: "2dsphere" });
