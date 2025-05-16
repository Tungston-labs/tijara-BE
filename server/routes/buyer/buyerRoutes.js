const express= require("express");
const { registerBuyer, loginBuyer, resetPassword, editBuyer } = require("../../controllers/buyer/buyerController");
const {sendOtpForPasswordReset,verifyOtpForPasswordReset}=require('../../controllers/otp/otpController')
const router= express.Router();
const { refresh } = require("../../controllers/refresh/globalRefreshController");
const jwtAuthentication = require("../../middleware/jwtAuthentication");
const upload=require("../../middleware/upload");
router.post("/refresh",refresh);


router.post(
  "/buyer-sign-up",
  (req, res, next) => {
    req.uploadFolder = "uploads/profile"; 
    next();
  },
  upload.single("profileImage"),
  registerBuyer
);
router.post("/buyer-login",loginBuyer);
router.post("/send-otp",sendOtpForPasswordReset);
router.post("/verify-otp", verifyOtpForPasswordReset);
router.post("/buyer-reset-password", resetPassword);
router.post("/refresh-buyer", refresh);
router.put("/edit/:id", jwtAuthentication, editBuyer);

module.exports = router;