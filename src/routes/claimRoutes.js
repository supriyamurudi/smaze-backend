const express = require("express");

const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const { claimOffer, getMyClaims } = require("../controllers/claimController");

// Customer claim offer

router.post("/", protect, authorize("CUSTOMER"), claimOffer);

// Get customer claims

router.get("/my", protect, authorize("CUSTOMER"), getMyClaims);

module.exports = router;
