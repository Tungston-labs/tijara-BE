const express=require("express");
const router=express.Router();
const upload=require("../../middleware/upload");
const { registerSeller, loginSeller, resetPassword,checkResetToken, editSeller } = require("../../controllers/seller/sellerController");
const { refresh } = require("../../controllers/refresh/globalRefreshController");
const {sendOtpForPasswordReset,verifyOtpForPasswordReset}=require('../../controllers/otp/otpController');
const jwtAuthentication = require("../../middleware/jwtAuthentication");


router.post("/seller-register", upload.single("tradeLicenseCopy"), registerSeller);
router.post("/seller-login", loginSeller);
router.post("/refresh-seller", refresh)
router.post("/seller-send-otp", sendOtpForPasswordReset);
router.post("/seller-verify-otp", verifyOtpForPasswordReset);
router.post("/seller-reset-password", resetPassword);
router.put("/edit/:id", jwtAuthentication, editSeller);

module.exports=router;