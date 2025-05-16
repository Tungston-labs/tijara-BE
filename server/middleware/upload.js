
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.uploadFolder || "uploads/";
    const dir = path.join(__dirname, "..", folder);

    // Create folder if it doesn't exist
    fs.mkdirSync(dir, { recursive: true });

    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/") || file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only image or PDF files are allowed"), false);
  }
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
