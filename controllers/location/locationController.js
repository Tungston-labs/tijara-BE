
const reverseGeocode = async (latitude, longitude) => {
  const apiKey = process.env.OPENCAGE_API_KEY;
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${apiKey}`;

  const response = await axios.get(url);
  const address = response.data?.results?.[0]?.formatted || "Unknown Location";
  return address;
};