// routes/whatsappChannelRoutes.js
import express from "express";
import {
  getSettings,
  updateSettings,
  trackClick,
  getAnalytics,
  getQRCode,
  getOptedCustomers,
  updateOptIn,
  getStats,
} from "../controllers/whatsappChannelController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================
router.get("/settings", getSettings);
router.get("/qr", getQRCode);

// ============================================
// AUTHENTICATED ROUTES (Customer)
// ============================================
router.post("/track-click", authenticate, trackClick);
router.put("/opt-in", authenticate, updateOptIn);
router.get("/stats", authenticate, getStats);

// ============================================
// ADMIN ONLY ROUTES
// ============================================
router.put("/settings", authenticate, authorize(["ADMIN"]), updateSettings);
router.get("/analytics", authenticate, authorize(["ADMIN"]), getAnalytics);
router.get(
  "/opted-customers",
  authenticate,
  authorize(["ADMIN"]),
  getOptedCustomers,
);

export default router;
