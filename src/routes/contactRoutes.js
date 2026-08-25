// backend/routes/contactRoutes.js
const express = require("express");
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

const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// ===============================
// Public Route - Anyone can send a message
// ===============================
router.post("/", sendContactMessage);

// ===============================
// Admin Routes - Protected
// ===============================

// Get all messages (with pagination, filtering, search)
router.get("/", protect, authorize("ADMIN"), getContactMessages);

// Get message statistics
router.get("/stats", protect, authorize("ADMIN"), getMessageStats);

// Get unread message count
router.get("/unread-count", protect, authorize("ADMIN"), getUnreadCount);

// Get single message by ID
router.get("/:id", protect, authorize("ADMIN"), getContactMessageById);

// Delete a message
router.delete("/:id", protect, authorize("ADMIN"), deleteContactMessage);

// Bulk delete messages
router.post("/bulk-delete", protect, authorize("ADMIN"), bulkDeleteMessages);

// Toggle message read status
router.patch("/:id/read", protect, authorize("ADMIN"), toggleMessageRead);

// Reply to a message
router.post("/:id/reply", protect, authorize("ADMIN"), replyToMessage);

module.exports = router;
