const express= require("express");
const { createLocation, getAllLocations } = require("../../controllers/location/locationController");
const router=express.Router()
const jwtAuthentication = require("../../middleware/jwtAuthentication");
const verifyAdmin = (req, res, next) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
router.post('/create-location',createLocation,jwtAuthentication,verifyAdmin);
router.get('/get-location',getAllLocations, jwtAuthentication, verifyAdmin);

module.exports = router;