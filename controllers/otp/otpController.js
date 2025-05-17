const Admin = require("../../models/Admin");
const User = require("../../models/User"); // Unified model for buyer & seller
const Otp = require("../../models/Otp");
const jwt = require("jsonwebtoken");
const { generateUniqueOtp } = require("../../utils/otpHelper");

const userModels = {
  admin: Admin,
  buyer: User, // Now points to shared User model
  seller: User,
};

const sendOtpForPasswordReset = async (req, res, next) => {
  try {
    const { email, role } = req.body;

    if (!email || !role || !userModels[role]) {
      return res.status(400).json({ message: "Email and valid role are required" });
    }

    const UserModel = userModels[role];
    const user = await UserModel.findOne({ email, role }); // Match both email and role
    if (!user) {
      return res.status(404).json({ message: `${role} not found` });
    }

    const otp = await generateUniqueOtp();
    await Otp.create({ otp, email, role });

    // TODO: Send OTP via mail service
    console.log(`OTP for ${role}:`, otp); // dev-only

    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    next(error);
  }
};

const verifyOtpForPasswordReset = async (req, res, next) => {
  try {
    const { otp, email, role } = req.body;

    if (!otp || !email || !role || !userModels[role]) {
      return res.status(400).json({ message: "OTP, email, and valid role are required" });
    }

    const UserModel = userModels[role];
    const user = await UserModel.findOne({ email, role }); // Match both email and role
    if (!user) {
      return res.status(404).json({ message: `${role} not found` });
    }

    const recentOtp = await Otp.findOne({ email, role }).sort({ createdAt: -1 });
    if (!recentOtp || recentOtp.otp !== otp) {
      return res.status(422).json({ message: "Invalid OTP" });
    }

    const resetToken = jwt.sign({ email, role }, process.env.RESET_TOKEN_SECRET, {
      expiresIn: "5m",
    });

    res.cookie("resetToken", resetToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 5 * 60 * 1000,
    });

    res.status(200).json({ message: "OTP verified successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = { sendOtpForPasswordReset, verifyOtpForPasswordReset };
