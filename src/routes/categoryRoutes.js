const express = require("express");

const {
  addCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");

const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const upload = require("../middleware/upload");

const router = express.Router();

// ========================
// Public
// ========================

router.get("/", getCategories);
router.get("/:id", getCategoryById);

// ========================
// Admin
// ========================

router.post(
  "/",
  protect,
  authorize("ADMIN"),
  upload.single("image"),
  addCategory,
);

router.put(
  "/:id",
  protect,
  authorize("ADMIN"),
  upload.single("image"),
  updateCategory,
);

router.delete("/:id", protect, authorize("ADMIN"), deleteCategory);

module.exports = router;
