const Product = require("../../models/Products");
const User = require("../../models/User");
const Admin = require("../../models/Admin");
const path = require("path");
const fs = require("fs");


const addProduct = async (req, res, next) => {
  try {
    const {
      itemCategory,
      itemName,
      itemSubCategory,
      country,
      description,
      availableKg = 0,
      priceAED,
      priceINR,
      priceUSD,
      expiryDate,
    } = req.body;

    if (!req.files || req.files.length < 1) {
      return res
        .status(400)
        .json({ message: "At least one image is required." });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const imagePaths = req.files.map(
      (file) => `${baseUrl}/uploads/products/${file.filename}`
    );

    const pricePerKg = {
      ...(priceAED && { AED: parseFloat(priceAED) }),
      ...(priceINR && { INR: parseFloat(priceINR) }),
      ...(priceUSD && { USD: parseFloat(priceUSD) }),
    };

    const { id, role } = req.user;

    if (!["admin", "seller"].includes(role)) {
      return res
        .status(403)
        .json({ message: "Only admin or seller can add products." });
    }

    if (!expiryDate || new Date(expiryDate) <= new Date()) {
      return res
        .status(400)
        .json({ message: "Expiry date must be a future date." });
    }

    let user = null;
    if (role === "admin") {
      user = await Admin.findById(id);
    } else {
      user = await User.findOne({ _id: id, role: "seller" });
    }

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found or not authorized." });
    }

    const newProduct = new Product({
      itemCategory: itemCategory.toLowerCase(),
      itemName,
      itemSubCategory: String(itemSubCategory).toLowerCase(),
      country,
      availableKg: parseFloat(availableKg),
      description,
      images: imagePaths,
      expiryDate,
      pricePerKg,
      addedBy: id,
      addedByModel: role === "admin" ? "Admin" : "User",
    });

    await newProduct.save();

    res.status(201).json({
      message: "Product added successfully",
      product: newProduct,
    });
  } catch (error) {
    console.error("Add product error:", error);
    next(error);
  }
};

const getAllProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      category,
      status,
      sellerName,
    } = req.query;
    const { id, role } = req.user;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    const filter = {
      ...(role === "seller" ? { addedBy: id, addedByModel: "User" } : {}),
      ...(category ? { itemCategory: category } : {}),
      ...(search ? { itemName: { $regex: search, $options: "i" } } : {}),
    };

    const currentDate = new Date();
    if (status === "unexpired") {
      filter.expiryDate = { $gt: currentDate };
    } else if (status === "expired") {
      filter.expiryDate = { $lte: currentDate };
    }

    let query = Product.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .populate("addedBy");

    let products = await query.exec();

    // Filter by sellerName in memory
    if (role === "admin" && sellerName) {
      products = products.filter((p) =>
        p.addedBy?.name?.toLowerCase().includes(sellerName.toLowerCase())
      );
    }

    const total = await Product.countDocuments(filter); // Optional: recalculate if sellerName filtered

    res.status(200).json({
      total,
      page: pageNumber,
      pageSize: products.length,
      totalPages: Math.ceil(total / limitNumber),
      products,
    });
  } catch (error) {
    next(error);
  }
};

const getAllProductsForBuyers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = "", itemCategory } = req.query;

    const filter = {
      expiryDate: { $gt: new Date() }, // Only unexpired
    };

    if (itemCategory) {
      filter.itemCategory = new RegExp(`^${itemCategory}$`, "i");
    }

    if (search) {
      filter.itemName = { $regex: search, $options: "i" };
    }

    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("addedBy", "name");

    const total = await Product.countDocuments(filter);

    res.status(200).json({
      total,
      page: parseInt(page),
      pageSize: products.length,
      totalPages: Math.ceil(total / limit),
      products,
    });
  } catch (error) {
    next(error);
  }
};

// View single product
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate("addedBy");
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.status(200).json(product);
  } catch (error) {
    next(error);
  }
};

// Update product
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      itemCategory,
      itemName,
      itemSubCategory,
      country,
      availableKg,
      description,
      priceAED,
      priceINR,
      priceUSD,
      expiryDate,
      existingImages, // Comes as JSON string
    } = req.body;

    const { id: userId, role } = req.user;

    const pricePerKg = {
      ...(priceAED && { AED: parseFloat(priceAED) }),
      ...(priceINR && { INR: parseFloat(priceINR) }),
      ...(priceUSD && { USD: parseFloat(priceUSD) }),
    };

    if (expiryDate && new Date(expiryDate) <= new Date()) {
      return res
        .status(400)
        .json({ message: "Expiry date must be a future date." });
    }

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (role === "seller" && String(product.addedBy) !== userId) {
      return res
        .status(403)
        .json({ message: "Unauthorized to update this product." });
    }

    // Parse retained image URLs from frontend
    const existing = existingImages ? JSON.parse(existingImages) : [];

    // Identify which images to delete
    const oldImageUrls = product.images || [];
    const removedImageUrls = oldImageUrls.filter(
      (url) => !existing.includes(url)
    );

    // Add new uploaded images
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const newImagePaths =
      req.files?.map(
        (file) => `${baseUrl}/uploads/products/${file.filename}`
      ) || [];

    const finalImages = [...existing, ...newImagePaths];

    // Update fields
    product.itemCategory = itemCategory || product.itemCategory;
    product.itemName = itemName || product.itemName;
    product.itemSubCategory = itemSubCategory || product.itemSubCategory;
    product.country = country || product.country;
    product.expiryDate = expiryDate || product.expiryDate;
    product.availableKg = availableKg || product.availableKg;
    product.description = description || product.description;
    product.pricePerKg = Object.keys(pricePerKg).length
      ? pricePerKg
      : product.pricePerKg;
    product.images = finalImages;

    await product.save();

   removedImageUrls.forEach((url) => {
  try {
    const filename = path.basename(url); // safer extraction
    const filePath = path.join(__dirname, "..", "..", "uploads", "products", filename);

    console.log("Resolved file path for deletion:", filePath);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log("✅ Deleted file:", filePath);
    } else {
      console.warn("⚠️ File not found:", filePath);
    }
  } catch (err) {
    console.error("❌ Error deleting image:", err);
  }
});

    res.status(200).json({ message: "Product updated successfully", product });
  } catch (error) {
    console.error("❌ Update Error:", error);
    next(error);
  }
};

// Delete product
const deleteProduct = async (req, res, next) => {
  try {
    const { id: productId } = req.params;
    const { id: userId, role } = req.user;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (role === "admin") {
      await product.deleteOne();
      return res.status(200).json({ message: "Product deleted by admin" });
    }

    if (role === "seller" && String(product.addedBy) === userId) {
      await product.deleteOne();
      return res.status(200).json({ message: "Product deleted by seller" });
    }

    return res
      .status(403)
      .json({ message: "Unauthorized to delete this product" });
  } catch (error) {
    next(error);
  }
};
const getItemNames = async (req, res) => {
  try {
    const { search } = req.query;

    let itemNames;
    if (search) {
      // Case-insensitive partial match using regex
      const regex = new RegExp(search, "i");
      itemNames = await Product.find({ itemName: regex }).distinct("itemName");
    } else {
      itemNames = await Product.distinct("itemName");
    }

    res.status(200).json({ itemNames });
  } catch (error) {
    console.error("Fetch item names error:", error);
    res.status(500).json({ message: "Failed to fetch item names" });
  }
};

const getSubCategoriesByItemName = async (req, res) => {
  const { itemName } = req.params;
  const { search } = req.query;

  try {
    const match = {
      itemName: new RegExp(`^${itemName}$`, "i"), // exact match, case-insensitive
    };

    if (search) {
      match.itemSubCategory = new RegExp(search, "i");
    }

    const subCategories = await Product.find(match).distinct("itemSubCategory");

    res.status(200).json({ itemName, subCategories });
  } catch (error) {
    console.error("Fetch subcategories error:", error);
    res.status(500).json({ message: "Failed to fetch subcategories" });
  }
};

module.exports = {
  addProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  getItemNames,
  getSubCategoriesByItemName,
  getAllProductsForBuyers,
};
