const Admin = require("../../models/Admin");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const SubscriptionHistory = require("../../models/SubscriptionHistory");
const User = require("../../models/User");
const userModels = require("../../utils/userModals");
const SubscriptionPlan = require("../../models/SubscriptionPlan");
const {
  validateName,
  validateEmail,
  validatePassword,
  validatePhone,
} = require("../../utils/validator");

const signUp = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400);
      throw new Error("Please fill all the fields");
    }

    console.log("Received body:", req.body);

    if (!validateName(username)) {
      res.status(400);
      throw new Error(
        "Username must be 3-50 characters long and contain only letters or numbers."
      );
    }

    if (!validatePassword(password)) {
      res.status(400);
      throw new Error(
        "Password must be 8-32 characters and include uppercase, lowercase, number, and special character."
      );
    }

    const existingUser = await Admin.findOne({ email });
    if (existingUser) {
      res.status(400);
      throw new Error("Email already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = new Admin({
      username,
      email,
      password: hashedPassword,
      role: "admin",
    });
    await admin.save();

    const accessToken = jwt.sign(
      { id: admin._id, email: admin.email },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { id: admin._id, email: admin.email },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("jwt", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: process.env.NODE_ENV === "production" ? "Strict" : "Lax",
    });

    return res.status(201).json({
      message: "User created successfully",
      username: admin.username,
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

// ..For admin login

const Login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error("Please enter both email and password");
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      res.status(400);
      throw new Error("Invalid email or password");
    }

    const isValidPassword = await bcrypt.compare(password, admin.password);
    if (!isValidPassword) {
      res.status(400);
      throw new Error("Invalid email or password");
    }

    const accessToken = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("jwt", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: process.env.NODE_ENV === "production" ? "Strict" : "Lax",
    });

    return res.status(200).json({
      message: "Login successful",
      accessToken,
      user: {
        userName: admin.username,
        role: admin.role,
        email: admin.email,
        id: admin._id,
      },
    });
  } catch (error) {
    next(error);
  }
};

//Get user counts

const getUserCounts = async (req, res, next) => {
  try {
    const [totalBuyers, pendingBuyers, totalSellers, pendingSellers] =
      await Promise.all([
        User.countDocuments({ role: "buyer" }),
        User.countDocuments({ role: "buyer", status: "pending" }),
        User.countDocuments({ role: "seller" }),
        User.countDocuments({ role: "seller", status: "pending" }),
      ]);

    return res.status(200).json({
      totalBuyers,
      pendingBuyers,
      totalSellers,
      pendingSellers,
      pendingApprovals: pendingBuyers + pendingSellers,
    });
  } catch (error) {
    next(error);
  }
};

//For restting the Password

const checkResetToken = async (req, res, next) => {
  try {
    const resetToken = req.cookies?.resetToken;

    if (!resetToken) {
      const error = new Error("Unauthorized or token expired");
      error.statusCode = 401;
      throw error;
    }

    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.RESET_TOKEN_SECRET);
    } catch (err) {
      err.statusCode = 401;
      err.message = "Invalid or expired token";
      throw err;
    }

    const admin = await Admin.findOne({ email: decoded.email });
    if (!admin) {
      const error = new Error("Admin not found");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({ message: "Token verified" });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword) {
      const error = new Error("New password is required");
      error.statusCode = 400;
      throw error;
    }
    const resetToken = req.cookies?.resetToken;
    if (!resetToken) {
      const error = new Error("Unauthorized or token is required");
      error.statusCode = 401;
      throw error;
    }

    // Password validation regex (adjust according to your requirements)
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,32}$/;
    if (!passwordRegex.test(newPassword)) {
      const error = new Error(
        "Password must be at least 8 characters long, include an uppercase letter, a lowercase letter, a number, and a special character, and be no more than 32 characters long"
      );
      error.statusCode = 400;
      throw error;
    }

    const decoded = jwt.verify(resetToken, process.env.RESET_TOKEN_SECRET);
    const admin = await Admin.findOne({ email: decoded.email });
    if (!admin) {
      const error = new Error("Admin not found");
      error.statusCode = 404;
      throw error;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    admin.password = hashedPassword;
    await admin.save();

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    next(error);
  }
};

//Register buyer by admin

const addBuyerByAdmin = async (req, res, next) => {
  try {
    const { name, phone, email, password } = req.body;

    console.log("File received:", req.file);
    console.log("Request body:", req.body);

    // Extract profileImage path from req.file
    const profileImage = req.file
      ? `${req.protocol}://${req.get("host")}/uploads/users/buyers/${
          req.file.filename
        }`
      : null;

    if (!name || !phone || !email || !password || !profileImage) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!validateName(name)) {
      return res.status(400).json({ message: "Invalid name format" });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    if (!validatePhone(phone)) {
      return res.status(400).json({ message: "Invalid phone number" });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        message:
          "Password must be 8–32 characters, with uppercase, lowercase, number, and special character",
      });
    }

    const existingBuyer = await User.findOne({ email });
    if (existingBuyer) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newBuyer = new User({
      name,
      phone,
      email,
      password: hashedPassword,
      profileImage,
      role: "buyer",
    });

    await newBuyer.save();

    // Exclude the password in the response
    const { password: _, ...buyerData } = newBuyer.toObject();
    res.status(201).json({
      message: "Buyer registered successfully",
      buyer: buyerData,
    });
  } catch (error) {
    next(error);
  }
};

// Register Seller by admin

const addSellerByAdmin = async (req, res, next) => {
  try {
    const cleanBody = { ...req.body };

    const {
      name,
      email,
      password,
      phone,
      companyName,
      tradeLicenseNumber,
      managerName,
    } = cleanBody;

    // Check required fields
    if (
      !name ||
      !email ||
      !password ||
      !phone ||
      !companyName ||
      !tradeLicenseNumber ||
      !managerName ||
      !req.files ||
      !req.files.tradeLicenseCopy ||
      !req.files.profileImage
    ) {
      return res.status(400).json({
        message:
          "All fields including trade license copy and profile image are required",
      });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const tradeLicensePath = `${baseUrl}/uploads/licenses/${req.files.tradeLicenseCopy[0].filename}`;
    const profileImagePath = `${baseUrl}/uploads/users/sellers/${req.files.profileImage[0].filename}`;

    // Input validations

    if (!validateName(name)) {
      return res.status(400).json({ message: "Invalid name format" });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    if (!validatePhone(phone)) {
      return res.status(400).json({ message: "Invalid phone number" });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        message:
          "Password must be 8–32 characters, with uppercase, lowercase, number, and special character",
      });
    }

    const existingSeller = await User.findOne({ email });
    if (existingSeller) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newSeller = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      companyName,
      tradeLicenseNumber,
      managerName,
      tradeLicenseCopy: tradeLicensePath,
      profileImage: profileImagePath,
      role: "seller",
    });

    await newSeller.save();
    const { password: _, ...sellerData } = newSeller.toObject();
    res
      .status(201)
      .json({ message: "Seller registered successfully", seller: sellerData });
  } catch (error) {
    console.error("Registration error:", error);
    next(error);
  }
};

// Update the user to login
const updateUserStatus = async (req, res) => {
  const { userId, status } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    return res
      .status(400)
      .json({ message: "Status must be 'approved' or 'rejected'" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.status = status;
    await user.save();

    res
      .status(200)
      .json({ message: `User status updated to ${status}`, user });
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


const getAllUsers = async (req, res, next) => {
  try {
    const { role, search = "", page = 1, limit = 10 } = req.query;

    // Validate role
    if (!["seller", "buyer"].includes(role)) {
      return res
        .status(400)
        .json({ message: "Role must be 'seller' or 'buyer'" });
    }

    // Build query with optional search
    const query = {
      role,
      status: "approved",
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
    };

    const skip = Math.max((parseInt(page) - 1) * parseInt(limit), 0);

    // Count and get paginated users
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("assignedAgent", "name phone email")
      .lean();

    // Attach the latest subscription to each user
    const usersWithSubscriptions = await Promise.all(
      users.map(async (user) => {
        const latestSubscription = await SubscriptionHistory.findOne({
          user: user._id,
        })
          .sort({ startDate: -1 })
          .populate("plan", "name duration price description")
          .lean();

        return {
          ...user,
          subscription: latestSubscription || null,
        };
      })
    );

    res.status(200).json({
      users: usersWithSubscriptions,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    next(error);
  }
};

//Get single user

const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: `User not found with ID: ${id}` });
    }

    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
};


//Delete a user

const deleteUser = async (req, res) => {
  const { role, id } = req.params;

  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Unauthorized: Admin only" });
  }

  if (!["seller", "buyer"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  const deleted = await User.findOneAndDelete({ _id: id, role });
  if (!deleted) {
    return res.status(404).json({ message: `${role} not found` });
  }

  res.status(200).json({ message: `${role} deleted successfully` });
};

const getPendingUsersByRole = async (req, res) => {
  const { role, search = "", page = 1, limit = 10 } = req.query;

  if (!["buyer", "seller"].includes(role)) {
    return res.status(400).json({ message: "Invalid role provided" });
  }

  const searchRegex = new RegExp(search, "i");

  try {
    const query = {
      role,
      status: "pending",
      $or: [{ name: searchRegex }, { email: searchRegex }],
    };

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    res.status(200).json({
      data: users,
      currentPage: Number(page),
      totalPages: Math.ceil(total / limit),
      totalResults: total,
    });
  } catch (error) {
    console.error("Error fetching pending users:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Create new plan (Admin only)
const createSubscriptionPlan = async (req, res, next) => {
  try {
    const { name, duration, price, description } = req.body;

    // Validate required fields
    if (!name || !duration || !price || !description) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!["monthly", "annually"].includes(duration)) {
      return res
        .status(400)
        .json({ message: "Invalid duration. Must be 'monthly' or 'annually'" });
    }

    // Check for duplicate plan name
    const existing = await SubscriptionPlan.findOne({ name });
    if (existing) {
      return res
        .status(409)
        .json({ message: "Plan with this name already exists" });
    }

    const newPlan = new SubscriptionPlan({
      name,
      duration,
      price,
      description,
    });

    await newPlan.save();

    res
      .status(201)
      .json({ message: "Subscription plan created", plan: newPlan });
  } catch (error) {
    next(error);
  }
};

// Update plan (Admin only)
const updatePlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await SubscriptionPlan.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (!updated) return res.status(404).json({ message: "Plan not found" });

    res.status(200).json({ message: "Plan updated", plan: updated });
  } catch (err) {
    next(err);
  }
};

// Delete plan (Admin only)
const deletePlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await SubscriptionPlan.findByIdAndDelete(id);

    if (!deleted) return res.status(404).json({ message: "Plan not found" });

    res.status(200).json({ message: "Plan deleted" });
  } catch (err) {
    next(err);
  }
};
const editUserByAdmin = async (req, res) => {
  const { role, id } = req.params; // Get role and id from URL params
  const updates = req.body;
  const files = req.files;

  console.log("updates body:", updates);

  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Optionally check if the role param matches user's role (extra validation)
    if (user.role !== role) {
      return res.status(400).json({ message: "Role does not match the user" });
    }

    const commonFields = ["name", "email", "phone", "status"];
    const sellerFields = ["companyName", "managerName", "tradeLicenseNumber"];

    // Update common fields
    commonFields.forEach((field) => {
      if (updates && updates[field] !== undefined) user[field] = updates[field];
    });

    if (user.role === "seller") {
      sellerFields.forEach((field) => {
        if (updates && updates[field] !== undefined)
          user[field] = updates[field];
      });

      if (files?.tradeLicenseCopy?.[0]) {
        user.tradeLicenseCopy = `${baseUrl}/uploads/licenses/${files.tradeLicenseCopy[0].filename}`;
      }
    }

    if (files?.profileImage?.[0]) {
      user.profileImage = `${baseUrl}/uploads/users/${user.role}s/${files.profileImage[0].filename}`;
    }

    const updatedUser = await user.save();
    res
      .status(200)
      .json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Admin edit user error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
const checkUserStatus = async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    const user = await User.findById(id).select("_id email status role");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      id: user._id,
      email: user.email,
      status: user.status,
      role: user.role,
    });
  } catch (err) {
    console.error("Error fetching user status:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
const verifyTradeLicense = async (req, res) => {
  const { userId } = req.params;
  const { action } = req.body; // "approve" or "reject"

  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({ message: "Invalid action. Must be 'approve' or 'reject'." });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.tradeLicenseStatus === "not_uploaded") {
      return res.status(400).json({ message: "User has not uploaded trade license details." });
    }

    // Optional: check expiry logic before approving
    if (action === "approve") {
      if (!user.tradeLicenseExpiry || new Date(user.tradeLicenseExpiry) < new Date()) {
        return res.status(400).json({ message: "Cannot approve expired trade license." });
      }

      user.tradeLicenseStatus = "approved";
      user.role = "seller";
    } else {
      user.tradeLicenseStatus = "rejected";
      user.role = "buyer"; // fallback
    }

    await user.save();

    return res.status(200).json({
      message: `User's trade license ${action}d successfully.`,
      user: {
        _id: user._id,
        role: user.role,
        tradeLicenseStatus: user.tradeLicenseStatus,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Error verifying trade license:", error.message);
    return res.status(500).json({ message: "Internal server error." });
  }
};

const getPendingTradeLicenses = async (req, res, next) => {
  try {
    const pendingUsers = await User.find({ tradeLicenseStatus: "pending" })
      .select(
        "name email phone role tradeLicenseStatus companyName tradeLicenseNumber managerName tradeLicenseCopy tradeLicenseExpiry createdAt"
      )
      .sort({ createdAt: -1 }); // Optional: newest first

    if (!pendingUsers || pendingUsers.length === 0) {
      return res
        .status(200)
        .json({ message: "No pending trade licenses found.", users: [] });
    }

    return res.status(200).json({
      message: "Pending trade license users fetched successfully.",
      users: pendingUsers,
    });
  } catch (error) {
    next(error);
  }
};


module.exports = {
  signUp,
  Login,
  checkResetToken,
  resetPassword,
  updateUserStatus,
  getAllUsers,
  getUserById,
  deleteUser,
  addSellerByAdmin,
  addBuyerByAdmin,
  getUserCounts,
  getPendingUsersByRole,
  createSubscriptionPlan,
  updatePlan,
  deletePlan,
  editUserByAdmin,
  getPendingTradeLicenses,
  verifyTradeLicense,
  checkUserStatus,
};
