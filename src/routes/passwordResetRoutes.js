// backend/src/routes/passwordResetRoutes.js
const express = require("express");
const router = express.Router();
const {
  requestPasswordReset,
  verifyOTP,
  resetPassword,
  resendOTP,
} = require("../controllers/passwordResetController");

// Public routes (no authentication required)
router.post("/request", requestPasswordReset);
router.post("/verify-otp", verifyOTP);
router.post("/reset", resetPassword);
router.post("/resend-otp", resendOTP);

module.exports = router;
