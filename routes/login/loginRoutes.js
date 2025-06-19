const express = require("express");
const { sendOtpController, verifyOtpController, login, resetPassword } = require("../../controllers/Login/loginController");
const { checkUserStatus } = require("../../controllers/admin/authController");
const router = express.Router();

router.post("/login/send-otp", sendOtpController);
router.post("/login/verify-otp", verifyOtpController);
router.post("/check-status",checkUserStatus)


router.post("/login",login)
router.post("/reset-password",resetPassword)


module.exports = router;
