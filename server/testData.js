import { db } from './firebase/firebaseAdmin.js';

await db.collection('telemetry_logs').add({
  deviceId: 'frontend-test-01',
  heartRate: 85,
  pm25: 14.2,
  temperature: 30.8,
  timestamp: new Date(),
});

console.log('Inserted telemetry log');