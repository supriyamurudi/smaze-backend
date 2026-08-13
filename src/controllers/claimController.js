const prisma = require("../config/prisma");
const crypto = require("crypto");

// ===============================
// Customer Claim Offer
// ===============================

exports.claimOffer = async (req, res) => {
  try {
    const userId = req.user.id;

    const { offerId } = req.body;

    if (!offerId) {
      return res.status(400).json({
        message: "Offer ID is required",
      });
    }

    // Check offer exists

    const offer = await prisma.offer.findUnique({
      where: {
        id: Number(offerId),
      },
    });

    if (!offer) {
      return res.status(404).json({
        message: "Offer not found",
      });
    }

    // Check already claimed

    const existingClaim = await prisma.offerClaim.findFirst({
      where: {
        userId,
        offerId: Number(offerId),
      },
    });

    if (existingClaim) {
      return res.status(400).json({
        message: "Offer already claimed",
        claim: existingClaim,
      });
    }

    // Generate claim code

    const claimCode =
      "SMAZE-" + crypto.randomBytes(4).toString("hex").toUpperCase();

    const claim = await prisma.offerClaim.create({
      data: {
        userId,
        offerId: Number(offerId),
        claimCode,
      },
    });

    res.status(201).json({
      message: "Offer claimed successfully",
      claim,
    });
  } catch (error) {
    console.log("Claim Offer Error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// ===============================
// Customer Get My Claims
// ===============================

exports.getMyClaims = async (req, res) => {
  try {
    const userId = req.user.id;

    const claims = await prisma.offerClaim.findMany({
      where: {
        userId,
      },

      include: {
        offer: {
          include: {
            shop: true,
            category: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      claims,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};
