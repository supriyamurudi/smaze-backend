// backend/src/app.js
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
// ✅ FIXED: CORS Configuration
// =========================

// ✅ Option 1: Explicit allowed origins (Recommended for Production)
const allowedOrigins = [
  // ✅ Production domains - BOTH http and https
  "https://www.smaze.in",
  "http://www.smaze.in", // ⚠️ ADD THIS
  "https://smaze.in",
  "http://smaze.in", // ⚠️ ADD THIS

  // ✅ Vercel preview URLs - NO trailing slashes
  "https://smaze-frontend-git-main-smaze.vercel.app",
  "https://smaze-frontend-f97te0lql-smaze.vercel.app", // ✅ Removed trailing slash
  "https://smaze-frontend-om3bu38yj-smaze.vercel.app",
  "https://smaze-frontend-ou1gmqemd-smaze.vercel.app",
  "https://smaze-frontend-3v8jokjw6-smaze.vercel.app", // ✅ Removed trailing slash

  // ✅ Local development
  "http://localhost:5173",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log(`❌ CORS blocked: ${origin}`);
        callback(new Error(`Not allowed by CORS: ${origin}`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

// ✅ Option 2: Allow all origins (For testing only)
// app.use(cors({
//   origin: "*",
//   credentials: true,
//   methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization"],
// }));

// ✅ Log CORS requests for debugging
app.use((req, res, next) => {
  console.log(
    `📤 ${req.method} ${req.url} from ${req.headers.origin || "same-origin"}`,
  );
  next();
});

// ✅ Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =========================
// Home Route
// =========================
app.get("/", (req, res) => {
  res.status(200).send("🚀 Smaze Backend API Running...");
});

// =========================
// ✅ Health Check Route
// =========================
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    cors: "enabled",
  });
});

// =========================
// API Routes
// =========================
app.use("/api/home", homeRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/shops", shopRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/claims", claimRoutes);
app.use("/api/saved-offers", savedOfferRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/customer", customerRoutes);
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
app.get("/api/shop", protect, authorize("SHOP_OWNER"), (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome Shop Owner",
  });
});

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

// =========================
// Error Handler
// =========================
app.use((err, req, res, next) => {
  console.error("❌ Error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

module.exports = app;
