const express=require("express");
const router=express.Router();
const { refresh } = require("../../controllers/refresh/globalRefreshController");
const jwtAuthentication = require("../../middleware/jwtAuthentication");
const { createOrderRequest, updateOrderStatus } = require('../../controllers/Order/orderController');
const userModels=require ("../../utils/userModals");

const verifySeller=(req,res,next)=>{
 if (req.user.role!=="seller"){
    return res.status(403).json({ message: "Access denied" })
}
next();
}

router.post("/request-order", jwtAuthentication, createOrderRequest);
router.patch("/approve-order/:orderId", jwtAuthentication, verifySeller, updateOrderStatus);

module.exports = router;