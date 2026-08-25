// backend/src/routes/notificationRoutes.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  // Customer notification controllers
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,

  // Admin notification controllers
  getAdminNotifications,
  getAdminUnreadCount,
  markAdminNotificationAsRead,
  markAllAdminNotificationsAsRead,
  deleteAdminNotification,
  deleteAllAdminNotifications,

  // Admin actions
  adminSendToShopOwner,
  adminSendToAllShopOwners,
} = require("../controllers/notificationController");

// =============================================
// =========== CUSTOMER NOTIFICATIONS ===========
// =============================================

// Get all customer notifications
router.get("/", protect, getNotifications);

// Get customer unread count
router.get("/unread-count", protect, getUnreadCount);

// Mark customer notification as read
router.put("/:id/read", protect, markNotificationAsRead);

// Mark all customer notifications as read
router.put("/read-all", protect, markAllNotificationsAsRead);

// Delete customer notification
router.delete("/:id", protect, deleteNotification);

// Delete all customer notifications
router.delete("/", protect, deleteAllNotifications);

// =============================================
// =========== ADMIN NOTIFICATIONS =============
// =============================================

// Get all admin notifications (with filters)
router.get(
  "/admin/notifications",
  protect,
  authorize("ADMIN"),
  getAdminNotifications,
);

// Get admin unread count
router.get(
  "/admin/notifications/unread-count",
  protect,
  authorize("ADMIN"),
  getAdminUnreadCount,
);

// Mark admin notification as read
router.patch(
  "/admin/notifications/:id/read",
  protect,
  authorize("ADMIN"),
  markAdminNotificationAsRead,
);

// Mark all admin notifications as read
router.patch(
  "/admin/notifications/mark-all-read",
  protect,
  authorize("ADMIN"),
  markAllAdminNotificationsAsRead,
);

// Delete admin notification
router.delete(
  "/admin/notifications/:id",
  protect,
  authorize("ADMIN"),
  deleteAdminNotification,
);

// Delete all admin notifications
router.delete(
  "/admin/notifications/delete-all",
  protect,
  authorize("ADMIN"),
  deleteAllAdminNotifications,
);

// =============================================
// =========== ADMIN ACTIONS ===================
// =============================================

// Admin: Send notification to a specific shop owner
router.post(
  "/admin/shop-owner",
  protect,
  authorize("ADMIN"),
  adminSendToShopOwner,
);

// Admin: Send notification to all shop owners
router.post(
  "/admin/all-shop-owners",
  protect,
  authorize("ADMIN"),
  adminSendToAllShopOwners,
);

module.exports = router;
