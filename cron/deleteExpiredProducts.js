const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const Product = require("../models/Products"); 
cron.schedule("0 0 * * *", async () => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const expiredProducts = await Product.find({ createdAt: { $lt: sevenDaysAgo } });

  for (const product of expiredProducts) {
    if (product.images && product.images.length > 0) {
      product.images.forEach((imagePath) => {
        const fullPath = path.join(__dirname, "..", "public", imagePath);
        fs.unlink(fullPath, (err) => {
          if (err) console.error(" Error deleting file:", fullPath, err);
          else console.log("🗑️ Deleted file:", fullPath);
        });
      });
    }
    await Product.deleteOne({ _id: product._id });
  }

  console.log(` Cleaned up ${expiredProducts.length} expired products`);
});
