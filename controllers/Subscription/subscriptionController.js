const SubscriptionPlan = require("../../models/SubscriptionPlan");
const UserSubscription = require("../../models/SubscriptionHistory");
const User=require('../../models/User')

// Subscribe to a plan
const subscribeToPlan = async (req, res, next) => {
  try {
    const { id, paymentType } = req.body;
    const userId = req.user.id;

    const plan = await SubscriptionPlan.findById(id);
    if (!plan) return res.status(404).json({ message: "Subscription plan not found" });

    const now = new Date();
    const endDate = new Date(now);

    if (plan.duration === "monthly") {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (plan.duration === "annually") {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    // Mark previous subscriptions as cancelled
    await UserSubscription.updateMany(
      { user: userId, status: "active" },
      { status: "cancelled" }
    );

    const subscription = new UserSubscription({
      user: userId,
      plan: plan._id,
      startDate: now,
      endDate,
      status: "active",
      paymentType, // e.g., "card", "upi", etc.
      paymentStatus: "completed", // or "pending"/"failed"
    });

    await subscription.save();

    res.status(201).json({ message: "Subscribed successfully", subscription });
  } catch (error) {
    next(error);
  }
};


// Cancel current subscription
const cancelSubscription = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const currentSub = await UserSubscription.findOne({ user: userId, status: "active" });
    if (!currentSub) return res.status(404).json({ message: "No active subscription found" });

    currentSub.status = "cancelled";
    await currentSub.save();

    res.status(200).json({ message: "Subscription cancelled", subscription: currentSub });
  } catch (error) {
    next(error);
  }
};

// Get active subscription for current user
const getCurrentSubscription = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const current = await UserSubscription.findOne({ user: userId,  status: "active" }).populate("plan");
    if (!current) return res.status(404).json({ message: "No active subscription found" });

    res.status(200).json(current);
  } catch (error) {
    next(error);
  }
};

// Get subscription history for current user
const getSubscriptionHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const history = await UserSubscription.find({ user: userId })
      .populate("plan")
      .populate({
        path: "user",
        select: "role name email phone companyName tradeLicenseNumber"
      })
      .sort({ createdAt: -1 });

    res.status(200).json(history);
  } catch (error) {
    next(error);
  }
};


// Get all available plans
const getAllPlans = async (req, res, next) => {
  try {
    const plans = await SubscriptionPlan.find();
    res.status(200).json(plans);
  } catch (error) {
    next(error);
  }
};

// Get a single plan by ID
const getSinglePlan = async (req, res, next) => {
  try {
    const { id } = req.params;

    const plan = await SubscriptionPlan.findById(id);
    if (!plan) {
      return res.status(404).json({ message: "Subscription plan not found" });
    }

    res.status(200).json(plan);
  } catch (error) {
    next(error);
  }
};
const getSubscriptionHistoryByUserId = async (req, res, next) => {
  try {
    // Ensure the current user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { userId } = req.params;

    const history = await UserSubscription.find({ user: userId })
      .populate({
        path: 'user',
        select: 'name email phone role companyName tradeLicenseNumber',
      })
      .populate('plan')
      .sort({ createdAt: -1 });

    res.status(200).json(history);
  } catch (error) {
    next(error);
  }
};


module.exports = {
  subscribeToPlan,
  cancelSubscription,
  getCurrentSubscription,
  getSubscriptionHistory,
  getAllPlans,
  getSinglePlan,
  getSubscriptionHistoryByUserId,
};
