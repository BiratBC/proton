// server/firebase/firebaseAdmin.js
import admin from "firebase-admin";
import { readFileSync } from "fs";

// Resolves file relative to where nodemon is executed
const serviceAccount = JSON.parse(readFileSync("./serviceAccountKey.json", "utf8"));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Named export for your database instance (used by services/websocket.js)
export const db = admin.firestore();

// Default export for the primary admin instance (used by middleware/authMiddleware.js)
export default admin;