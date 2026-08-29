const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const {
  submitWebsiteFeedback,
  getWebsiteFeedback,
  getPublicFeedback, // ✅ Import this
} = require("../controllers/feedbackController");

// ✅ Customer submits website feedback (Protected)
router.post("/", protect, submitWebsiteFeedback);

// ✅ Admin views all website feedback (Protected + Admin only)
router.get("/admin", protect, authorize("ADMIN"), getWebsiteFeedback);

// ✅ Public route (No auth required)
router.get("/public", getPublicFeedback);

module.exports = router;
