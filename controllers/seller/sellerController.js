const User = require("../../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const { seller } = require("../../utils/userModals");

// Validation regex

const usernameRegex = /^[a-zA-Z0-9 ]+$/; // Example regex, modify as needed
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,32}$/;
const registerSeller = async (req, res, next) => {
  try {
    const cleanBody = { ...req.body };

    const {
      name,
      email,
      password,
      phone,
      companyName,
      tradeLicenseNumber,
      managerName,
      location: locationRaw,
    } = cleanBody;

    // Parse location JSON
    let location;
    try {
      location = JSON.parse(locationRaw);
      if (
        !location ||
        typeof location.latitude !== "number" ||
        typeof location.longitude !== "number"
      ) {
        throw new Error();
      }
    } catch {
      return res.status(400).json({ message: "Invalid or missing location" });
    }

    if (
      !name ||
      !email ||
      !password ||
      !phone ||
      !companyName ||
      !tradeLicenseNumber ||
      !managerName ||
      !req.files ||
      !req.files.tradeLicenseCopy ||
      !req.files.profileImage
    ) {
      return res.status(400).json({
        message:
          "All fields including trade license copy, profile image, and location are required",
      });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const tradeLicensePath = `${baseUrl}/uploads/licenses/${req.files.tradeLicenseCopy[0].filename}`;
    const profileImagePath = `${baseUrl}/uploads/users/sellers/${req.files.profileImage[0].filename}`;

    // Validations
    if (!usernameRegex.test(name)) {
      return res.status(400).json({ message: "Invalid name format" });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    if (!validator.isMobilePhone(phone)) {
      return res.status(400).json({ message: "Invalid phone number" });
    }

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "Password must be 8–32 characters, with uppercase, lowercase, number, and special character",
      });
    }

    const existingSeller = await User.findOne({ email });
    if (existingSeller) {
      return res.status(400).json({ message: "Email already registered" });
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
      location: {
        type: "Point",
        coordinates: [location.longitude, location.latitude],
      },
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
  getSellerProfile
};
