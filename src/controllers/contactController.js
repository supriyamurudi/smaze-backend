// backend/src/controllers/contactController.js
const prisma = require("../config/prisma");

// ===============================
// Send Contact Message (Public)
// ===============================
const sendContactMessage = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate input
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // ✅ Save to database (This works perfectly!)
    const contact = await prisma.contactMessage.create({
      data: {
        name,
        email,
        subject,
        message,
      },
    });

    // ✅ Return success to the user immediately!
    return res.status(200).json({
      success: true,
      message: "Message sent successfully!",
      data: contact,
    });
  } catch (error) {
    console.error("Contact form error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to send message",
    });
  }
};

// ===============================
// Get All Contact Messages (Admin)
// ===============================
const getContactMessages = async (req, res) => {
  try {
    const { page = 1, limit = 10, isRead, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let where = {};

    if (isRead !== undefined && isRead !== "") {
      where.isRead = isRead === "true";
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
        { message: { contains: search, mode: "insensitive" } },
      ];
    }

    const [messages, total] = await Promise.all([
      prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.contactMessage.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching contact messages:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Get Single Contact Message
// ===============================
const getContactMessageById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid message ID",
      });
    }

    const message = await prisma.contactMessage.findUnique({
      where: { id },
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    // Mark as read
    await prisma.contactMessage.update({
      where: { id },
      data: { isRead: true },
    });

    return res.status(200).json({
      success: true,
      message,
    });
  } catch (error) {
    console.error("Error fetching contact message:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Delete Contact Message
// ===============================
const deleteContactMessage = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid message ID",
      });
    }

    await prisma.contactMessage.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting contact message:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Mark Message as Read/Unread
// ===============================
const toggleMessageRead = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { isRead } = req.body;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid message ID",
      });
    }

    if (isRead === undefined || typeof isRead !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isRead must be a boolean value",
      });
    }

    const message = await prisma.contactMessage.update({
      where: { id },
      data: { isRead },
    });

    return res.status(200).json({
      success: true,
      message: `Message marked as ${isRead ? "read" : "unread"}`,
      data: message,
    });
  } catch (error) {
    console.error("Error toggling message read status:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Reply to Contact Message
// ===============================
const replyToMessage = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { reply } = req.body;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid message ID",
      });
    }

    if (!reply || reply.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Reply message is required",
      });
    }

    const message = await prisma.contactMessage.findUnique({
      where: { id },
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    // Send reply email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const replyMailOptions = {
      from: process.env.EMAIL_USER,
      to: message.email,
      subject: `Re: ${message.subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #7c3aed, #ec4899); color: white; padding: 20px; border-radius: 10px 10px 0 0; }
            .content { background: #f8fafc; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0; }
            .reply-box { background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #7c3aed; margin: 10px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>📨 Reply from Smaze Team</h2>
            </div>
            <div class="content">
              <p>Dear ${message.name},</p>
              <p>Thank you for reaching out to us. Here's our response to your query:</p>
              
              <div class="reply-box">
                <p>${reply}</p>
              </div>
              
              <p>If you have any further questions, feel free to reply to this email.</p>
              
              <br />
              <p>Best regards,</p>
              <p><strong>Team Smaze</strong></p>
              <p>📍 Belagavi, Karnataka, India</p>
              <p>📧 support@smaze.in</p>
            </div>
            <div class="footer">
              <p>Smaze - Local Discovery Platform</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(replyMailOptions);

    // Update message as replied
    await prisma.contactMessage.update({
      where: { id },
      data: {
        replied: true,
        repliedAt: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Reply sent successfully",
    });
  } catch (error) {
    console.error("Error sending reply:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Get Unread Message Count
// ===============================
const getUnreadCount = async (req, res) => {
  try {
    const count = await prisma.contactMessage.count({
      where: { isRead: false },
    });

    return res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Bulk Delete Messages
// ===============================
const bulkDeleteMessages = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No message IDs provided",
      });
    }

    const validIds = ids
      .filter((id) => !isNaN(parseInt(id)))
      .map((id) => parseInt(id));

    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid message IDs provided",
      });
    }

    const result = await prisma.contactMessage.deleteMany({
      where: {
        id: { in: validIds },
      },
    });

    return res.status(200).json({
      success: true,
      message: `${result.count} messages deleted successfully`,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error("Error bulk deleting messages:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Get Message Stats
// ===============================
const getMessageStats = async (req, res) => {
  try {
    const [total, unread, replied] = await Promise.all([
      prisma.contactMessage.count(),
      prisma.contactMessage.count({ where: { isRead: false } }),
      prisma.contactMessage.count({ where: { replied: true } }),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        total,
        unread,
        replied,
        read: total - unread,
      },
    });
  } catch (error) {
    console.error("Error fetching message stats:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  sendContactMessage,
  getContactMessages,
  getContactMessageById,
  deleteContactMessage,
  toggleMessageRead,
  replyToMessage,
  getUnreadCount,
  bulkDeleteMessages,
  getMessageStats,
};
