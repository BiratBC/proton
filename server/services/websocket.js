// server/services/websocket.js
import { WebSocketServer } from "ws";
import { db } from "../firebase/firebaseAdmin.js";
// 1. Updated path name to match your dynamic sensitivity calculation engine file
import { calculateExposureRisk } from "./calculateExposureRisk.js";

let wss;
let latestTelemetryPayloadByUser = new Map();
let userListenerRefs = new Map();

export function initializeWebSocket(server) {
  if (wss) return;

  wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    ws.userId = null;

    console.log("Client connected to Proton live stream channel.");
    ws.send(
      JSON.stringify({
        status: "connected",
        message: "Live stream matrix ready.",
      }),
    );

    ws.on("message", (rawMessage) => {
      try {
        const parsed = JSON.parse(String(rawMessage));

        if (parsed?.type === "subscribe" && parsed?.userId) {
          const previousUser = ws.userId;
          ws.userId = parsed.userId;

          if (previousUser && previousUser !== ws.userId) {
            console.log(`Client switched subscription from ${previousUser} to ${ws.userId}`);
          }

          subscribeUser(parsed.userId);

          const cachedPayload = latestTelemetryPayloadByUser.get(parsed.userId);
          if (cachedPayload) {
            ws.send(JSON.stringify(cachedPayload));
          }

          ws.send(JSON.stringify({ type: "subscribed", userId: parsed.userId }));
          return;
        }

        if (parsed?.type === "unsubscribe") {
          ws.userId = null;
          ws.send(JSON.stringify({ type: "unsubscribed" }));
        }
      } catch (error) {
        console.error("Failed to process websocket subscription message", error);
      }
    });

    ws.on("close", () => {
      console.log("Client disconnected from socket.");
    });
  });
}

function subscribeUser(userId) {
  if (userListenerRefs.has(userId)) {
    return;
  }

  console.log(
    `Starting real-time listener for user subcollection: users/${userId}/health_data`,
  );

  const unsubscribe = db
    .collection("users")
    .doc(userId)
    .collection("health_data")
    .orderBy("date", "desc")
    .limit(1)
    .onSnapshot(
      (snapshot) => {
        if (snapshot.empty) {
          console.log(`No documents found under users/${userId}/health_data`);
          latestTelemetryPayloadByUser.delete(userId);
          return;
        }

        const latestDoc = snapshot.docs[0];
        const latestData = latestDoc.data() ?? {};

        const heartRate = Number(latestData.avg_heart_rate || latestData.heartRate);
        const pm25 =
          latestData.pm25 !== undefined ? Number(latestData.pm25) : 12.0;

        if (!Number.isFinite(heartRate) || !Number.isFinite(pm25)) {
          console.warn(
            "Skipping telemetry payload with invalid numeric fields.",
            latestData,
          );
          return;
        }

        let resolvedTimestamp = null;
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

        const userRestingHR = 65;
        const evaluation = calculateExposureRisk(
          heartRate,
          pm25,
          userRestingHR,
        );

        const enrichedPayload = {
          ...latestData,
          userId,
          id: latestDoc.id,
          timestamp: resolvedTimestamp,
          exposureRiskScore: evaluation.riskScore,
          sensitivityCoefficient: evaluation.sensitivityCoefficient,
          riskLevel: evaluation.riskLevel,
          alertUser: evaluation.alertUser,
          processedAt: new Date().toISOString(),
        };

        latestTelemetryPayloadByUser.set(userId, enrichedPayload);

        console.log(
          `📡 Broadcast packet generated -> Risk Score: ${evaluation.riskScore} (${evaluation.riskLevel})`,
        );
        broadcastData(enrichedPayload);
      },
      (error) => {
        console.error("Firestore realtime sync failure:", error);
      },
    );

  userListenerRefs.set(userId, unsubscribe);
}

function broadcastData(payload) {
  if (!wss) return;

  const payloadString = JSON.stringify(payload);

  wss.clients.forEach((client) => {
    if (client.readyState === 1 && client.userId === payload.userId) {
      client.send(payloadString);
    }
  });
}
