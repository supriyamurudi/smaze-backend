const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  submitRating,
  getShopRatings,
  getMyShopRating,
} = require("../controllers/ratingController");

// ✅ Public: Get all ratings for a shop
router.get("/shop/:shopId", getShopRatings);

// ✅ Protected: Submit or Update a rating (Customer only)
router.post("/", protect, submitRating);

// ✅ Protected: Get my rating for a shop
router.get("/my/:shopId", protect, getMyShopRating);

module.exports = router;
