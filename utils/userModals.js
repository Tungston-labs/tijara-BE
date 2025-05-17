const Admin = require("../models/Admin");
const User = require("../models/User");

const userModels = {
  admin: Admin,
  seller: User,  // Both seller and buyer point to User model
  buyer: User,
};

module.exports = userModels;
