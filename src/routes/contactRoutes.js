// backend/src/routes/contactRoutes.js
const express = require("express");
const router = express.Router();

const {
  sendContactMessage,
  getContactMessages,
  getContactMessageById,
  deleteContactMessage,
  toggleMessageRead,
  replyToMessage,
  getUnreadCount,
  bulkDeleteMessages,
  getMessageStats,
} = require("../controllers/contactController");

// ✅ Public Route - Anyone can send a message
// This matches POST /api/contact because app.js mounts it there
router.post("/", sendContactMessage);

// (Optional) Admin Routes - only if you need them
// const { protect } = require("../middleware/authMiddleware");
// const authorize = require("../middleware/roleMiddleware");
// router.get("/", protect, authorize("ADMIN"), getContactMessages);

// ✅ Export the router (THIS WAS MISSING!)
module.exports = router;
