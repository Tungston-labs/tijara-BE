// controllers/itemSubCategoryController.js
const ItemSubCategory = require("../../models/ItemSubCategory");
const ItemNames=require('../../models/ItemName');
const ItemName = require("../../models/ItemName");
const addSubCategory = async (req, res,next) => {
  try {
    const { name, itemNameId } = req.body;
    const subCategory = new ItemSubCategory({ name, itemName: itemNameId });
    await subCategory.save();
    res.status(201).json({ message: "Subcategory added", subCategory });
  } catch (err) {
   next(err)
  }
};


const getSubCategories = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const skip = (page - 1) * limit;

   
    let matchingItemNames = [];
    if (search) {
      matchingItemNames = await ItemName.find({
        name: { $regex: search, $options: "i" }, // case-insensitive regex
      }).select("_id");
    } else {
      // If no search, get all item names (or you can skip this)
      matchingItemNames = await ItemName.find().select("_id");
    }

    const itemNameIds = matchingItemNames.map(doc => doc._id);

    if (itemNameIds.length === 0) {
      // No matching itemNames, so no subcategories
      return res.status(200).json({
        subCategories: [],
        pagination: { total: 0, page: parseInt(page), pages: 0, limit: parseInt(limit) },
      });
    }

    // 2. Find ItemSubCategories with itemName in those matching IDs
    const query = { itemName: { $in: itemNameIds } };

    const [subCategories, total] = await Promise.all([
      ItemSubCategory.find(query)
        .skip(skip)
        .limit(parseInt(limit))
        .populate("itemName"),
      ItemSubCategory.countDocuments(query),
    ]);

    res.status(200).json({
      subCategories,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit),
      },
    });
  } catch (err) {
    next(err);
  }
};


module.exports={addSubCategory, getSubCategories};