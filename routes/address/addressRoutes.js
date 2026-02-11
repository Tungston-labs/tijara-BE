const express = require("express");
const router = express.Router();
const addressController = require("../../controllers/address/addressController");
const jwtAuthentication = require("../../middleware/jwtAuthentication");

router.post("/add", jwtAuthentication, addressController.addAddress);
router.get("/get", jwtAuthentication, addressController.getUserAddresses);
router.put("/:id", jwtAuthentication, addressController.updateAddress);
router.delete("/:id", jwtAuthentication, addressController.deleteAddress);

module.exports = router;
