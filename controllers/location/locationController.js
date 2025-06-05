const Location = require("../../models/Location");

// Create a new location
const createLocation = async (req, res, next) => {
  try {
    const { name, country, coordinates } = req.body;

    if (
      !name ||
      !coordinates ||
      typeof coordinates.latitude !== "number" ||
      typeof coordinates.longitude !== "number"
    ) {
      return res.status(400).json({ message: "Invalid location data" });
    }

    const location = new Location({
      name,
      country: country || "UAE",
      coordinates: {
        type: "Point",
        coordinates: [coordinates.longitude, coordinates.latitude],
      },
    });

    await location.save();

    res.status(201).json({ message: "Location created successfully", location });
  } catch (error) {
    next(error);
  }
};

// Get all locations (optional)
const getAllLocations = async (req, res, next) => {
  try {
    const locations = await Location.find();
    res.json(locations);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createLocation,
  getAllLocations,
};
