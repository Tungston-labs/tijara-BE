const express = require("express");
const { sendOtpController, verifyOtpController } = require("../../controllers/Login/loginController");
const router = express.Router();

router.post("/login/send-otp", sendOtpController);
router.post("/login/verify-otp", verifyOtpController);

module.exports = router;
