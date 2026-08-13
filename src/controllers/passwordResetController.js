// backend/src/controllers/passwordResetController.js
const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");
const { sendPasswordResetOTP } = require("../services/emailService");
const axios = require("axios");

// Store OTPs temporarily (in production, use Redis or database)
const otpStore = {};

// ===============================
// Generate OTP
// ===============================
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ===============================
// Verify Google reCAPTCHA v2
// ===============================
const verifyRecaptcha = async (recaptchaToken) => {
  try {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    const verificationUrl = "https://www.google.com/recaptcha/api/siteverify";

    const response = await axios.post(verificationUrl, null, {
      params: {
        secret: secretKey,
        response: recaptchaToken,
      },
    });

    return response.data.success;
  } catch (error) {
    console.error("reCAPTCHA verification error:", error);
    return false;
  }
};

// ===============================
// Request Password Reset OTP (with CAPTCHA)
// ===============================
const requestPasswordReset = async (req, res) => {
  try {
    const { email, recaptchaToken } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (!recaptchaToken) {
      return res.status(400).json({
        success: false,
        message: "Please complete the CAPTCHA verification",
      });
    }

    // Verify CAPTCHA
    const isCaptchaValid = await verifyRecaptcha(recaptchaToken);
    if (!isCaptchaValid) {
      return res.status(400).json({
        success: false,
        message: "CAPTCHA verification failed. Please try again.",
      });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email address",
      });
    }

    // Check if user has requested OTP recently (rate limiting)
    const existingRequest = otpStore[user.id];
    if (existingRequest) {
      const timeSinceLastRequest = Date.now() - existingRequest.requestedAt;
      if (timeSinceLastRequest < 60000) {
        // 1 minute
        return res.status(429).json({
          success: false,
          message: "Please wait 1 minute before requesting another OTP",
          waitTime: Math.ceil((60000 - timeSinceLastRequest) / 1000),
        });
      }
    }

    // Generate OTP
    const otp = generateOTP();

    // Store OTP with expiry (10 minutes)
    otpStore[user.id] = {
      otp,
      email: user.email,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      attempts: 0,
      requestedAt: Date.now(),
    };

    // Send OTP via email
    const emailResult = await sendPasswordResetOTP(user.email, otp, user.name);

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP. Please try again.",
      });
    }

    res.status(200).json({
      success: true,
      message: "OTP sent successfully to your email",
      userId: user.id,
    });
  } catch (error) {
    console.error("Request password reset error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

// ===============================
// Verify OTP
// ===============================
const verifyOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({
        success: false,
        message: "User ID and OTP are required",
      });
    }

    const storedData = otpStore[userId];

    if (!storedData) {
      return res.status(400).json({
        success: false,
        message: "OTP not found or expired. Please request a new one.",
      });
    }

    // Check if OTP is expired
    if (Date.now() > storedData.expiresAt) {
      delete otpStore[userId];
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    // Check attempts
    if (storedData.attempts >= 3) {
      delete otpStore[userId];
      return res.status(400).json({
        success: false,
        message: "Too many failed attempts. Please request a new OTP.",
      });
    }

    // Verify OTP
    if (storedData.otp !== otp) {
      storedData.attempts += 1;
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${3 - storedData.attempts} attempts remaining.`,
      });
    }

    // OTP verified - generate reset token
    const resetToken =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    // Store reset token
    otpStore[userId].verified = true;
    otpStore[userId].verifiedAt = Date.now();
    otpStore[userId].resetToken = resetToken;

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      resetToken,
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

// ===============================
// Reset Password
// ===============================
const resetPassword = async (req, res) => {
  try {
    const { userId, resetToken, newPassword } = req.body;

    if (!userId || !resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const storedData = otpStore[userId];

    if (!storedData || !storedData.verified) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset session. Please request a new OTP.",
      });
    }

    if (storedData.resetToken !== resetToken) {
      return res.status(400).json({
        success: false,
        message: "Invalid reset token. Please request a new OTP.",
      });
    }

    // Check if reset token is expired (15 minutes after verification)
    if (Date.now() - storedData.verifiedAt > 15 * 60 * 1000) {
      delete otpStore[userId];
      return res.status(400).json({
        success: false,
        message: "Reset session expired. Please request a new OTP.",
      });
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Clear OTP data
    delete otpStore[userId];

    res.status(200).json({
      success: true,
      message:
        "Password reset successfully. You can now login with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

// ===============================
// Resend OTP
// ===============================
const resendOTP = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user has requested recently
    const existingRequest = otpStore[userId];
    if (existingRequest) {
      const timeSinceLastRequest = Date.now() - existingRequest.requestedAt;
      if (timeSinceLastRequest < 60000) {
        return res.status(429).json({
          success: false,
          message: "Please wait 1 minute before requesting another OTP",
          waitTime: Math.ceil((60000 - timeSinceLastRequest) / 1000),
        });
      }
    }

    // Generate new OTP
    const otp = generateOTP();

    otpStore[userId] = {
      otp,
      email: user.email,
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0,
      requestedAt: Date.now(),
    };

    // Send OTP via email
    const emailResult = await sendPasswordResetOTP(user.email, otp, user.name);

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP. Please try again.",
      });
    }

    res.status(200).json({
      success: true,
      message: "OTP resent successfully",
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

module.exports = {
  requestPasswordReset,
  verifyOTP,
  resetPassword,
  resendOTP,
};
