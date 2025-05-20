// controllers/itemSubCategoryController.js
const ItemSubCategory = require("../../models/ItemSubCategory");

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

// controllers/itemSubCategoryController.js
const getSubCategories = async (req, res,next) => {
  try {
    const { page = 1, limit = 10, search = "", itemNameId } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (itemNameId) {
      query.itemName = itemNameId;
    }
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const [subCategories, total] = await Promise.all([
      ItemSubCategory.find(query).skip(skip).limit(parseInt(limit)).populate("itemName"),
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