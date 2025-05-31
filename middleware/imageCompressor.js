const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const compressImageFromDisk = async (inputPath, outputPath) => {
  await sharp(inputPath)
    .resize({ width: 800 }) // Optional: resize to width 800px
    .jpeg({ quality: 70 })  // Adjust compression quality
    .toFile(outputPath);
};

const compressUploadedImages = async (req, res, next) => {
  try {
    if (!req.files) return next();

    for (const key in req.files) {
      const file = req.files[key][0];

      const inputPath = file.path;
      const ext = path.extname(inputPath);
      const compressedDir = path.dirname(inputPath).replace("uploads", "uploads/");
      const outputFilename = `${Date.now()}-${file.filename}`;
      const outputPath = path.join(compressedDir, outputFilename);

      fs.mkdirSync(compressedDir, { recursive: true });

      await compressImageFromDisk(inputPath, outputPath);

      fs.unlinkSync(inputPath); // Delete original

      // Replace file info
      file.path = outputPath;
      file.filename = outputFilename;
      file.destination = compressedDir;
    }

    next();
  } catch (err) {
    console.error("Compression failed:", err);
    res.status(500).json({ message: "Image compression failed" });
  }
};


module.exports = compressUploadedImages;
