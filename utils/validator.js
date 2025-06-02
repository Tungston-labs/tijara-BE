// utils/validators.js
const validator = require("validator");

const usernameRegex = /^[a-zA-Z\s]{3,50}$/;
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&])[A-Za-z\d@$!%*?#&]{8,32}$/;

const validateName = (name) => usernameRegex.test(name);
const validateEmail = (email) => validator.isEmail(email);
const phoneRegex = /^\+?[0-9]{10,15}$/;
function validatePhone(phone) {
  return phoneRegex.test(phone);
}
const validatePassword = (password) => passwordRegex.test(password);

module.exports = {
  validateName,
  validateEmail,
  validatePhone,
  validatePassword,
};
