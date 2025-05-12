const Buyer= require("../../models/Buyer");
const bcrypt= require("bcrypt");
const jwt=require("jsonwebtoken");
const validator = require("validator");


const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]{8,32}$/;


  const registerBuyer = async (req, res, next) => {
    try {
      const { buyerName, phone, email, password } = req.body;
  
      if (!buyerName || !phone || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
      }
  
      const existingBuyer = await Buyer.findOne({ email });
      if (existingBuyer) {
        return res.status(400).json({ message: "Email already registered" });
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
  
      const newBuyer = new Buyer({
        buyerName,
        phone,
        email,
        password: hashedPassword,
        role: "buyer",
      });
  
      await newBuyer.save();
  
      res.status(201).json({ message: "Buyer registered successfully" });
    } catch (error) {
      next(error);
    }
  };
  

const loginBuyer = async (req, res, next) => {
    try {
      const { email, password } = req.body;
  
     
      if (!email || !password) {
        res.status(400);
        throw new Error("Please provide both email and password");
      }
  
      const buyer = await Buyer.findOne({ email });
      if (!buyer) {
        res.status(401);
        throw new Error("Invalid email or password");
      }
  
      const isMatch = await bcrypt.compare(password, buyer.password);
      if (!isMatch) {
        res.status(401);
        throw new Error("Invalid email or password");
      }
    if(buyer.status!=="approved"){
      return res.status(403).json(`Your account is currently ${buyer.status}`)
    }
      
      const accessToken = jwt.sign(
        { id: buyer._id, email: buyer.email, role: buyer.role },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1h" }
      );
  
      const refreshToken = jwt.sign(
        { id: buyer._id, email: buyer.email, role: buyer.role },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" }
      );
  
      
      res.cookie("jwt", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
     
      res.status(200).json({
        message: "Login successful",
        buyerName: buyer.buyerName,
        accessToken,
        buyer:buyer.role,
      });
    } catch (error) {
      next(error); 
    }
  };

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

    const admin = await Buyer.findOne({ email: decoded.email });
    if (!admin) {
      const error = new Error("Buyer not found");
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
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,32}$/;
      if (!passwordRegex.test(newPassword)) {
        const error = new Error(
          "Password must be at least 8 characters long, include an uppercase letter, a lowercase letter, a number, and a special character, and be no more than 32 characters long"
        );
        error.statusCode = 400;
        throw error;
      }
  
      const decoded = jwt.verify(resetToken, process.env.RESET_TOKEN_SECRET);
      const buyer = await Buyer.findOne({ email: decoded.email });
      if (!buyer) {
        const error = new Error("Buyer not found");
        error.statusCode = 404;
        throw error;
      }
  
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      buyer.password = hashedPassword;
      await buyer.save();
  
      res.status(200).json({ message: "Password reset successfully" });
  
    } catch (error) {
      next(error); // Pass to centralized error handler
    }
  };

  const editBuyer = async (req, res, next) => {
    try {
      const buyerId = req.user.id; // ID from JWT
      const updates = req.body;
  
      if (req.user.role !== "buyer") {
        return res.status(403).json({ message: "Unauthorized " });
      }
  
      const updatedBuyer = await Buyer.findByIdAndUpdate(buyerId, updates, { new: true });
  
      if (!updatedBuyer) {
        return res.status(404).json({ message: "Buyer not found" });
      }
  
      res.status(200).json({ message: "Buyer updated successfully", buyer: updatedBuyer });
    } catch (error) {
     next(error);
    }
  };
  
  

  
  module.exports={registerBuyer, loginBuyer,checkResetToken,resetPassword, editBuyer };