const User = require("../../models/User");
const { sendOTP,verifyOTP } = require("../services/twilio");

const { isValidNumber, parsePhoneNumber } = require('libphonenumber-js');

const sendOtpController = async (req, res) => {
  const { phone } = req.body;

  try {
    const phoneNumber = parsePhoneNumber(phone);

    if (!phoneNumber.isValid()) {
      return res.status(400).json({ message: "Invalid phone number format" });
    }

    const validCountries = ["IN", "AE"];
    if (!validCountries.includes(phoneNumber.country)) {
      return res.status(400).json({ message: "Only India and UAE numbers are supported" });
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
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1d",
  });

  res.status(200).json({ token, user });
};
module.exports={sendOtpController,verifyOtpController}