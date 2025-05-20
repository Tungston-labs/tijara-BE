const Product = require('../../models/Products');
const Order = require('../../models/Order');
const User = require("../../models/User");

const { notifySellerOfOrder, notifyBuyerOnAcceptance } = require("../../controllers/notification/notificationController");

const createOrderRequest = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    const { id: userId, role } = req.user;

    // Prevent admins from placing orders
    if (role === "admin") {
      return res.status(403).json({ message: "Admins are not allowed to place orders" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Prevent ordering own product
    if (String(product.addedBy) === String(userId)) {
      return res.status(400).json({ message: "You cannot order your own product" });
    }

    // Ensure product was added by a seller
    if (product.addedByModel !== "User") {
      return res.status(400).json({ message: "Product was not listed by a seller" });
    }

    // Optional: Check if requested quantity is available
    if (product.availableKg < quantity) {
      return res.status(400).json({ message: "Insufficient stock available" });
    }

    const order = new Order({
      product: product._id,
      buyer: userId,
      seller: product.addedBy,
      quantity,
      status: "pending"
    });

    await order.save();

    // 🔔 Notify seller
    const buyer = await User.findById(userId);
    const seller = await User.findById(product.addedBy);
    await notifySellerOfOrder(buyer, seller, product, quantity);

    res.status(201).json({ message: "Order request sent to seller", order });
  } catch (err) {
    next(err);
  }
};


const updateOrderStatus = async (req, res, next) => {
  try {
    const { id: userId, role } = req.user;
    const { orderId } = req.params;
    const { status } = req.body;

    // Only "approved" or "rejected" allowed
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    // Only sellers can update orders
    if (role !== "seller") {
      return res.status(403).json({ message: 'Only sellers can update order status' });
    }

    const order = await Order.findById(orderId).populate('product');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (String(order.seller) !== userId) {
      return res.status(403).json({ message: 'You are not authorized to update this order' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ message: `Order already ${order.status}` });
    }

    if (status === 'approved') {
      const product = order.product;

      if (product.availableKg < order.quantity) {
        return res.status(400).json({ message: 'Not enough quantity in stock' });
      }

      product.availableKg -= order.quantity;
      await product.save();
    }

    order.status = status;
    await order.save();

    // 🔔 Notify buyer if approved
    if (status === 'approved') {
      const buyer = await User.findById(order.buyer);
      const seller = await User.findById(userId);
      await notifyBuyerOnAcceptance(seller, buyer, order.product, order.quantity);
    }

    res.status(200).json({ message: `Order ${status}`, order });
  } catch (err) {
    next(err);
  }
};

module.exports = { createOrderRequest, updateOrderStatus };
