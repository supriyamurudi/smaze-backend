const express = require("express");
const cors = require("cors");

// =========================
// Route Imports
// =========================
const authRoutes = require("./routes/authRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const shopRoutes = require("./routes/shopRoutes");
const offerRoutes = require("./routes/offerRoutes");
const savedOfferRoutes = require("./routes/savedOfferRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const userRoutes = require("./routes/userRoutes");
const claimRoutes = require("./routes/claimRoutes");
const customerRoutes = require("./routes/customerRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const profileRoutes = require("./routes/profileRoutes");

// ✅ ADD THIS - Home Routes
const homeRoutes = require("./routes/homeRoutes");

// =========================
// Middleware Imports
// =========================
const { protect } = require("./middleware/authMiddleware");
const authorize = require("./middleware/roleMiddleware");

const app = express();

// =========================
// Global Middlewares
// =========================
app.use(cors());
app.use(express.json());

// =========================
// Home Route
// =========================
app.get("/", (req, res) => {
  res.status(200).send("🚀 Smaze Backend API Running...");
});

// =========================
// API Routes
// =========================

// ✅ ADD THIS - Home Routes (Public - No Auth Required)
app.use("/api/home", homeRoutes);

// Authentication
app.use("/api/auth", authRoutes);

// Categories
app.use("/api/categories", categoryRoutes);

// Shops
app.use("/api/shops", shopRoutes);

// Offers
app.use("/api/offers", offerRoutes);

// Claims
app.use("/api/claims", claimRoutes);

// Saved Offers
app.use("/api/saved-offers", savedOfferRoutes);

// Notifications
app.use("/api/notifications", notificationRoutes);

// Admin
app.use("/api/admin", adminRoutes);

// User
app.use("/api/users", userRoutes);

// Settings
app.use("/api/settings", settingsRoutes);

// Customer
app.use("/api/customer", customerRoutes);

// Profile
app.use("/api/profile", profileRoutes);

// =========================
// Profile Route
// =========================
app.get("/api/profile", protect, (req, res) => {
  const { password, ...user } = req.user;
  res.status(200).json({
    success: true,
    user,
  });
});

// =========================
// Temporary Test Routes (Remove later)
// =========================

// Shop Owner Test
app.get("/api/shop", protect, authorize("SHOP_OWNER"), (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome Shop Owner",
  });
});

// Admin Test
app.get("/api/admin", protect, authorize("ADMIN"), (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome Admin",
  });
});

// =========================
// 404 Handler
// =========================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

module.exports = app;
