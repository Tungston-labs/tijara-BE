const express = require("express");
const { sendOtpController, verifyOtpController, login, resetPassword, checkResetToken } = require("../../controllers/Login/loginController");
const { checkUserStatus } = require("../../controllers/admin/authController");
const { sendOtpForPasswordReset, verifyOtpForPasswordReset } = require("../../controllers/otp/otpController");
const router = express.Router();

router.post("/login/send-otp", sendOtpController);
router.post("/login/verify-otp", verifyOtpController);
router.post("/check-status",checkUserStatus)
router.get("/check-reset-token", checkResetToken);

router.post("/login",login)
router.post("/reset-password",resetPassword)
router.post("/send-otp",sendOtpForPasswordReset);
router.post("/verify-otp", verifyOtpForPasswordReset);

module.exports = router;
