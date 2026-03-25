const User = require("../../models/User");
const validator = require("validator");
const { sendOTP, verifyOTP } = require("../../services/twilio");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Location = require("../../models/Location");
const axios = require("axios");
const { isValidNumber, parsePhoneNumber } = require("libphonenumber-js");

const sendOtpController = async (req, res) => {
  const { phone } = req.body;

  try {
    const phoneNumber = parsePhoneNumber(phone);

    if (!phoneNumber.isValid()) {
      return res.status(400).json({ message: "Invalid phone number format" });
    }

    const validCountries = ["IN", "AE"];
    if (!validCountries.includes(phoneNumber.country)) {
      return res
        .status(400)
        .json({ message: "Only India and UAE numbers are supported" });
    }

    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ message: "User not found" });

    await sendOTP(phoneNumber.number); // Always send in E.164 format
    res.status(200).json({ message: "OTP sent successfully" });
  } catch (err) {
    res.status(400).json({ message: "Invalid phone number" });
  }
};

const verifyOtpController = async (req, res) => {
  const { phone, code } = req.body;

  const verification = await verifyOTP(phone, code);
  if (verification.status !== "approved") {
    return res.status(401).json({ message: "Invalid or expired OTP" });
  }

  const user = await User.findOne({ phone });
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: "1d",
    }
  );

  res.status(200).json({ token, user });
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.status !== "approved") {
      return res.status(403).json({
        message: `Your account is under ${user.status}`,
        status: user.status,
      });
    }

    const accessToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "30d" }
    );

    res.cookie("jwt", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Login successful",
      _id: user._id,
      name: user.name,
      accessToken,
      role: user.role,
      image: user.profileImage,
      tradeLicenseExpiry: user.tradeLicenseExpiry,
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

    const user = await User.findOne({ email: decoded.email });
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({ message: "Token verified" });
  } catch (error) {
    next(error);
  }
};
//controller for delete account
const deleteAccountController = async (req, res, next) => {
  try {
    const userId = req.user._id;

    await Location.deleteMany({ user: userId });


    await User.findByIdAndDelete(userId);

    res.status(200).json({
      message: "Account deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: "New password is required" });
    }

    const resetToken = req.cookies?.resetToken;
    if (!resetToken) {
      return res
        .status(401)
        .json({ message: "Unauthorized or token is required" });
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,32}$/;

    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message:
          "Password must be 8-32 characters, include uppercase, lowercase, number, and special character.",
      });
    }

    const decoded = jwt.verify(resetToken, process.env.RESET_TOKEN_SECRET);
    const { email } = decoded;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    next(error);
  }
};

const refresh = async (req, res) => {
  try {
    const cookies = req.cookies;
    if (!cookies?.jwt) {
      return res
        .status(401)
        .json({ message: "Unauthorized, Your account is not yet verified" });
    }

    const refreshToken = cookies.jwt;

    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
      async (err, decoded) => {
        if (err) {
          return res
            .status(403)
            .json({ message: "Invalid or expired refresh token" });
        }

        const { id, email } = decoded;

        const user = await User.findById(id);
        if (!user || user.email !== email) {
          return res.status(404).json({ message: "User not found" });
        }

        const accessToken = jwt.sign(
          { id: user._id, email: user.email, role: user.role },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: "1h" }
        );

        return res.status(200).json({
          message: "Token refreshed successfully",
          accessToken,
        });
      }
    );
  } catch (error) {
    console.error("Refresh token error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const usernameRegex = /^[a-zA-Z0-9_ ]{3,50}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]{8,32}$/;

const phoneRegex =
  /^(\+91[6-9]\d{9}|\+9715\d{8}|\+9665\d{8}|\+9689\d{7}|\+974[3567]\d{7}|\+9733\d{7}|\+965[569]\d{7})$/;
const reverseGeocode = async (latitude, longitude) => {
  const apiKey = process.env.OPENCAGE_API_KEY;
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${apiKey}`;

  const response = await axios.get(url);
  const result = response.data?.results?.[0];
  const components = result?.components || {};

  console.log("Geocode components:", components);

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

const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, locationId, coords, country } = req.body;
    let phone = req.body.phone;

    const profileImage = req.files?.profileImage?.[0]?.filename
      ? `${req.protocol}://${req.get("host")}/uploads/users/${
          req.files.profileImage[0].filename
        }`
      : null;

    if (!name || !phone || !email || !password) {
      return res.status(400).json({
        message: "Name, phone, email, and password are required.",
      });
    }

    if (!phone.startsWith("+")) {
      phone = "+" + phone;
    }

    if (!usernameRegex.test(name)) {
      return res.status(400).json({
        message: "Name must be 3-50 characters, letters/numbers only.",
      });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        message:
          "Invalid phone number. Must be valid for India or GCC with country code.",
      });
    }

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "Password must include uppercase, lowercase, number, special char.",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered." });
    }

    // Optional location handling
    let resolvedLocationId = null;

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

      if (typeof latitude === "number" && typeof longitude === "number") {
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
          const { address, country } = await reverseGeocode(latitude, longitude);
          const newLocation = new Location({
            country,
            location: { type: "Point", coordinates: [longitude, latitude] },
            name: address,
          });

          await newLocation.save();
          resolvedLocationId = newLocation._id;
        }
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = new User({
      name,
      phone,
      email,
      password: hashedPassword,
      profileImage,
      role: "buyer",
      tradeLicenseStatus: "not_uploaded",
      location: resolvedLocationId, // can be null
    });

    await newUser.save();

    const { password: _, ...userData } = newUser.toObject();

    // If pending approval
    if (newUser.status === "pending") {
      return res.status(201).json({
        message: "Signed up successfully. Awaiting approval.",
        user: {
          _id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          status: newUser.status,
        },
      });
    }

    // JWT
    const accessToken = jwt.sign(
      { id: userData._id, email: userData.email, role: userData.role },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { id: userData._id, email: userData.email, role: userData.role },
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
      message: "Signed up successfully",
      _id: userData._id,
      name: userData.name,
      accessToken,
      role: userData.role,
      status: userData.status,
      location: resolvedLocationId, // return null if not provided
    });
  } catch (error) {
    next(error);
  }
};


const addTradeLicenseDetails = async (req, res, next) => {
  try {
    const { companyName, tradeLicenseNumber, managerName, tradeLicenseExpiry } =
      req.body;
    const userId = req.user.id; // Assumes you're using auth middleware to attach req.user

    // Upload path
    const tradeLicensePath = req.files?.tradeLicenseCopy?.[0]?.filename
      ? `${req.protocol}://${req.get("host")}/uploads/licenses/${
          req.files.tradeLicenseCopy[0].filename
        }`
      : null;

    // Validation
    if (
      !companyName ||
      !tradeLicenseNumber ||
      !managerName ||
      !tradeLicenseExpiry ||
      !tradeLicensePath
    ) {
      return res.status(400).json({
        message:
          "All fields including company name, trade license number, expiry, copy, and manager name are required",
      });
    }

    // Optional: validate formats
    const licenseNumberRegex = /^[A-Za-z0-9\-\/.]{3,}$/;
    const nameRegex = /^[a-zA-ZÀ-ÿ'.\-\s]{3,}$/;

    if (!nameRegex.test(companyName))
      return res.status(400).json({ message: "Invalid company name format" });

    if (!licenseNumberRegex.test(tradeLicenseNumber))
      return res
        .status(400)
        .json({ message: "Invalid trade license number format" });

    if (!nameRegex.test(managerName))
      return res.status(400).json({ message: "Invalid manager name format" });

    const expiryDate = new Date(tradeLicenseExpiry);
    if (isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
      return res
        .status(400)
        .json({ message: "Trade license expiry must be a valid future date" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // // Check if already a seller
    // if (user.tradeLicenseStatus === "Yes") {
    //   return res
    //     .status(400)
    //     .json({ message: "Trade license already submitted" });
    // }

    // Update user with trade license details
    user.companyName = companyName;
    user.tradeLicenseNumber = tradeLicenseNumber;
    user.managerName = managerName;
    user.tradeLicenseCopy = tradeLicensePath;
    user.tradeLicenseExpiry = expiryDate;
    user.tradeLicenseStatus = "pending";

    await user.save();
    const updatedToken = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role, // now "seller"
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "1h" }
    );
    return res.status(200).json({
      message:
        "Trade license details added successfully. You're license details is under verification.",
      token: updatedToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tradeLicenseStatus: user.tradeLicenseStatus,
        tradeLicenseExpiry: user.tradeLicenseExpiry,
      },
    });
  } catch (error) {
    next(error);
  }
};
const getTradeLicenseStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select(
      "name role email tradeLicenseStatus companyName tradeLicenseExpiry managerName"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Check and update if license has expired
    const today = new Date();
    if (
      user.tradeLicenseExpiry &&
      new Date(user.tradeLicenseExpiry) < today &&
      user.tradeLicenseStatus === "approved"
    ) {
      // Mark as expired only if it was approved earlier
      user.tradeLicenseStatus = "expired";
      user.role = "buyer"; // Optionally downgrade role
      await user.save();
    }

    let message = "";
    switch (user.tradeLicenseStatus) {
      case "not_uploaded":
        message = "Trade license not uploaded.";
        break;
      case "pending":
        message = "Trade license is under verification.";
        break;
      case "approved":
        message = "You are an approved seller.";
        break;
      case "rejected":
        message = "Trade license was rejected. Please re-upload.";
        break;
      case "expired":
        message = "Your trade license has expired. Please renew.";
        break;
    }

    return res.status(200).json({
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        tradeLicenseStatus: user.tradeLicenseStatus,
        companyName: user.companyName,
        managerName: user.managerName,
        tradeLicenseExpiry: user.tradeLicenseExpiry,
      },
      message,
    });
  } catch (error) {
    next(error);
  }
};
const updateProfileImage = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const profileImage = req.file?.filename
      ? `${req.protocol}://${req.get("host")}/uploads/users/${req.file.filename}`
      : null;

    if (!profileImage) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { profileImage },
      { new: true }
    ).select("-password");

    res.status(200).json({
      message: "Profile image updated successfully",
      user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  updateProfileImage,
  sendOtpController,
  verifyOtpController,
  login,
  checkResetToken,
  deleteAccountController,
  resetPassword,
  refresh,
  addTradeLicenseDetails,
  getTradeLicenseStatus,
};
