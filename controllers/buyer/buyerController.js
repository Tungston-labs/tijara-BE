const User = require("../../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const Location = require("../../models/Location");
const axios = require("axios");

const usernameRegex = /^[a-zA-Z0-9_ ]{3,50}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[0-9]{10}$/;
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]{8,32}$/;

const reverseGeocode = async (latitude, longitude) => {
  const apiKey = process.env.OPENCAGE_API_KEY;
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${apiKey}`;

  const response = await axios.get(url);
  const address = response.data?.results?.[0]?.formatted || "Unknown Location";
  return address;
};

const registerBuyer = async (req, res, next) => {
  try {
    const { name, phone, email, password, location } = req.body;

    const profileImage = req.files?.profileImage?.[0]?.filename
      ? `${req.protocol}://${req.get("host")}/uploads/users/buyers/${req.files.profileImage[0].filename}`
      : null;

    // Validate required fields
    if (!name || !phone || !email || !password || !location) {
      return res.status(400).json({
        message: "All fields are required including location and profile image.",
      });
    }

    // Basic validations
    if (!usernameRegex.test(name)) {
      return res.status(400).json({ message: "Name must be 3-50 characters, letters/numbers only." });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ message: "Phone must be 10 digits, numbers only." });
    }

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: "Password must include uppercase, lowercase, number, special char.",
      });
    }

    const existingBuyer = await User.findOne({ email });
    if (existingBuyer) {
      return res.status(400).json({ message: "Email already registered." });
    }

    // Parse location from string (if sent as stringified JSON)
    let parsedLocation;
    try {
      parsedLocation = typeof location === "string" ? JSON.parse(location) : location;
    } catch (err) {
      return res.status(400).json({ message: "Invalid location format." });
    }

    const [longitude, latitude] = parsedLocation?.coordinates || [];

    if (
      parsedLocation?.type !== "Point" ||
      typeof latitude !== "number" ||
      typeof longitude !== "number"
    ) {
      return res.status(400).json({ message: "Invalid GeoJSON location object." });
    }

    // Check if a location already exists nearby
    let resolvedLocationId;
    const nearest = await Location.findOne({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          $maxDistance: 50000, // 50 km
        },
      },
    });

    if (nearest) {
      resolvedLocationId = nearest._id;
    } else {
      const name = await reverseGeocode(latitude, longitude);
      const newLocation = await Location.create({
        name,
        country: "UAE",
        location: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
      });
      resolvedLocationId = newLocation._id;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newBuyer = new User({
      name,
      phone,
      email,
      password: hashedPassword,
      profileImage,
      role: "buyer",
      location: resolvedLocationId,
    });

    await newBuyer.save();

    const { password: _, ...buyerData } = newBuyer.toObject();

    res.status(201).json({
      message: "Buyer registered successfully",
      buyer: buyerData,
    });
  } catch (error) {
    next(error);
  }
};


const checkResetToken = async (req, res, next) => {
  try {
    const resetToken = req.cookies?.resetToken;

    if (!resetToken) {
      const error = new Error("Unauthorized or token expired");
      error.statusCode = 401;
      throw error;
    }

    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.RESET_TOKEN_SECRET);
    } catch (err) {
      err.statusCode = 401;
      err.message = "Invalid or expired token";
      throw err;
    }

    const admin = await User.findOne({ email: decoded.email, role });
    if (!admin) {
      const error = new Error("Buyer not found");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({ message: "Token verified" });
  } catch (error) {
    next(error);
  }
};



const editBuyer = async (req, res, next) => {
  try {
    const buyerId = req.user.id; // ID from JWT
    const updates = req.body;

    if (req.user.role !== "buyer") {
      return res.status(403).json({ message: "Unauthorized " });
    }

    const updatedBuyer = await User.findByIdAndUpdate(buyerId, updates, {
      new: true,
    });
    if (req.file) {
      updates.profileImage = `${baseUrl}/uploads/buyers/${req.file.filename}`;
    }

    if (!updatedBuyer) {
      return res.status(404).json({ message: "Buyer not found" });
    }

    res
      .status(200)
      .json({ message: "Buyer updated successfully", buyer: updatedBuyer });
  } catch (error) {
    next(error);
  }
};

const getBuyerProfile = async (req, res) => {
  const buyer = await User.findById(req.user.id).select("-password");
  if (!buyer || buyer.role !== "buyer") {
    return res.status(404).json({ message: "Buyer not found" });
  }
  res.status(200).json({ buyer });
};

module.exports = {
  registerBuyer,
  checkResetToken,
  editBuyer,
  getBuyerProfile,
};
