const express = require("express");

const {
  createOffer,
  getOffers,
  getOfferById,
  getMyOfferById,
  getMyOffers,
  updateOffer,
  deleteOffer,
  addOfferView,
} = require("../controllers/offerController");

const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const upload = require("../middleware/upload");

const router = express.Router();

// =====================================
// Public Routes
// =====================================

// Get all offers
router.get("/", getOffers);

// =====================================
// Shop Owner Routes
// =====================================

// Get logged-in shop owner's offers
router.get("/my-offers", protect, authorize("SHOP_OWNER"), getMyOffers);

// Create Offer
router.post(
  "/",
  protect,
  authorize("SHOP_OWNER"),
  upload.single("image"),
  createOffer,
);

// Update Offer
router.put(
  "/:id",
  protect,
  authorize("SHOP_OWNER"),
  upload.single("image"),
  updateOffer,
);

// Delete Offer
router.delete("/:id", protect, authorize("SHOP_OWNER"), deleteOffer);

// =====================================
// Public Route
// =====================================

// Get Offer by ID (KEEP THIS LAST)
router.get("/my/:id", protect, authorize("SHOP_OWNER"), getMyOfferById);
router.post("/:id/view", protect, authorize("CUSTOMER"), addOfferView);
router.get("/:id", getOfferById);

module.exports = router;
