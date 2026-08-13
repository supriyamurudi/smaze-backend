const express = require("express");

const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const { getDashboard } = require("../controllers/customerController");

// Dashboard
router.get("/dashboard", protect, authorize("CUSTOMER"), getDashboard);

module.exports = router;
