const express=require("express");
const router=express.Router();
const { refresh } = require("../../controllers/refresh/globalRefreshController");
const jwtAuthentication = require("../../middleware/jwtAuthentication");
const { getItemNames, addItemName } = require("../../controllers/itemName/itemNameController");
const { getSubCategories, addSubCategory } = require("../../controllers/itemSubcategory/itemSubCategory");


const verifyAdmin=(req,res,next)=>{
    if(req.user.role==="admin"){
        return next();
    }
    return res.status(403).json("Access denied");
}
router.post("/add-name",jwtAuthentication,verifyAdmin,addItemName

 );
router.get("/get-names", jwtAuthentication,verifyAdmin,getItemNames);

// Subcategory Routes
router.post("/add-subcategory", jwtAuthentication,verifyAdmin, addSubCategory);
router.get("/get-subcategories", jwtAuthentication,verifyAdmin, getSubCategories);

module.exports = router