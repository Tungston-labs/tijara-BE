const jwt = require("jsonwebtoken");
const userModels = require("../utils/userModals");
require("dotenv").config();

const jwtAuthentication = async (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { id, role } = decoded;

    const UserModel = userModels[role];
    if (!UserModel) {
      return res.status(403).json({ message: "Invalid user role" });
    }

    try {
      const user = await UserModel.findById(id);
      if (!user) {
        return res.status(401).json({ message: "User no longer exists" });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error("DB error:", error);
      return res.status(500).json({ message: "Server Error" });
    }
  });
};

module.exports = jwtAuthentication;
