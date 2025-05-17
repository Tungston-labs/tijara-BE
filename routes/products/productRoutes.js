const express = require("express");
const router = express.Router();

const upload = require("../../middleware/upload");
const jwtAuthentication = require("../../middleware/jwtAuthentication");
const {  addProduct, getAllProducts, getProductById, updateProduct, deleteProduct } = require("../../controllers/products/productController");

// Middleware to allow only admin or seller
const allowAdminOrSeller = (req, res, next) => {
  if (req.user.role === "admin" || req.user.role === "seller") {
    return next();
  }
  return res.status(403).json({ message: "Access denied" });
};

// Route: add product
router.post(
    "/add-product",
    jwtAuthentication,
    allowAdminOrSeller,
    (req, res, next) => {
      req.uploadFolder = "product-images/"; 
      next();
    },
    upload.array("images", 4), 
   addProduct
  );
  router.get("/get-products", jwtAuthentication, allowAdminOrSeller, getAllProducts);
  router.get("/get-productsbyid/:id", jwtAuthentication, allowAdminOrSeller, getProductById);
  router.put("/update/:id", jwtAuthentication, upload.array("images", 5), allowAdminOrSeller, updateProduct); 
  router.delete("/delete-product/:id",jwtAuthentication, allowAdminOrSeller,deleteProduct)
  

module.exports = router;
