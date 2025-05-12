const Buyer = require("../../models/Buyer");
const Seller = require("../../models/Seller");

const subscribeUser = async (req, res, next) => {
  const { id: userId, role: userType } = req.user;
  const { plan } = req.body;

  const subscriptionDetails = {
    plan,
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    isActive: true,
  };

  try {
    if (userType === "seller") {
      await Seller.findByIdAndUpdate(userId, {
        subscription: subscriptionDetails,
      });
    } else if (userType === "buyer") {
      await Buyer.findByIdAndUpdate(userId, {
        subscription: subscriptionDetails,
      });
    } else {
      return res.status(400).json({ message: "Invalid user type" });
    }

    res.status(200).json({ message: "Subscription successful" });
  } catch (err) {
    next(next);
  }
};
module.exports = { subscribeUser };
