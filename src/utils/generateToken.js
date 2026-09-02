// Inside your login function, replace the token response:
const token = generateToken(user);

// Set the cookie (HttpOnly, Secure, 30 days)
res.cookie("token", token, {
  httpOnly: true, // Cannot be read by JavaScript (prevents XSS)
  secure: true, // Only sent over HTTPS (Production)
  sameSite: "strict",
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
});

res.status(200).json({
  success: true,
  message: "Login successful",
  user: userResponse,
  // Remove "token" from this JSON response!
});
