const express= require("express");
const { registerBuyer, loginBuyer, resetPassword, editBuyer, getBuyerProfile } = require("../../controllers/buyer/buyerController");
const router= express.Router();
const { refresh } = require("../../controllers/refresh/globalRefreshController");
const jwtAuthentication = require("../../middleware/jwtAuthentication");
const upload=require("../../middleware/upload");
const compressUploadedImages = require("../../middleware/imageCompressor");
router.post("/refresh",refresh);

router.post(
  "/buyer-sign-up",
  upload.fields([{ name: "profileImage", maxCount: 1 }]),
  compressUploadedImages,
  registerBuyer
);

router.post("/refresh-buyer", refresh);
router.put("/edit/:id", jwtAuthentication,   upload.fields([{ name: "profileImage", maxCount: 1 }]),
compressUploadedImages, editBuyer);
router.get("/profile", jwtAuthentication, getBuyerProfile);

module.exports = router;