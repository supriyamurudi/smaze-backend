const jwt = require("jsonwebtoken");

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "30d", // Change from "7d" to "30d" or "365d" for long-lasting login
    },
  );
};

module.exports = generateToken;
