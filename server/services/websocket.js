// server/services/websocket.js
import { WebSocketServer } from "ws";
import { db } from "../firebase/firebaseAdmin.js";
// 1. Updated path name to match your dynamic sensitivity calculation engine file
import { calculateExposureRisk } from "./calculateExposureRisk.js";

let wss;
let telemetryUnsubscribe = null;
let latestTelemetryPayload = null;

// Hardcoded for testing; can be passed dynamically if authentication middleware registers client session ids
const DEFAULT_USER_ID = "lyOlj1IPpyWZPLzyjqw4LVWXKyA3";

export function initializeWebSocket(server) {
  if (wss) return;

  wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    console.log("Client connected to Proton live stream channel.");
    ws.send(
      JSON.stringify({
        status: "connected",
        message: "Live stream matrix ready.",
      }),
    );

    // Send the last processed telemetry state immediately so new pages don't load blank
    if (latestTelemetryPayload) {
      ws.send(JSON.stringify(latestTelemetryPayload));
    }

    ws.on("close", () => console.log("Client disconnected from socket."));
  });

  // Start listener monitoring the targeted subcollection pathway
  startTelemetryListener(DEFAULT_USER_ID);
}

function startTelemetryListener(userId) {
  if (telemetryUnsubscribe) return;

  console.log(
    `Starting real-time listener for user subcollection: users/${userId}/health_data`,
  );

  // Target schema: users (collection) -> userid (document) -> health_data (subcollection)
  telemetryUnsubscribe = db
    .collection("users")
    .doc(userId)
    .collection("health_data")
    .orderBy("date", "desc") // Matches your front-end logic tracking the newest record
    .limit(1)
    .onSnapshot(
      (snapshot) => {
        if (snapshot.empty) {
          console.log(`No documents found under users/${userId}/health_data`);
          return;
        }

        const latestDoc = snapshot.docs[0];
        const latestData = latestDoc.data() ?? {};

        // Extract parameters cleanly (supports direct numbers or nested payload objects depending on your hardware parser)
        const heartRate = Number(
          latestData.avg_heart_rate || latestData.heartRate,
        );
        const pm25 =
          latestData.pm25 !== undefined ? Number(latestData.pm25) : 12.0;

        // Fail-safe validation constraint check
        if (!Number.isFinite(heartRate) || !Number.isFinite(pm25)) {
          console.warn(
            "Skipping telemetry payload with invalid numeric fields.",
            latestData,
          );
          return;
        }

        // 2. Robust Timestamp Parser (Handles raw Unix seconds, milliseconds, or Firebase Timestamps)
        let resolvedTimestamp = null;
        // Check either the 'date' property or fallback fields
        const incomingTime = latestData.date || latestData.timestamp;

        if (incomingTime) {
          if (typeof incomingTime.toDate === "function") {
            resolvedTimestamp = incomingTime.toDate().toISOString();
          } else if (typeof incomingTime === "number") {
            const ms =
              incomingTime < 9999999999 ? incomingTime * 1000 : incomingTime;
            resolvedTimestamp = new Date(ms).toISOString();
          } else {
            resolvedTimestamp = incomingTime;
          }
        } else {
          resolvedTimestamp = new Date().toISOString();
        }

        // 3. Evaluate the dataset using your custom Dynamic physiological strain logic
        const userRestingHR = 65;
        const evaluation = calculateExposureRisk(
          heartRate,
          pm25,
          userRestingHR,
        );

        // 4. Create your fully enriched real-time dataset payload
        const enrichedPayload = {
          ...latestData,
          id: latestDoc.id,
          timestamp: resolvedTimestamp,
          exposureRiskScore: evaluation.riskScore,
          sensitivityCoefficient: evaluation.sensitivityCoefficient,
          riskLevel: evaluation.riskLevel,
          alertUser: evaluation.alertUser,
          processedAt: new Date().toISOString(),
        };

        latestTelemetryPayload = enrichedPayload;

        console.log(
          `📡 Broadcast packet generated -> Risk Score: ${evaluation.riskScore} (${evaluation.riskLevel})`,
        );
        broadcastData(enrichedPayload);
      },
      (error) => {
        console.error("Firestore realtime sync failure:", error);
      },
    );
}

function broadcastData(payload) {
  if (!wss) return;

  const payloadString = JSON.stringify(payload);

  wss.clients.forEach((client) => {
    // Check if the current socket client channel state is active (1 === WebSocket.OPEN)
    if (client.readyState === 1) {
      client.send(payloadString);
    }
  });
}
