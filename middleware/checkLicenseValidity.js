
const User = require("../models/User");

const checkLicenseValidity = async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  if (
    user.role === "seller" &&
    user.tradeLicenseStatus === "Yes" &&
    new Date(user.tradeLicenseExpiry) <= new Date()
  ) {
    // License expired: demote to buyer
    user.role = "buyer";
    user.tradeLicenseStatus = "Expired";
    await user.save();
    return res.status(403).json({ message: "Trade license expired. You're no longer authorized to sell." });
  }

  next();
};
module.exports=checkLicenseValidity;