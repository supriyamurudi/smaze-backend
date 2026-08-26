// backend/src/routes/adminRoutes.js
const express = require("express");
const upload = require("../middleware/upload");

const {
  getDashboardStats,
  getReports,
  getUsers,
  getUserById,
  deleteUser,
  toggleUserStatus,
  restoreUser,
  updateUser,
  getShops,
  getShopStats,
  getShopById,
  createShop,
  updateShop,
  deleteShop,
  getPendingShops,
  approveShop,
  rejectShop,
  bulkApproveShops,
  bulkRejectShops,
  getOffers,
  getOfferById,
  createOffer,
  updateOffer,
  deleteOffer,
  getTopCategories,
  getMonthlyGrowth,
  getRecentActivity,
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getAdminProfile,
  updateAdminProfile,
  updateAdminPassword,
} = require("../controllers/adminController");

// ✅ ADD NOTIFICATION CONTROLLER IMPORTS
const {
  getAdminNotifications,
  getAdminUnreadCount,
  markAdminNotificationAsRead,
  markAllAdminNotificationsAsRead,
  deleteAdminNotification,
  deleteAllAdminNotifications,
} = require("../controllers/notificationController");

const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// =========================
// ✅ NOTIFICATION ROUTES
// =========================

// Get all admin notifications
router.get(
  "/notifications",
  protect,
  authorize("ADMIN"),
  getAdminNotifications,
);

// Get admin unread count
router.get(
  "/notifications/unread-count",
  protect,
  authorize("ADMIN"),
  getAdminUnreadCount,
);

// Mark admin notification as read
router.patch(
  "/notifications/:id/read",
  protect,
  authorize("ADMIN"),
  markAdminNotificationAsRead,
);

// Mark all admin notifications as read
router.patch(
  "/notifications/mark-all-read",
  protect,
  authorize("ADMIN"),
  markAllAdminNotificationsAsRead,
);

// Delete admin notification
router.delete(
  "/notifications/:id",
  protect,
  authorize("ADMIN"),
  deleteAdminNotification,
);

// Delete all admin notifications
router.delete(
  "/notifications/delete-all",
  protect,
  authorize("ADMIN"),
  deleteAllAdminNotifications,
);

// =========================
// Dashboard Routes
// =========================
router.get("/dashboard", protect, authorize("ADMIN"), getDashboardStats);
router.get("/top-categories", protect, authorize("ADMIN"), getTopCategories);
router.get("/monthly-growth", protect, authorize("ADMIN"), getMonthlyGrowth);
router.get("/recent-activity", protect, authorize("ADMIN"), getRecentActivity);

// =========================
// Reports Routes
// =========================
router.get("/reports", protect, authorize("ADMIN"), getReports);

// =========================
// User Routes
// =========================
router.get("/users", protect, authorize("ADMIN"), getUsers);
router.get("/users/:id", protect, authorize("ADMIN"), getUserById);
router.put("/users/:id", protect, authorize("ADMIN"), updateUser);
router.delete("/users/:id", protect, authorize("ADMIN"), deleteUser);
router.put("/users/:id/status", protect, authorize("ADMIN"), toggleUserStatus);
router.put("/users/:id/restore", protect, authorize("ADMIN"), restoreUser);

// =========================
// Shop Routes
// =========================
router.get("/shops", protect, authorize("ADMIN"), getShops);
router.get("/shops/stats", protect, authorize("ADMIN"), getShopStats);
router.get("/shops/pending", protect, authorize("ADMIN"), getPendingShops);
router.patch("/shops/:id/approve", protect, authorize("ADMIN"), approveShop);
router.patch("/shops/:id/reject", protect, authorize("ADMIN"), rejectShop);
router.post(
  "/shops/bulk-approve",
  protect,
  authorize("ADMIN"),
  bulkApproveShops,
);
router.post("/shops/bulk-reject", protect, authorize("ADMIN"), bulkRejectShops);
router.get("/shops/:id", protect, authorize("ADMIN"), getShopById);
router.post(
  "/shops",
  protect,
  authorize("ADMIN"),
  upload.single("image"),
  createShop,
);
router.put(
  "/shops/:id",
  protect,
  authorize("ADMIN"),
  upload.single("image"),
  updateShop,
);
router.delete("/shops/:id", protect, authorize("ADMIN"), deleteShop);

// =========================
// Offer Routes
// =========================
router.get("/offers", protect, authorize("ADMIN"), getOffers);
router.get("/offers/:id", protect, authorize("ADMIN"), getOfferById);
router.post(
  "/offers",
  protect,
  authorize("ADMIN"),
  upload.single("image"),
  createOffer,
);
router.put(
  "/offers/:id",
  protect,
  authorize("ADMIN"),
  upload.single("image"),
  updateOffer,
);
router.delete("/offers/:id", protect, authorize("ADMIN"), deleteOffer);

// =========================
// Category Routes
// =========================
router.get("/categories", protect, authorize("ADMIN"), getCategories);
router.get("/categories/:id", protect, authorize("ADMIN"), getCategoryById);
router.post(
  "/categories",
  protect,
  authorize("ADMIN"),
  upload.single("image"),
  createCategory,
);
router.put(
  "/categories/:id",
  protect,
  authorize("ADMIN"),
  upload.single("image"),
  updateCategory,
);
router.delete("/categories/:id", protect, authorize("ADMIN"), deleteCategory);

// =========================
// Admin Profile Routes
// =========================
router.get("/profile", protect, authorize("ADMIN"), getAdminProfile);
router.put("/profile", protect, authorize("ADMIN"), updateAdminProfile);
router.put(
  "/profile/password",
  protect,
  authorize("ADMIN"),
  updateAdminPassword,
);

module.exports = router;
