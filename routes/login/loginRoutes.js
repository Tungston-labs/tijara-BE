const express = require("express");
const { sendOtpController, verifyOtpController, login, resetPassword, checkResetToken, refresh, addTradeLicenseDetails, registerUser } = require("../../controllers/Login/loginController");
const { checkUserStatus } = require("../../controllers/admin/authController");
const { sendOtpForPasswordReset, verifyOtpForPasswordReset } = require("../../controllers/otp/otpController");
const jwtAuthentication = require("../../middleware/jwtAuthentication");
const upload=require("../../middleware/upload");
const router = express.Router();

router.post(
  "/user-sign-up",
  upload.fields([{ name: "profileImage", maxCount: 1 }]),
  compressUploadedImages,
  registerUser
);
router.put("/add-trade-license", jwtAuthentication, upload.fields([{ name: "tradeLicenseCopy", maxCount: 1 }]), addTradeLicenseDetails);

router.post("/login/send-otp", sendOtpController);
router.post("/login/verify-otp", verifyOtpController);
router.post("/check-status",checkUserStatus)
router.get("/check-reset-token", checkResetToken);
router.post("add-trade-license", jwtAuthentication ,upload.fields([{ name: "tradeLicenseCopy", maxCount: 1 }]), addTradeLicenseDetails)
router.post("/login",login)
router.post("/reset-password",resetPassword)
router.post("/send-otp",sendOtpForPasswordReset);
router.post("/verify-otp", verifyOtpForPasswordReset);
router.post("/refresh-token",refresh)
module.exports = router;
