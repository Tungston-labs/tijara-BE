const express=require("express");
const router=express.Router();
const { refresh } = require("../../controllers/refresh/globalRefreshController");
const jwtAuthentication = require("../../middleware/jwtAuthentication");
const { getItemNames, addItemName } = require("../../controllers/itemName/itemNameController");
const { getSubCategories, addSubCategory } = require("../../controllers/itemSubcategory/itemSubCategory");


const allowAdminOrSeller = (req, res, next) => {
  if (req.user.role === "admin" || req.user.role === "seller") {
    return next();
  }
  return res.status(403).json({ message: "Access denied" });
};
router.post("/add-name",jwtAuthentication,allowAdminOrSeller,addItemName

 );
router.get("/get-names", jwtAuthentication,allowAdminOrSeller,getItemNames);

// Subcategory Routes
router.post("/add-subcategory", jwtAuthentication,allowAdminOrSeller, addSubCategory);
router.get("/get-subcategories", jwtAuthentication,allowAdminOrSeller, getSubCategories);

module.exports = router