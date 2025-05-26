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
  type: mongoose.Schema.Types.ObjectId,
  ref: "Subscription",
},
fcmToken: {
  type: String,
  default: null,
},
 location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },


  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
