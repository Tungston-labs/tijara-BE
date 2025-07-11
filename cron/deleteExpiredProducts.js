const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const Product = require("../models/Products");

cron.schedule("0 0 * * *", async () => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    const expiredProducts = await Product.find({ createdAt: { $lt: sevenDaysAgo } });

    for (const product of expiredProducts) {
      // Delete associated image files
      if (product.images && product.images.length > 0) {
        product.images.forEach((imagePath) => {
          const fullPath = path.join(__dirname, "..", "public", imagePath);
          fs.unlink(fullPath, (err) => {
            if (err) {
              console.error("Failed to delete image:", fullPath);
            }
          });
        });
      }

      // Delete product from database
      await Product.deleteOne({ _id: product._id });
    }

    if (expiredProducts.length > 0) {
      console.log(` ${expiredProducts.length} expired products deleted successfully.`);
    }
  } catch (err) {
    console.error(" Product cleanup failed:", err.message);
  }
});



