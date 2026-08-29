const prisma = require("../config/prisma");

// ✅ Submit Website Feedback (Customer -> Admin)
const submitWebsiteFeedback = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Feedback message is required",
      });
    }

    const feedback = await prisma.websiteFeedback.create({
      data: {
        userId: req.user.id,
        message: message.trim(),
      },
    });

    res.status(201).json({
      success: true,
      message: "Feedback submitted successfully. Thank you!",
      feedback,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ✅ Get All Website Feedback (Admin Only)
const getWebsiteFeedback = async (req, res) => {
  try {
    const feedback = await prisma.websiteFeedback.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      feedback,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  submitWebsiteFeedback,
  getWebsiteFeedback,
};
