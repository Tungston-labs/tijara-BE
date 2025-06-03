const express = require("express");
const router = express.Router();
const { sendOtpController, verifyOtpController } = require("../controllers/authController");

router.post("/login/send-otp", sendOtpController);
router.post("/login/verify-otp", verifyOtpController);

module.exports = router;
