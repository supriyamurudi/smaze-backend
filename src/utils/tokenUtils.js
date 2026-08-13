const crypto = require("crypto");

const generateResetToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

const generateResetTokenWithExpiry = () => {
  const token = generateResetToken();
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 1);
  return { token, expiry };
};

const isTokenExpired = (expiryDate) => {
  return new Date() > new Date(expiryDate);
};

module.exports = {
  generateResetToken,
  generateResetTokenWithExpiry,
  isTokenExpired,
};
