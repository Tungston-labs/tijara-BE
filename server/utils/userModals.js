const Admin = require("../models/Admin");
const Seller = require("../models/Seller");
const Buyer = require("../models/Buyer");

const userModels = {
  admin: Admin,
  seller: Seller,
  buyer: Buyer,
};

module.exports = userModels;
