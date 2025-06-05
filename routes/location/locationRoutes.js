const express= require("express");
const { createLocation, getAllLocations } = require("../../controllers/location/locationController");
const router=express.Router()

router.post('/create-location',createLocation);
router.get('/get-location',getAllLocations);

module.exports = router;