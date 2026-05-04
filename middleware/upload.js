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
  if (
    file.mimetype.startsWith("image/") || 
    file.mimetype === "application/pdf"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only image files and PDFs are allowed"), false);
  }
};
const upload = multer({ storage, fileFilter });

module.exports = upload;
