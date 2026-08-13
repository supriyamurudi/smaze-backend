const nodemailer = require("nodemailer");

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

const sendPasswordResetEmail = async (email, resetToken, userName) => {
  const transporter = createTransporter();
  const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: `"Smaze" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Password Reset Request - Smaze",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #7c3aed; font-size: 28px; margin-bottom: 0;">🛍️ Smaze</h1>
          <p style="color: #6b7280; font-size: 14px;">Reset Your Password</p>
        </div>

        <div style="background-color: white; padding: 30px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h2 style="color: #1f2937; font-size: 20px; margin-top: 0;">Hello ${userName || "User"},</h2>

          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            We received a request to reset your password for your Smaze account.
            Click the button below to create a new password:
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="display: inline-block; 
                      background: linear-gradient(135deg, #7c3aed, #6d28d9); 
                      color: white; 
                      padding: 14px 32px; 
                      border-radius: 8px; 
                      text-decoration: none; 
                      font-weight: 600; 
                      font-size: 16px;
                      box-shadow: 0 4px 6px rgba(124, 58, 237, 0.3);">
              Reset Password
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            This link will expire in <strong>1 hour</strong>.
          </p>

          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 20px;">
            If you didn't request this, please ignore this email.
          </p>
        </div>

        <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
          <p>© 2024 Smaze. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendPasswordResetEmail };
