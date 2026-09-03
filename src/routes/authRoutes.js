// backend/src/routes/authRoutes.js
const express = require("express");

const {
  register,
  login,
  logout, // ✅ ADDED
  checkAuth, // ✅ ADDED
  getProfile,
  updateProfile,
  changePassword,
  resetPassword, // Simple reset - no email
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// ================= AUTH =================

// Register
router.post("/register", register);

// Login
router.post("/login", login);

// Logout
router.post("/logout", logout); // ✅ ADDED

// Check if current user is authenticated (used by frontend RequireAuth)
router.get("/check", checkAuth); // ✅ ADDED

// ================= PASSWORD RESET (SIMPLE - NO EMAIL) =================

// Reset Password - Direct reset with email + new password
router.post("/reset-password", resetPassword);

// ================= PROFILE =================

// Get logged in user profile
router.get("/profile", protect, getProfile);

// Update user profile
router.put("/profile", protect, updateProfile);

// Change password (authenticated users)
router.put("/change-password", protect, changePassword);

module.exports = router;
