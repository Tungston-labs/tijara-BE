const Admin = require("../../models/Admin");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const Buyer = require("../../models/Buyer");
const Seller = require("../../models/Seller");
const userModels = require("../../utils/userModals");


const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]{8,32}$/;

// For admin signup

const signUp = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400);
      throw new Error("Please fill all the fields");
    }

    console.log("Received body:", req.body);

    if (!usernameRegex.test(username)) {
      res.status(400);
      throw new Error("Username must be valid");
    }
    if (!passwordRegex.test(password)) {
      res.status(400);
      throw new Error("Password must be valid");
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
    next(error); // Send error to centralized error handler
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
      username: admin.username,
      accessToken,
      role: admin.role,
    });
  } catch (error) {
    next(error);
  }
};


const getUserCounts = async (req, res) => {
  try {
    const [
      totalBuyers,
      pendingBuyers,
      totalSellers,
      pendingSellers
    ] = await Promise.all([
      Buyer.countDocuments(),
      Buyer.countDocuments({ status: "pending" }),
      Seller.countDocuments(),
      Seller.countDocuments({ status: "pending" })
    ]);

    return res.status(200).json({
      totalBuyers,
      pendingBuyers,
      totalSellers,
      pendingSellers,
      pendingApprovals: pendingBuyers + pendingSellers
    });
  } catch (error) {
    console.error("Error getting user counts:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// const refresh=async(req,res)=>{
//   try {
//       const cookies = req.cookies;
//       if (!cookies || !cookies.jwt) {
//         return res
//           .status(401)
//           .json({ message: "Please login first , unauthorized" });
//       }
//       const refreshToken = cookies.jwt;
//       jwt.verify(
//         refreshToken,
//         process.env.REFRESH_TOKEN_SECRET,
//         async (err, decoded) => {
//           if (err) {
//             return res.status(403).json({ message: "Invalid token" });
//           }
//           const { id } = decoded;
//           const foundUser = await Admin.findById(id);

//           if (!foundUser) {
//             return res.status(404).json({ message: "Admin not found" });
//           }
//           const accessToken = jwt.sign(
//               { id: foundUser._id, email: foundUser.email },
//               process.env.ACCESS_TOKEN_SECRET,
//               { expiresIn: "1h" }
//             );
//            return res.status(200).json({ message: "refresh token successfull", accessToken });
//         }
//       );
//   } catch (error) {
//       console.log(error);
//       return res.status(500).json({ message: "server error" });
//   }
// }

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
    next(error); // Pass to centralized error handler
  }
};

const addBuyerByAdmin = async (req, res) => {
  try {
    const { buyerName, phone, email, password } = req.body;

    // Check if the email already exists
    const existingBuyer = await Buyer.findOne({ email });
    if (existingBuyer) {
      return res.status(400).json({ message: "Buyer already exists with this email" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create and save the new buyer
    const newBuyer = new Buyer({
      buyerName,
      phone,
      email,
      password: hashedPassword,
    });

    await newBuyer.save();

    res.status(201).json({ message: "Buyer added successfully", buyer: newBuyer });
  } catch (error) {
    next(error);
  }
};

// Register Seller
const addSellerByAdmin = async (req, res, next) => {
  try {
    console.log("ddddd",req.body)
      const {
        sellerName,
        email,
        password,
        phone,
        companyName,
        tradeLicenseNumber,
        managerName,
      } = req.body;
  console.log("ddddsfeggdgh",req.file)
      if (
        !sellerName ||
        !email ||
        !password ||
        !phone ||
        !companyName ||
        !tradeLicenseNumber ||
        !managerName ||
        !req.file
      ) {
        return res.status(400).json({ message: "All fields including trade license copy are required" });
      }
  
      // Validations
     
  
      if (!validator.isEmail(email)) {
        return res.status(400).json({ message: "Invalid email address" });
      }
  
      if (!validator.isMobilePhone(phone)) {
        return res.status(400).json({ message: "Invalid phone number" });
      }
  
      if (!passwordRegex.test(password)) {
        return res.status(400).json({
          message:
            "Password must be 8–32 characters, with uppercase, lowercase, number, and special character",
        });
      }
  
      const existingSeller = await Seller.findOne({ email });
      if (existingSeller) {
        return res.status(400).json({ message: "Email already registered" });
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
  
      const newSeller = new Seller({
        sellerName,
        email,
        password: hashedPassword,
        phone,
        companyName,
        tradeLicenseNumber,
        managerName,
        tradeLicenseCopy: req.file.path, // Store file path
      });
  
      await newSeller.save();
  
      res.status(201).json({ message: "Seller registered successfully" });
    } catch (error) {
      next(error);
    }
};

const updateUserStatus = async (req, res) => {
  const { userId, role, status } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    return res
      .status(400)
      .json({ message: "Status must be 'approved' or 'rejected'" });
  }

  const Model = role === "buyer" ? Buyer : role === "seller" ? Seller : null;
  if (!Model) {
    return res.status(400).json({ message: "Invalid role provided" });
  }

  const user = await Model.findById(userId);
  if (!user) {
    return res.status(404).json({ message: `${role} not found` });
  }

  user.status = status;
  await user.save();

  res.status(200).json({ message: `${role} status updated to ${status}` });
};

const getAllUsers = async (req, res, next) => {
  try {
    const { role, search = "", page = 1, limit = 10, status } = req.query;

    if (!["seller", "buyer"].includes(role)) {
      return res
        .status(400)
        .json({ message: "Role must be 'seller' or 'buyer'" });
    }

    const UserModel = userModels[role];
    if (!UserModel) {
      return res.status(404).json({ message: "User model not found" });
    }

    const nameField = role === "seller" ? "sellerName" : "buyerName";

    const query = {
      $or: [
        { [nameField]: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
    };

    if (status) {
      query.status = status;
    }

    const skip = Math.max((parseInt(page) - 1) * parseInt(limit), 0);

    const total = await UserModel.countDocuments(query);
    const users = await UserModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      users,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const { role, id } = req.params;

    if (!["seller", "buyer"].includes(role)) {
      return res
        .status(400)
        .json({ message: "Role must be 'seller' or 'buyer'" });
    }

    const UserModel = userModels[role];
    if (!UserModel) {
      return res.status(404).json({ message: "User model not found" });
    }

    const user = await UserModel.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ message: `${role} not found with ID: ${id}` });
    }

    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
};


const deleteUser = async (req, res) => {
  const { role, id } = req.params;

  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Unauthorized: Admin only" });
  }

  const Model = userModels[role];
  if (!Model) return res.status(400).json({ message: "Invalid role" });

  const deleted = await Model.findByIdAndDelete(id);
  if (!deleted) return res.status(404).json({ message: `${role} not found` });

  res.status(200).json({ message: `${role} deleted successfully` });
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
  getUserCounts
};
