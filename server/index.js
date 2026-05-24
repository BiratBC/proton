import express from "express"
import cors from "cors"
import http from "http"
import dotenv from 'dotenv'
// import cookieParser from "cookie-parser";


const PORT = 5000;


import { requireAuth } from './middleware/authMiddleware.js';
import { initializeWebSocket } from "./services/websocket.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Create standard HTTP server wrapper for Express
const server = http.createServer(app);

// Initialize our modular real-time analytics and WebSocket server
initializeWebSocket(server);

// Example REST Endpoint using your existing auth middleware
app.get('/api/protected-route', requireAuth, (req, res) => {
  res.json({ message: "Verified route accessed successfully." });
});

server.listen(PORT, () => {
    console.log(`Server has started on port ${PORT}`);
    
})