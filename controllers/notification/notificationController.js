const admin = require("../../config/firebaseAdmin");
const Notification = require("../../models/Notification");
const User = require("../../models/User");
const Product = require("../../models/Products");

const sendNotification = async (fcmToken, title, body, data = {}) => {
  const message = {
    token:fcmToken,
    notification: {
      title,
      body,
    },
    data: {
      ...data, 
    },
  };
  console.log("Sending to token:", fcmToken);

  try {
    const response = await admin.messaging().send(message);
    console.log("Push notification sent:", response);
  } catch (error) {
    console.error("Push notification error:", error);
  }
};
const notifySellerOfOrder = async (buyer, seller, product, quantity) => {
  const title = "New Order";
  const message = `${buyer.name} requested ${quantity}kg of ${product.itemName}`;

  // Save to DB
  await Notification.create({
    sender: buyer._id,
    recipient: seller._id,
    title,
    message,
    type: "order",
    metadata: { productId: product._id, quantity }
  });

  // Push notification
  if (seller.fcmToken) {
    await sendNotification(seller.fcmToken, title, message, {
      type: "order",
      productId: product._id.toString(),
    });
  }
};

const notifyBuyerOnAcceptance = async (seller, buyer, product, quantity) => {
  const title = "Order Accepted";
  const message = `${seller.name} accepted your request for ${quantity}kg of ${product.itemName}`;

  await Notification.create({
    sender: seller._id,
    recipient: buyer._id,
    title,
    message,
    type: "order_update",
    metadata: { productId: product._id, quantity }
  });

  if (buyer.fcmToken) {
    await sendNotification(buyer.fcmToken, title, message, {
      type: "order_update",
      productId: product._id.toString(),
    });
  }
};
const sendOrderNotification = async (req, res, next) => {
  try {
    const { buyerId, sellerId, productId, quantity } = req.body;

    const buyer = await User.findById(buyerId);
    const seller = await User.findById(sellerId);
    const product = await Product.findById(productId);

    if (!buyer || !seller || !product) {
      return res.status(404).json({ message: "Invalid buyer, seller, or product ID" });
    }

    await notifySellerOfOrder(buyer, seller, product, quantity);
    res.status(200).json({ message: "Notification sent to seller" });
  } catch (error) {
      next(error);

  }
};

const sendAcceptanceNotification = async (req, res, next) => {
  try {
    const { sellerId, buyerId, productId, quantity } = req.body;

    const buyer = await User.findById(buyerId);
    const seller = await User.findById(sellerId);
    const product = await Product.findById(productId);

    if (!buyer || !seller || !product) {
      return res.status(404).json({ message: "Invalid buyer, seller, or product ID" });
    }

    await notifyBuyerOnAcceptance(seller, buyer, product, quantity);
    res.status(200).json({ message: "Notification sent to buyer" });
  } catch (error) {
    next(error);
  }
};

module.exports = { sendNotification,notifySellerOfOrder,notifyBuyerOnAcceptance,sendOrderNotification,sendAcceptanceNotification };
