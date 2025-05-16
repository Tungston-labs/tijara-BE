const SubscriptionPlan = require("../../models/SubscriptionPlan");
const UserSubscription = require("../../models/SubscriptionHistory");
const User=require('../../models/User')

// Subscribe to a plan
const subscribeToPlan = async (req, res, next) => {
  try {
    const { id } = req.body;
    const userId = req.user.id;

    const plan = await SubscriptionPlan.findById(id);
    if (!plan) return res.status(404).json({ message: "Subscription plan not found" });

    const now = new Date();
    const endDate = new Date(now);
    if (plan.duration === "monthly") {
      endDate.setMonth(now.getDate() + 7);
    } else if (plan.duration === "annually") {
      endDate.setFullYear(now.getFullYear() + 1);
    }

    // Mark all previous subscriptions as inactive
    await UserSubscription.updateMany({ user: userId, isActive: true }, { isActive: false });

   const subscription = new UserSubscription({
  user: userId,
  plan: plan._id,
  startDate: now,
  endDate,
  isActive: true,
  status: "active",
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

    const currentSub = await UserSubscription.findOne({ user: userId, isActive: true });
       console.log("Active subscription found:", currentSub);

    if (!currentSub) return res.status(404).json({ message: "No active subscription found" });
    currentSub.isActive = false;
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

    const current = await UserSubscription.findOne({ user: userId, isActive: true }).populate("plan");
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

    const history = await UserSubscription.find({ user: userId }).populate("plan").sort({ createdAt: -1 });

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

module.exports = {
  subscribeToPlan,
  cancelSubscription,
  getCurrentSubscription,
  getSubscriptionHistory,
  getAllPlans,
  getSinglePlan,
};
