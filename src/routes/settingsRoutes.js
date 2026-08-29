const express = require("express");

const {
  getSettings,
  updateSettings,
  updatePassword, // ✅ Import it
} = require("../controllers/settingsController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getSettings);

router.put("/", protect, updateSettings);

// ✅ ADD THIS ROUTE
router.put("/password", protect, updatePassword);

module.exports = router;
