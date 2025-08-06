const express=require("express");
const {signUp, Login,checkResetToken, resetPassword, updateUserStatus, getAllUsers, getUserById, deleteUser, addSellerByAdmin, addBuyerByAdmin, getMonthlyBuyerSellerStats, getUserCounts, getPendingUsersByRole, editUserByAdmin, verifyTradeLicense, getPendingTradeLicenses, logOut}=require("../../controllers/admin/authController");
const router=express.Router();
const {sendOtpForPasswordReset,verifyOtpForPasswordReset}=require('../../controllers/otp/otpController')
const { refresh } = require("../../controllers/refresh/globalRefreshController");
const jwtAuthentication = require("../../middleware/jwtAuthentication");
const upload=require("../../middleware/upload");
const compressUploadedImages = require("../../middleware/imageCompressor");

router.post('/signup',signUp);
router.post('/adminlogin',Login);
router.post("/refresh",refresh);

const verifyAdmin = (req, res, next) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
router.post("/logout",logOut)
router.get("/monthly-stats", jwtAuthentication,verifyAdmin, getMonthlyBuyerSellerStats);
router.post("/admin-reset-password", resetPassword);
router.post("/send-otp", sendOtpForPasswordReset);
router.post("/verify-otp", verifyOtpForPasswordReset);
router.get("/get-count", jwtAuthentication,verifyAdmin, getUserCounts);
router.post("/addseller",jwtAuthentication, verifyAdmin, upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "tradeLicenseCopy", maxCount: 1 },
  ]), compressUploadedImages,addSellerByAdmin);
router.post("/addbuyer",jwtAuthentication, upload.single("profileImage"),compressUploadedImages, verifyAdmin, addBuyerByAdmin);
router.post("/verify-user", jwtAuthentication, verifyAdmin, updateUserStatus) ;
router.put("/verify-trade-License/:userId", jwtAuthentication,verifyAdmin, verifyTradeLicense);
router.get("/get-all-users", jwtAuthentication,verifyAdmin, getAllUsers);
router.get("/get-user/:id", jwtAuthentication, verifyAdmin, getUserById);
router.post("/verify-user", jwtAuthentication,verifyAdmin, updateUserStatus);
router.get("/unapproved-users", jwtAuthentication,verifyAdmin, getPendingUsersByRole);
router.delete("/delete-user/:role/:id", jwtAuthentication, verifyAdmin, deleteUser);
router.get("/pending-license", jwtAuthentication, verifyAdmin, getPendingTradeLicenses)
router.put("/edit-user/:id", upload.fields([
    { name: "tradeLicenseCopy", maxCount: 1 },
    { name: "profileImage", maxCount: 1 },
  ]),compressUploadedImages, jwtAuthentication, verifyAdmin, editUserByAdmin);
router.put(
  "/edit-user/:role/:id",
  jwtAuthentication,
  verifyAdmin,
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "tradeLicenseCopy", maxCount: 1 },
  ]),compressUploadedImages,
  editUserByAdmin
);module.exports=router;
