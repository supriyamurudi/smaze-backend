// backend/routes/adminRoutes.js

const express = require("express");
const upload = require("../middleware/upload"); // ✅ Import upload middleware

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
  // ✅ Import shop approval functions
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

const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

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

// ✅ NEW: Shop Approval Routes
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

// Shop CRUD Routes
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
