const User = require("../../models/User");
const { sendOTP, verifyOTP } = require("../../services/twilio");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

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
      return res.status(401).json({ message: "Unauthorized, Your account is not yet verified" });
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

module.exports = {
  sendOtpController,
  verifyOtpController,
  login,
  checkResetToken,
  resetPassword,
  refresh,
};
