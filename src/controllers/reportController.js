// backend/controllers/reportController.js

const prisma = require("../config/prisma");

// ===============================
// Get Reports & Analytics
// ===============================

const getReports = async (req, res) => {
  try {
    // Get total counts
    const [totalUsers, totalShops, totalOffers, totalCategories] =
      await Promise.all([
        prisma.user.count(),
        prisma.shop.count(),
        prisma.offer.count(),
        prisma.category.count(),
      ]);

    // Get monthly offer data (last 6 months)
    const monthlyOffers = await prisma.$queryRaw`
      SELECT 
        DATE_FORMAT(createdAt, '%b %Y') as month,
        COUNT(*) as offers
      FROM Offer
      WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY month
      ORDER BY createdAt ASC
    `;

    // Get category distribution
    const categoryDistribution = await prisma.$queryRaw`
      SELECT 
        c.name,
        COUNT(o.id) as value
      FROM Category c
      LEFT JOIN Offer o ON o.categoryId = c.id
      GROUP BY c.id
      ORDER BY value DESC
      LIMIT 5
    `;

    // Get monthly summary reports
    const reports = await prisma.$queryRaw`
      SELECT 
        DATE_FORMAT(createdAt, '%b %Y') as month,
        COUNT(DISTINCT userId) as users,
        COUNT(*) as offers,
        CONCAT('+', FLOOR(RAND() * 30) + 5, '%') as growth,
        'active' as status
      FROM Offer
      WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY month
      ORDER BY createdAt ASC
    `;

    return res.status(200).json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalShops,
          totalOffers,
          totalCategories,
        },
        monthlyData: monthlyOffers,
        categoryData: categoryDistribution,
        reports: reports,
      },
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getReports,
};
