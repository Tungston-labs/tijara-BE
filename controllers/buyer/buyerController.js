const User = require("../../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const Location = require("../../models/Location");
const axios = require("axios");
const { buyer } = require("../../utils/userModals");

const usernameRegex = /^[a-zA-Z0-9_ ]{3,50}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]{8,32}$/;

const reverseGeocode = async (latitude, longitude) => {
  const apiKey = process.env.OPENCAGE_API_KEY;
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${apiKey}`;

  const response = await axios.get(url);
  const result = response.data?.results?.[0];
  const components = result?.components || {};

  console.log("Geocode components:", components);

  const phoneValidators = {
    IN: /^(\+91)?[6-9][0-9]{9}$/,
    UAE: /^(\+971)?(50|52|54|55|56)[0-9]{7}$/,
    SA: /^(\+966)?5[0-9]{8}$/,
    QA: /^(\+974)?(3|5|6|7)[0-9]{7}$/,
    OM: /^(\+968)?(7[1-9]|9[1-9])[0-9]{6}$/,
    KW: /^(\+965)?(5|6|9)[0-9]{7}$/,
    BH: /^(\+973)?(3|6|7)[0-9]{7}$/,
  };
  const isValidPhone = (phone, country) => {
    const regex = phoneValidators[country?.toUpperCase()];
    if (!regex) {
      return false; // Unknown country code
    }
    return regex.test(phone);
  };

  const name =
    components.suburb ||
    components.hamlet ||
    components.neighbourhood ||
    components.village ||
    components.town ||
    components.city_district ||
    components.city ||
    components.state_district ||
    result?.formatted ||
    components.country ||
    "Unknown Location";

  return {
    address: name,
    country: components.country || "Unknown",
  };
};

const registerBuyer = async (req, res, next) => {
  try {
    const { name, phone, email, password, locationId, coords, country } =
      req.body;

    const profileImage = req.files?.profileImage?.[0]?.filename
      ? `${req.protocol}://${req.get("host")}/uploads/users/buyers/${
          req.files.profileImage[0].filename
        }`
      : null;

    if (!name || !phone || !email || !password || (!locationId && !coords)) {
      return res.status(400).json({
        message:
          "All fields are required including location or coordinates and profile image",
      });
    }

    if (!usernameRegex.test(name)) {
      return res.status(400).json({
        message: "Name must be 3-50 characters, letters/numbers only.",
      });
    }
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }
    if (!isValidPhone(phone, country)) {
      return res.status(400).json({
        message: "Invalid phone number format for selected country.",
      });
    }
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "Password must include uppercase, lowercase, number, special char.",
      });
    }

    const existingBuyer = await User.findOne({ email });
    if (existingBuyer) {
      return res.status(400).json({ message: "Email already registered." });
    }

    let resolvedLocationId;

    if (locationId) {
      const location = await Location.findById(locationId);
      if (!location)
        return res.status(400).json({ message: "Invalid location ID." });
      resolvedLocationId = location._id;
    } else if (coords) {
      let latitude, longitude;

      if (typeof coords === "string") {
        try {
          const parsed = JSON.parse(coords);
          latitude = parseFloat(parsed.latitude);
          longitude = parseFloat(parsed.longitude);
        } catch (err) {
          return res
            .status(400)
            .json({ message: "Coordinates must be a valid JSON object." });
        }
      } else {
        latitude = parseFloat(coords.latitude);
        longitude = parseFloat(coords.longitude);
      }

      if (typeof latitude !== "number" || typeof longitude !== "number") {
        return res.status(400).json({ message: "Invalid coordinates." });
      }

      // Check if any location nearby already exists
      const nearest = await Location.findOne({
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [longitude, latitude],
            },
            $maxDistance: 50000, // 50km radius
          },
        },
      });

      if (nearest) {
        resolvedLocationId = nearest._id;
      } else {
        // Create new location using reverse geocoding
        const { address, country } = await reverseGeocode(latitude, longitude);

        const newLocation = new Location({
          country,
          location: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          name: address,
        });

        await newLocation.save();
        resolvedLocationId = newLocation._id;
      }
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

    const accessToken = jwt.sign(
      { id: buyerData._id, email: buyerData.email, role: buyerData.role },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { id: buyerData._id, email: buyerData.email, role: buyerData.role },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("jwt", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      message: "Signed up successful",
      _id: buyerData._id,
      name: buyerData.name,
      accessToken,
      role: buyerData.role,
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
