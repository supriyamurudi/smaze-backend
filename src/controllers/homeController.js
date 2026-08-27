// backend/src/controllers/homeController.js
const prisma = require("../config/prisma");

// ===============================
// Get Home Stats (Public - No Auth Required)
// ===============================
const getHomeStats = async (req, res) => {
  try {
    const [totalShops, totalCustomers, totalOffers] = await prisma.$transaction(
      [
        prisma.shop.count({
          where: {
            status: "active", // Only approved shops
          },
        }),
        prisma.user.count({
          where: {
            role: "CUSTOMER",
            status: "ACTIVE",
          },
        }),
        prisma.offer.count({
          where: {
            endDate: {
              gte: new Date(),
            },
          },
        }),
      ],
    );

    res.status(200).json({
      success: true,
      data: {
        totalShops: Number(totalShops) || 0,
        totalCustomers: Number(totalCustomers) || 0,
        totalOffers: Number(totalOffers) || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching home stats:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Get Home Page Data (Combined)
// ===============================
const getHomeData = async (req, res) => {
  try {
    const [categories, offers, shops, stats] = await Promise.all([
      prisma.category.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
      }),
      prisma.offer.findMany({
        where: { endDate: { gte: new Date() } },
        take: 6,
        include: { shop: true, category: true },
        orderBy: { views: "desc" },
      }),
      prisma.shop.findMany({
        where: { status: "ACTIVE" },
        take: 6,
        include: { category: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.$transaction([
        prisma.shop.count({ where: { status: "ACTIVE" } }),
        prisma.user.count({ where: { role: "CUSTOMER", status: "ACTIVE" } }),
        prisma.offer.count({ where: { endDate: { gte: new Date() } } }),
      ]),
    ]);

    res.json({
      success: true,
      categories,
      offers,
      shops,
      stats: {
        totalShops: stats[0],
        totalCustomers: stats[1],
        totalOffers: stats[2],
      },
    });
  } catch (error) {
    console.error("Error fetching home data:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getHomeStats,
  getHomeData,
};
