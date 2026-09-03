require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

// Import your main app routes (assuming they are in ./src/app)
const app = require("./src/app");

// ✅ SETUP MIDDLEWARE (Must come BEFORE routes)
app.use(
  cors({
    origin: "https://www.smaze.in", // ⚠️ CHANGE THIS to your actual frontend URL (no trailing slash)
    credentials: true, // ✅ CRITICAL: Allows cookies to be sent
  }),
);

app.use(cookieParser()); // ✅ Parses cookies from requests

// ✅ Body parsers (if not already in ./src/app)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
