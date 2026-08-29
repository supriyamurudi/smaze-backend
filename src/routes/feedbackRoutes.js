// backend/src/routes/feedbackRoutes.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const {
  submitWebsiteFeedback,
  getWebsiteFeedback,
} = require("../controllers/feedbackController");

// ✅ Customer submits website feedback (Protected)
router.post("/", protect, submitWebsiteFeedback);

// ✅ Admin views all website feedback (Protected + Admin only)
router.get("/admin", protect, authorize("ADMIN"), getWebsiteFeedback);

module.exports = router;
