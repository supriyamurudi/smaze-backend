const express = require("express");

const router = express.Router();

const { protect } = require("../middleware/authMiddleware");

const {
  getSettings,
  updateSettings,
  changePassword,
} = require("../controllers/userController");

router.get("/settings", protect, getSettings);

router.put("/settings", protect, updateSettings);

router.put("/change-password", protect, changePassword);

module.exports = router;
