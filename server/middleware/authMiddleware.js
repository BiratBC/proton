import admin from "./firebaseAdmin.js";

export const requireAuth = async (req, res, next) => {
  const token = req.cookies.session || req.headers.authorization?.split("Bearer ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    req.user = await admin.auth().verifyIdToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};