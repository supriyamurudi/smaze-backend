const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// =======================================
// GET CUSTOMER DASHBOARD
// GET /api/customer/dashboard
// =======================================
const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Customer Details
    const customer = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
      },
    });

    // Dashboard Stats
    const savedOffers = await prisma.savedOffer.count({
      where: {
        userId,
      },
    });

    const notifications = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    const availableOffers = await prisma.offer.count();

    const nearbyShops = await prisma.shop.count();

    // Trending Offers
    const trendingOffers = await prisma.offer.findMany({
      take: 6,
      include: {
        shop: true,
        category: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Recommended Offers
    const recommendedOffers = await prisma.offer.findMany({
      skip: 6,
      take: 6,
      include: {
        shop: true,
        category: true,
      },
      orderBy: {
        discount: "desc",
      },
    });

    // Nearby Offers
    const nearbyOffers = await prisma.offer.findMany({
      take: 6,
      include: {
        shop: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Ending Soon
    const endingSoon = await prisma.offer.findMany({
      take: 6,
      include: {
        shop: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      success: true,

      customer: {
        name: customer?.name || "Customer",
      },

      stats: {
        availableOffers,
        savedOffers,
        notifications,
        nearbyShops,
      },

      trendingOffers,
      recommendedOffers,
      nearbyOffers,
      endingSoon,
    });
  } catch (error) {
    console.error("Dashboard Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load dashboard",
    });
  }
};

module.exports = {
  getDashboard,
};
