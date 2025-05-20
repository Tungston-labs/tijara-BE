const ItemName = require("../../models/ItemName");

const addItemName = async (req, res, next) => {
  try {
    const { name, category } = req.body;
    const newItem = new ItemName({ name, category });
    await newItem.save();
    res.status(201).json({ message: "Item name added", item: newItem });
  } catch (err) {
next(err);  }
};

// controllers/itemNameController.js
const getItemNames = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const query = search
      ? { name: { $regex: search, $options: "i" } } // Case-insensitive partial match
      : {};

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      ItemName.find(query).skip(skip).limit(parseInt(limit)),
      ItemName.countDocuments(query),
    ]);

    res.status(200).json({
      items,
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


module.exports={addItemName, getItemNames}