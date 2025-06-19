const express=require("express");
const router=express.Router();
const upload=require("../../middleware/upload");
const { registerSeller, loginSeller, resetPassword,checkResetToken, editSeller, getSellerProfile } = require("../../controllers/seller/sellerController");
const { refresh } = require("../../controllers/refresh/globalRefreshController");
const {sendOtpForPasswordReset,verifyOtpForPasswordReset}=require('../../controllers/otp/otpController');
const jwtAuthentication = require("../../middleware/jwtAuthentication");
const compressUploadedImages = require("../../middleware/imageCompressor");
const { checkUserStatus } = require("../../controllers/admin/authController");


router.post("/refresh",refresh);


router.post("/seller-register",  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "tradeLicenseCopy", maxCount: 1 },
  ]),compressUploadedImages,
  registerSeller
);
router.post("/refresh-seller", refresh)
router.post("/seller-send-otp", sendOtpForPasswordReset);
router.post("/seller-verify-otp", verifyOtpForPasswordReset);
router.put("/edit/:id", jwtAuthentication, upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "tradeLicenseCopy", maxCount: 1 },
  ]), compressUploadedImages ,editSeller);
router.get("/profile", jwtAuthentication, getSellerProfile);



module.exports=router;