// backend/src/routes/homeRoutes.js
const express = require("express");
const router = express.Router();
const { getHomeStats, getHomeData } = require("../controllers/homeController");

// Public routes (No authentication required)
router.get("/", getHomeData);
router.get("/stats", getHomeStats);

module.exports = router;
