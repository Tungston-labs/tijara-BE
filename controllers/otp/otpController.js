const User = require("../../models/User"); // Unified model for buyer & seller
const Otp = require("../../models/Otp");
const jwt = require("jsonwebtoken");
const { generateUniqueOtp } = require("../../utils/otpHelper");


const sendOtpForPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otp = await generateUniqueOtp();
    await Otp.create({ otp, email });

    // TODO: Send OTP via email service here
    // console.log(`OTP for ${email}:`, otp); // For dev only

    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    next(error);
  }
};


const verifyOtpForPasswordReset = async (req, res, next) => {
  try {
    const { otp, email } = req.body;

    if (!otp || !email) {
      return res.status(400).json({ message: "OTP and email are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const recentOtp = await Otp.findOne({ email }).sort({ createdAt: -1 });

    if (!recentOtp || recentOtp.otp !== otp) {
      return res.status(422).json({ message: "Invalid OTP" });
    }

    const resetToken = jwt.sign({ email }, process.env.RESET_TOKEN_SECRET, {
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
