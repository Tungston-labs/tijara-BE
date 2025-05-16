const express=require("express");
const router=express.Router();
const upload=require("../../middleware/upload");
const { registerSeller, loginSeller, resetPassword,checkResetToken, editSeller } = require("../../controllers/seller/sellerController");
const { refresh } = require("../../controllers/refresh/globalRefreshController");
const {sendOtpForPasswordReset,verifyOtpForPasswordReset}=require('../../controllers/otp/otpController');
const jwtAuthentication = require("../../middleware/jwtAuthentication");


router.post("/refresh",refresh);


router.post("/seller-register",  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "tradeLicenseCopy", maxCount: 1 },
  ]),
  registerSeller
);
router.post("/seller-login", loginSeller);
router.post("/refresh-seller", refresh)
router.post("/seller-send-otp", sendOtpForPasswordReset);
router.post("/seller-verify-otp", verifyOtpForPasswordReset);
router.post("/seller-reset-password", resetPassword);
router.put("/edit/:id", jwtAuthentication, upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "tradeLicenseCopy", maxCount: 1 },
  ]), editSeller);

module.exports=router;