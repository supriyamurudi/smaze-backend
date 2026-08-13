// backend/src/routes/shopRoutes.js
const express = require("express");

const {
  createShop,
  getMyShop,
  updateShop,
  getAllShops,
  getShopAnalytics,
  getShopDashboard,
  getFeaturedShops,
  getShopById,
  getAdminShops,
  updateShopStatus,
} = require("../controllers/shopController");

const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const upload = require("../middleware/upload");

const router = express.Router();

// ===============================
// ⚠️ CRITICAL: ORDER MATTERS!
// Specific routes MUST come before dynamic routes
// ===============================

// ===============================
// 1. Shop Owner Routes - SPECIFIC PATHS FIRST
// ===============================
router.get("/me", protect, authorize("SHOP_OWNER"), getMyShop);
router.put(
  "/me",
  protect,
  authorize("SHOP_OWNER"),
  upload.single("image"),
  updateShop,
);
router.get("/dashboard", protect, authorize("SHOP_OWNER"), getShopDashboard);
router.get("/analytics", protect, authorize("SHOP_OWNER"), getShopAnalytics);

// ===============================
// 2. Create Shop
// ===============================
router.post(
  "/",
  protect,
  authorize("SHOP_OWNER"),
  upload.single("image"),
  createShop,
);

// ===============================
// 3. Admin Routes
// ===============================
router.get("/admin/all", protect, authorize("ADMIN"), getAdminShops);
router.patch(
  "/admin/:id/status",
  protect,
  authorize("ADMIN"),
  updateShopStatus,
);

// ===============================
// 4. Public Routes - DYNAMIC ROUTES MUST COME LAST
// ===============================
router.get("/featured", getFeaturedShops);
router.get("/", getAllShops);
router.get("/:id", getShopById); // ⚠️ This must be LAST!

module.exports = router;
