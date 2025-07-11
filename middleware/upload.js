const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = "uploads/misc"; // Default fallback

    switch (file.fieldname) {
      case "profileImage":
        folder = "uploads/users";
        break;
      case "images":
        folder = "uploads/products";
        break;
      case "tradeLicenseCopy":
        folder = "uploads/licenses";
        break;
      default:
        if (req.uploadFolder) folder = req.uploadFolder;
        break;
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
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/heic",
    "application/pdf"
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, JPG, HEIC, and PDF files are allowed"), false);
  }
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
