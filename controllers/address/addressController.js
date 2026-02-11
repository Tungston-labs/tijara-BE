const Address = require("../../models/Address");

const addAddress = async (req, res) => {
    try {
        const userId = req.user.id;

        if (req.body.isDefault) {
            await Address.updateMany(
                { user: userId },
                { isDefault: false }
            );
        }

        const address = await Address.create({
            ...req.body,
            user: userId,
        }); 

        res.status(201).json({
            success: true,
            data: address,
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
const getUserAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({
      user: req.user.id,
    }).sort({ isDefault: -1 });

    res.json({
      success: true,
      data: addresses,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const updateAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    const userId = req.user.id;

    const existingAddress = await Address.findOne({
      _id: addressId,
      user: userId,
    });

    if (!existingAddress) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    // Reset other defaults if needed
    if (req.body.isDefault === true) {
      await Address.updateMany(
        { user: userId },
        { isDefault: false }
      );
    }

    const updatedAddress = await Address.findByIdAndUpdate(
      addressId,
      req.body,
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: updatedAddress,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteAddress = async (req, res) => {
  try {
    await Address.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    res.json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
module.exports = {
updateAddress,
getUserAddresses,
addAddress,
deleteAddress
};