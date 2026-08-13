// backend/src/routes/googleAuthRoutes.js
const express = require("express");
const router = express.Router();
const {
  googleAuth,
  googleAuthCallback,
  googleLogin,
} = require("../controllers/googleAuthController");

// Google OAuth routes
router.get("/google", googleAuth);
router.get("/google/callback", googleAuthCallback);
router.post("/google-login", googleLogin);

module.exports = router;
