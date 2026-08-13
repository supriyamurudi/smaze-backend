// backend/src/routes/notificationRoutes.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
  adminSendToShopOwner,
  adminSendToAllShopOwners,
} = require("../controllers/notificationController");

// ===============================
// User Routes (Protected)
// ===============================
router.get("/", protect, getNotifications);
router.get("/unread-count", protect, getUnreadCount);
router.put("/:id/read", protect, markNotificationAsRead);
router.put("/read-all", protect, markAllNotificationsAsRead);
router.delete("/:id", protect, deleteNotification);
router.delete("/", protect, deleteAllNotifications);

// ===============================
// Admin Routes (Protected + Admin Only)
// ===============================
router.post(
  "/admin/shop-owner",
  protect,
  authorize("ADMIN"),
  adminSendToShopOwner,
);
router.post(
  "/admin/all-shop-owners",
  protect,
  authorize("ADMIN"),
  adminSendToAllShopOwners,
);

module.exports = router;
