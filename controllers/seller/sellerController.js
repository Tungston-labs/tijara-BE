const User = require("../../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const { seller } = require("../../utils/userModals");
const Location = require("../../models/Location");
const axios = require("axios")

const usernameRegex = /^[a-zA-Z0-9 ]+$/;
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,32}$/;
const reverseGeocode = async (latitude, longitude) => {
  const apiKey = process.env.OPENCAGE_API_KEY;
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${apiKey}`;

  const response = await axios.get(url);
  const address = response.data?.results?.[0]?.formatted || "Unknown Location";
  return address;
};


const registerSeller = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      companyName,
      tradeLicenseNumber,
      managerName,
      locationId,
      coords,
    } = req.body;

    if (
      !name ||
      !email ||
      !password ||
      !phone ||
      !companyName ||
      !tradeLicenseNumber ||
      !managerName ||
      (!locationId && !coords) 
    ) {
      return res.status(400).json({
        message: "All fields including trade license copy, profile image, and location are required",
      });
    }

    const tradeLicensePath = `${req.protocol}://${req.get("host")}/uploads/licenses/${req.files.tradeLicenseCopy[0].filename}`;
    const profileImagePath = `${req.protocol}://${req.get("host")}/uploads/users/sellers/${req.files.profileImage[0].filename}`;

    // Validate input formats
    if (!usernameRegex.test(name)) return res.status(400).json({ message: "Invalid name format" });
    if (!validator.isEmail(email)) return res.status(400).json({ message: "Invalid email" });
    if (!validator.isMobilePhone(phone)) return res.status(400).json({ message: "Invalid phone" });
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: "Password must contain uppercase, lowercase, number, special character, and be 8–32 characters",
      });
    }

    const existingSeller = await User.findOne({ email });
    if (existingSeller) return res.status(400).json({ message: "Email already registered" });

    let resolvedLocationId;

    if (locationId) {
      const location = await Location.findById(locationId);
      if (!location) return res.status(400).json({ message: "Invalid location ID" });
      resolvedLocationId = location._id;
    } else if (coords) {
      let latitude, longitude;

      if (typeof coords === "string") {
        try {
          const parsed = JSON.parse(coords);
          latitude = parseFloat(parsed.latitude);
          longitude = parseFloat(parsed.longitude);
        } catch {
          return res.status(400).json({ message: "Coordinates must be a valid JSON object" });
        }
      } else {
        latitude = parseFloat(coords.latitude);
        longitude = parseFloat(coords.longitude);
      }

      if (typeof latitude !== "number" || typeof longitude !== "number") {
        return res.status(400).json({ message: "Invalid coordinates" });
      }

      const nearest = await Location.findOne({
        location: {
          $near: {
            $geometry: { type: "Point", coordinates: [longitude, latitude] },
            $maxDistance: 50000,
          },
        },
      });

      if (nearest) {
        resolvedLocationId = nearest._id;
      } else {
        const name = await reverseGeocode(latitude, longitude);
        const newLocation = new Location({
          country: "UAE",
          location: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          name,
        });
        await newLocation.save();
        resolvedLocationId = newLocation._id;
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newSeller = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      companyName,
      tradeLicenseNumber,
      managerName,
      tradeLicenseCopy: tradeLicensePath,
      profileImage: profileImagePath,
      role: "seller",
      location: resolvedLocationId,
    });

    await newSeller.save();

    const { password: _, ...sellerData } = newSeller.toObject();
    res.status(201).json({
      message: "Seller registered successfully",
      seller: sellerData,
    });
  } catch (error) {
    console.error("Registration error:", error);
    next(error);
  }
};


// Login Seller
const loginSeller = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const seller = await User.findOne({ email });
    if (!seller) {
      return res.status(404).json({ message: "Seller not found" });
    }

    const isMatch = await bcrypt.compare(password, seller.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    if (seller.status !== "approved") {
      return res.status(403).json(`Your account is under ${seller.status}`);
    }
    const accessToken = jwt.sign(
      { id: seller._id, email: seller.email, role: seller.role },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { id: seller._id, email: seller.email, role: seller.role },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("jwt", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Login successful",
      sellerName: seller.sellerName,
      accessToken,
      role: seller.role,
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

    const seller = await User.findOne({ email: decoded.email });
    if (!seller) {
      const error = new Error("Seller not found");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({ message: "Token verified" });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword) {
      const error = new Error("New password is required");
      error.statusCode = 400;
      throw error;
    }
    const resetToken = req.cookies?.resetToken;
    if (!resetToken) {
      const error = new Error("Unauthorized or token is required");
      error.statusCode = 401;
      throw error;
    }

    // Password validation regex (adjust according to your requirements)
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,32}$/;
    if (!passwordRegex.test(newPassword)) {
      const error = new Error(
        "Password must be at least 8 characters long, include an uppercase letter, a lowercase letter, a number, and a special character, and be no more than 32 characters long"
      );
      error.statusCode = 400;
      throw error;
    }

    const decoded = jwt.verify(resetToken, process.env.RESET_TOKEN_SECRET);
    const seller = await User.findOne({ email: decoded.email });
    if (!seller) {
      const error = new Error("Seller not found");
      error.statusCode = 404;
      throw error;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    seller.password = hashedPassword;
    await seller.save();

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    next(error); // Pass to centralized error handler
  }
};

const editSeller = async (req, res, next) => {
  try {
    const sellerId = req.params.id;

    let updates = { ...req.body };

    // Handle profile image upload
    if (req.file) {
      updates.profileImage = `${baseUrl}/uploads/sellers/${req.file.filename}`;
    }

    const updatedSeller = await User.findByIdAndUpdate(sellerId, updates, {
      new: true,
    });

    if (!updatedSeller) {
      return res.status(404).json({ message: "Seller not found" });
    }

    res.status(200).json({
      message: "Seller updated successfully",
      seller: updatedSeller,
    });
  } catch (error) {
    next(error);
  }
};
const getSellerProfile = async (req, res) => {
  const seller = await User.findById(req.user.id).select("-password");
  if (!seller || seller.role !== "seller") {
    return res.status(404).json({ message: "Seller not found" });
  }
  res.status(200).json({ seller });
};
module.exports = {
  registerSeller,
  loginSeller,
  checkResetToken,
  resetPassword,
  editSeller,
  getSellerProfile,
};
