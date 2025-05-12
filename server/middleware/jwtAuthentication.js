const jwt = require("jsonwebtoken");
const userModels = require("../utils/userModals"); // adjust path if needed
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
        return res.status(404).json({ message: "Unauthorized" });
      }

      req.user = decoded;
      next();
    } catch (dbErr) {
      console.error("DB error:", dbErr);
      return res.status(500).json({ message: "Server Error" });
    }
  });
};


module.exports = jwtAuthentication;
