const Product = require('../../models/Products');
const Order = require('../../models/Order');
const Seller = require('../../models/Seller');
const Buyer=require("../../models/Buyer");

const createOrderRequest = async (req, res, next) => {
    try {
      const { productId, quantity } = req.body;
      const { id: buyerId } = req.user;
  
      const product = await Product.findById(productId);
      if (!product) return res.status(404).json({ message: 'Product not found' });
  
      if (product.addedByModel !== 'Seller') {
        return res.status(400).json({ message: 'Product was not listed by a seller' });
      }
  
      const sellerId = product.addedBy;
  
      const order = new Order({
        product: product._id,
        buyer: buyerId,
        seller: sellerId,
        quantity,
        status: 'pending'
      });
  
      await order.save();
  
      res.status(201).json({ message: 'Order request sent to seller', order });
    } catch (err) {
      next(err);
    }
  };
  

const updateOrderStatus = async (req, res, next) => {
    try {
      const { id: sellerId } = req.user;
      const { orderId } = req.params;
      const { status } = req.body; 
  
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status value' });
      }
  
      const order = await Order.findById(orderId);
     
      if (!order) return res.status(404).json({ message: 'Order not found' });
      console.log("Fetched order:", order);

      if (order.seller.toString() !== sellerId) {
        return res.status(403).json({ message: 'You are not authorized to update this order' });
      }
    
      order.status = status;
      await order.save();
  
      res.status(200).json({ message: `Order ${status}`, order });
    } catch (err) {
     next(err)
  };
}
module.exports = {createOrderRequest, updateOrderStatus};