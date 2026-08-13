// backend/routes/profileRoutes.js

const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getProfile,
  updateProfile,
  updatePassword,
} = require("../controllers/profileController");

// =========================
// Profile Routes (Protected)
// =========================

// Get profile
router.get("/", protect, getProfile);

// Update profile
router.put("/", protect, updateProfile);

// Update password
router.put("/password", protect, updatePassword);

module.exports = router;
