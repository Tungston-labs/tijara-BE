const Seller = require("../../models/Seller");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const validator = require("validator");

// Validation regex
const usernameRegex = /^[a-zA-Z0-9_ ]{3,50}$/;
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]{8,32}$/;

// Register Seller
const registerSeller = async (req, res, next) => {
  try {
    const cleanBody = Object.assign({}, req.body);

    console.log("shshsjsj",req.body)
    const {
      sellerName,
      email,
      password,
      phone,
      companyName,
      tradeLicenseNumber,
      managerName,
    } = cleanBody;

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
    const baseUrl = `${req.protocol}://${req.get('host')}`;

 
    const imagePath = `${baseUrl}/uploads/licenses/${req.file.filename}`;

    
    if (!usernameRegex.test(sellerName)) {
      return res.status(400).json({ message: "Invalid name format" });
    }

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
      tradeLicenseCopy: imagePath, // Store file path
    });

    await newSeller.save();

    res.status(201).json({ message: "Seller registered successfully" });
  } catch (error) {
    next(error);
  }
};

// Login Seller
const loginSeller = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const seller = await Seller.findOne({ email });
    if (!seller) {
      return res.status(404).json({ message: "Seller not found" });
    }
    
    const isMatch = await bcrypt.compare(password, seller.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    if(seller.status !=="approved"){
        return res.status(403).json(`Your account is under ${seller.status}`)
    }
       const accessToken = jwt.sign(
         { id: seller._id, email: seller.email, role:seller.role },
         process.env.ACCESS_TOKEN_SECRET,
         { expiresIn: "1h" }
       );
   
       const refreshToken = jwt.sign(
         { id: seller._id, email: seller.email, role:seller.role },
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
         sellerName: seller.sellerName,
         accessToken,
         role:seller.role
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
  
      const seller = await Seller.findOne({ email: decoded.email });
      if (!seller) {
        const error = new Error("Seller not found");
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
        const seller = await Seller.findOne({ email: decoded.email });
        if (!seller) {
          const error = new Error("Seller not found");
          error.statusCode = 404;
          throw error;
        }
    
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        seller.password = hashedPassword;
        await seller.save();
    
        res.status(200).json({ message: "Password reset successfully" });
    
      } catch (error) {
        next(error); // Pass to centralized error handler
      }
    };

    const editSeller = async (req, res, next) => {
      try {
        const sellerId=req.user.id
        const updates = req.body;
    
        // Ensure user is either the seller themself or admin
        if (req.user.role !== "seller") {
          return res.status(403).json({ message: "Unauthorized" });
        }
    
        const updatedSeller = await Seller.findByIdAndUpdate(sellerId, updates, { new: true });
        if (!updatedSeller) {
          return res.status(404).json({ message: "Seller not found" });
        }
    
        res.status(200).json({ message: "Seller updated successfully", seller: updatedSeller });
      } catch (error) {
        next(error);
      }
    };

    
module.exports = {
  registerSeller,
  loginSeller,
  checkResetToken,
  resetPassword,
  editSeller,
};
