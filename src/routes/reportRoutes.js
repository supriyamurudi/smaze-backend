// backend/routes/reportRoutes.js

const express = require("express");
const router = express.Router();
const { getReports } = require("../controllers/reportController");
const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

// ========================
// Admin Reports Routes
// ========================

// Get all reports and analytics data
router.get("/", protect, authorize("ADMIN"), getReports);

module.exports = router;
