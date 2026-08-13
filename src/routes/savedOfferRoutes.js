const express = require("express");

const {
  saveOffer,
  getSavedOffers,
  removeSavedOffer,
} = require("../controllers/savedOfferController");

const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

// ==============================
// Customer Routes
// ==============================

// Save Offer
router.post("/", protect, authorize("CUSTOMER"), saveOffer);

// Get Saved Offers
router.get("/", protect, authorize("CUSTOMER"), getSavedOffers);

// Remove Saved Offer
router.delete("/:id", protect, authorize("CUSTOMER"), removeSavedOffer);

module.exports = router;
