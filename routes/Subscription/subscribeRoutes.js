const express = require('express');
const router = express.Router();
const jwtAuthentication = require('../../middleware/jwtAuthentication');
const userModels=require ("../../utils/userModals");

const {
  subscribeToPlan,
  cancelSubscription,
  getCurrentSubscription,
  getSubscriptionHistory,
  getAllPlans,
  getSinglePlan,
} = require("../../controllers/Subscription/subscriptionController");
const {  updatePlan, deletePlan, createSubscriptionPlan } = require('../../controllers/admin/authController');

const verifyAdmin=(req,res,next)=>{
    if(req.user.role==="admin"){
        return next();
    }
    return res.status(403).json("Access denied");
}

router.post("/subscribe", jwtAuthentication, subscribeToPlan);
router.post("/cancel", jwtAuthentication, cancelSubscription);
router.get("/current", jwtAuthentication, getCurrentSubscription);
router.get("/history", jwtAuthentication, getSubscriptionHistory);


router.post("/addplan",jwtAuthentication,verifyAdmin, createSubscriptionPlan);
router.put("/updateplan/:id",jwtAuthentication,verifyAdmin, updatePlan);
router.post("/deleteplan/:id",jwtAuthentication,verifyAdmin, deletePlan);
router.post("/getallplans", jwtAuthentication,getAllPlans);
router.post("/getsingleplan/:id", jwtAuthentication ,getSinglePlan);

module.exports = router;
