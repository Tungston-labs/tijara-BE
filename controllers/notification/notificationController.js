const Notification = require("../models/Notification");
const { sendNotification } = require("./notificationController");

const notifySellerOfOrder = async (buyer, seller, product, quantity) => {
  const title = "New Order";
  const message = `${buyer.name} requested ${quantity}kg of ${product.name}`;

  // 1. Save to DB
  await Notification.create({
    sender: buyer._id,
    recipient: seller._id,
    title,
    message,
    type: "order",
    metadata: { productId: product._id, quantity }
  });

  // 2. Send push
  if (seller.fcmToken) {
    await sendNotification(seller.fcmToken, title, message, {
      type: "order",
      productId: product._id.toString()
    });
  }
};
