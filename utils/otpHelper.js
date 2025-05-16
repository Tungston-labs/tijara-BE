const Otp = require("../models/Otp");
const otpGenerator = require("otp-generator");

const generateUniqueOtp = async () => {
    let otp;
    let result;

    do {
      otp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false,
      });

      result = await Otp.findOne({ otp });
    } while (result); 

    return otp;
  };
  module.exports={generateUniqueOtp}