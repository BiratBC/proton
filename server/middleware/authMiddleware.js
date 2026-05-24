// server/middleware/authMiddleware.js
import admin from "../firebase/firebaseAdmin.js"; // Correct relative path traversal

export const requireAuth = async (req, res, next) => {
  const token = req.cookies?.session || req.headers.authorization?.split("Bearer ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    // This works perfectly now because admin is the default export from firebaseAdmin.js
    req.user = await admin.auth().verifyIdToken(token);
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};