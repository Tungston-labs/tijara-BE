const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = "uploads/misc"; // Default

    // Determine folder based on field name and URL or user role
    if (file.fieldname === "profileImage") {
      if (req.originalUrl.includes("buyer")) {
        folder = "uploads/users/buyers"; // Clean structure
      } else if (req.originalUrl.includes("seller")) {
        folder = "uploads/users/sellers";
      }
    } else if (file.fieldname === "images") {
      folder = "uploads/products";
    } else if (file.fieldname === "tradeLicenseCopy") {
      folder = "uploads/licenses";
    } else if (req.uploadFolder) {
      folder = req.uploadFolder; // Optional route override
    }

    const dir = path.join(__dirname, "..", folder);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, JPG, and PDF files are allowed"), false);
  }
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
