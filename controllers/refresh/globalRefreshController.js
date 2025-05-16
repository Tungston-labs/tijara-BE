const jwt = require("jsonwebtoken");
const userModels = require("../../utils/userModals");

const refresh = async (req, res) => {
  try {
    const cookies = req.cookies;
    if (!cookies?.jwt) {
      return res.status(401).json({ message: "Unauthorized, please login" });
    }

    const refreshToken = cookies.jwt;

    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: "Invalid or expired token" });
      }

      const { id, email, role } = decoded;

      const UserModel = userModels[role];
      if (!UserModel) {
        return res.status(400).json({ message: "Invalid user role" });
      }

      const user = await UserModel.findById(id);
      if (!user || user.email !== email) {
        return res.status(404).json({ message: "User not found" });
      }

      const accessToken = jwt.sign(
        { id: user._id, email: user.email, role },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1h" }
      );

      return res.status(200).json({
        message: "Token refreshed successfully",
        accessToken,
      });
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = { refresh };
