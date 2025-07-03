const express=require("express");
const router=express.Router();
const upload=require("../../middleware/upload");
const { registerSeller,checkResetToken, editSeller, getSellerProfile } = require("../../controllers/seller/sellerController");
const { refresh } = require("../../controllers/refresh/globalRefreshController");
const jwtAuthentication = require("../../middleware/jwtAuthentication");
const compressUploadedImages = require("../../middleware/imageCompressor");


router.post("/refresh",refresh);


router.post("/seller-register",  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "tradeLicenseCopy", maxCount: 1 },
  ]),compressUploadedImages,
  registerSeller
);
router.post("/refresh-seller", refresh)
router.put("/edit/:id", jwtAuthentication, upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "tradeLicenseCopy", maxCount: 1 },
  ]), compressUploadedImages ,editSeller);
router.get("/profile", jwtAuthentication, getSellerProfile);



module.exports=router;