// backend/src/routes/authRoutes.js
const express = require("express");

const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyResetToken,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// ================= AUTH =================

// Register
router.post("/register", register);

// Login
router.post("/login", login);

// ================= PASSWORD RESET =================

// Forgot Password - Request reset link
router.post("/forgot-password", forgotPassword);

// Reset Password - Set new password
router.post("/reset-password", resetPassword);

// Verify Reset Token
router.get("/verify-reset-token/:token", verifyResetToken);

// ================= PROFILE =================

// Get logged in user profile
router.get("/profile", protect, getProfile);

// Update user profile
router.put("/profile", protect, updateProfile);

// Change password (authenticated users)
router.put("/change-password", protect, changePassword);

module.exports = router;
