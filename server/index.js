import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser";
import admin from "./firebase/firebaseAdmin.js";
const PORT = 5000;

const app = express();

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());

//google OAuth
app.post("/auth/google", async (req, res) => {
  const { idToken } = req.body;
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);

    // Set a secure session cookie (optional but recommended)
    res.cookie("session", idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    res.json({ uid: decoded.uid, email: decoded.email, name: decoded.name });
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
});


//example
app.get("/api/profile", async (req, res) => {
  const token = req.cookies.session;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    res.json({ uid: decoded.uid, email: decoded.email });
  } catch {
    res.status(401).json({ error: "Session expired" });
  }
});

app.listen(PORT, () => {
    console.log(`Server has started on port ${PORT}`);
    
})