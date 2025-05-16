const Admin = require("../../models/Admin");
const Buyer = require("../../models/Buyer");
const Seller = require("../../models/Seller");
const Otp = require("../../models/Otp");
const jwt = require("jsonwebtoken");
const { generateUniqueOtp } = require("../../utils/otpHelper");

const userModels = {
  admin: Admin,
  buyer: Buyer,
  seller: Seller,
  
};

const sendOtpForPasswordReset = async (req, res, next) => {
  try {
    const { email, role } = req.body;

    if (!email || !role || !userModels[role]) {
      return res.status(400).json({ message: "Email and valid role are required" });
    }

    const UserModel = userModels[role];
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: `${role} not found` });
    }

    const otp = await generateUniqueOtp();
    await Otp.create({ otp, email, role });

    // Send OTP via nodemailer (hook into your existing mail service)
    // await sendMail(email, `Your OTP is: ${otp}`);

    console.log(`OTP for ${role}:`, otp); // for dev only

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
    const user = await UserModel.findOne({ email });
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


  module.exports = { sendOtpForPasswordReset,verifyOtpForPasswordReset };