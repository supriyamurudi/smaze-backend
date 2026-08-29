const prisma = require("../config/prisma");

// ✅ Submit or Update a Rating (Customer -> Shop)
const submitRating = async (req, res) => {
  try {
    const { shopId, rating, comment } = req.body;

    if (!shopId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Shop ID and rating (1-5) are required",
      });
    }

    // Check if shop exists
    const shop = await prisma.shop.findUnique({
      where: { id: Number(shopId) },
    });

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    // Upsert (Update if exists, Create if not)
    const ratingData = await prisma.shopRating.upsert({
      where: {
        userId_shopId: {
          userId: req.user.id,
          shopId: Number(shopId),
        },
      },
      update: {
        rating: Number(rating),
        comment: comment || "",
      },
      create: {
        userId: req.user.id,
        shopId: Number(shopId),
        rating: Number(rating),
        comment: comment || "",
      },
    });

    res.status(201).json({
      success: true,
      message: "Rating submitted successfully",
      rating: ratingData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ✅ Get All Ratings for a Shop (Public)
const getShopRatings = async (req, res) => {
  try {
    const shopId = Number(req.params.shopId);

    const ratings = await prisma.shopRating.findMany({
      where: { shopId },
      include: {
        user: {
          select: {
            name: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate average rating
    const averageRating =
      ratings.length > 0
        ? ratings.reduce((sum, item) => sum + item.rating, 0) / ratings.length
        : 0;

    res.json({
      success: true,
      ratings,
      averageRating: Math.round(averageRating * 10) / 10,
      totalRatings: ratings.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ✅ Get My Rating for a Shop (To pre-fill the form)
const getMyShopRating = async (req, res) => {
  try {
    const shopId = Number(req.params.shopId);

    const rating = await prisma.shopRating.findUnique({
      where: {
        userId_shopId: {
          userId: req.user.id,
          shopId,
        },
      },
    });

    res.json({
      success: true,
      rating: rating || null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ✅ NEW: Get All Ratings for the Shop Owner's Own Shop
const getMyShopRatings = async (req, res) => {
  try {
    // Find the shop belonging to the logged-in owner
    const shop = await prisma.shop.findFirst({
      where: { ownerId: req.user.id },
    });

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    const ratings = await prisma.shopRating.findMany({
      where: { shopId: shop.id },
      include: {
        user: {
          select: {
            name: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate average rating
    const averageRating =
      ratings.length > 0
        ? ratings.reduce((sum, item) => sum + item.rating, 0) / ratings.length
        : 0;

    res.json({
      success: true,
      ratings,
      averageRating: Math.round(averageRating * 10) / 10,
      totalRatings: ratings.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  submitRating,
  getShopRatings,
  getMyShopRating,
  getMyShopRatings, // ✅ Export this
};
