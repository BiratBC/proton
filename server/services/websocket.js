// server/services/websocket.js
import { WebSocketServer } from 'ws';
import { db } from '../firebase/firebaseAdmin.js';
import { calculateExposureRisk } from './calculateExposureRisk.js';

let wss;
let telemetryUnsubscribe = null;
let latestTelemetryPayload = null;

export function initializeWebSocket(server) {
  if (wss) return;

  wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log('Client connected to Proton live stream channel.');
    ws.send(JSON.stringify({ status: 'connected', message: 'Live stream matrix ready.' }));

    if (latestTelemetryPayload) {
      ws.send(JSON.stringify(latestTelemetryPayload));
    }

    ws.on('close', () => console.log('Client disconnected from socket.'));
  });

  startTelemetryListener();
}

function startTelemetryListener() {
  if (telemetryUnsubscribe) return;

  telemetryUnsubscribe = db.collection('telemetry_logs')
    .orderBy('timestamp', 'desc')
    .limit(1)
    .onSnapshot(
      (snapshot) => {
        if (snapshot.empty) return;

        const latestDoc = snapshot.docs[0];
        const latestData = latestDoc.data() ?? {};
        const heartRate = Number(latestData.heartRate);
        const pm25 = Number(latestData.pm25);

        if (!Number.isFinite(heartRate) || !Number.isFinite(pm25)) {
          console.warn('Skipping telemetry payload with invalid numeric fields.', latestData);
          return;
        }

        const timestamp = latestData.timestamp?.toDate
          ? latestData.timestamp.toDate().toISOString()
          : latestData.timestamp ?? null;

        const riskScore = calculateExposureRisk(heartRate, pm25);

        const enrichedPayload = {
          ...latestData,
          id: latestDoc.id,
          timestamp,
          exposureRiskScore: riskScore,
          processedAt: new Date().toISOString(),
        };

        latestTelemetryPayload = enrichedPayload;

        console.log(`📡 New telemetry processed. Broadcaster pumping risk score: ${riskScore}`);
        broadcastData(enrichedPayload);
      },
      (error) => {
        console.error('Firestore realtime sync failure:', error);
      },
    );
}

function broadcastData(payload) {
  if (!wss) return;

  const payloadString = JSON.stringify(payload);

  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(payloadString);
    }
  });
}