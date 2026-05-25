import { useEffect, useMemo, useRef, useState } from "react";
import MapDashboard from "../Components/MapDashboard.jsx";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { deviceLocationsData, fetchDeviceLocationsData } from "../lib/dummyData.js";

import { auth } from "../firebase.js";

const DEFAULT_WS_URL = "ws://localhost:5000";
const getSocketUrl = () => import.meta.env.VITE_WS_URL || DEFAULT_WS_URL;

export default function RealtimeVerifier() {
  // Array of 50 active sensor nodes mapped to your frontend state

  const [status, setStatus] = useState("idle");
  const [messages, setMessages] = useState([]);
  const [lastPayload, setLastPayload] = useState(null);
  const [sensorData, setSensorData] = useState(null);
  const [dbStatus, setDbStatus] = useState("waiting"); // "waiting" | "live" | "error"
  const [airData, setAirData] = useState(null);
  const [deviceLocations, setDeviceLocations] = useState(deviceLocationsData);
  const [activeUserId, setActiveUserId] = useState(auth.currentUser?.uid ?? null);

  const socketUrl = useMemo(() => getSocketUrl(), []);
  const wsRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    fetchDeviceLocationsData()
      .then((data) => {
        if (mounted) {
          setDeviceLocations(data);
        }
      })
      .catch(() => {
        if (mounted) {
          setDeviceLocations(deviceLocationsData);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const pickLatestReading = (readings = []) => {
    const normalized = readings
      .filter(Boolean)
      .map((reading) => {
        const timestamp = reading.timestamp ?? reading.time ?? reading.date;
        const parsedTimestamp = timestamp ? Date.parse(timestamp) : NaN;

        return {
          ...reading,
          parsedTimestamp: Number.isFinite(parsedTimestamp) ? parsedTimestamp : -Infinity,
        };
      })
      .sort((a, b) => b.parsedTimestamp - a.parsedTimestamp);

    return normalized[0] ?? null;
  };

  const latestVitals = useMemo(() => {
    const source = sensorData ?? lastPayload ?? {};
    const latestHeartRateReading = pickLatestReading(source.heart_rate_readings);
    const latestSpo2Reading = pickLatestReading(source.spo2_readings);

    return {
      heartRate:
        source.avg_heart_rate ??
        latestHeartRateReading?.bpm ??
        latestHeartRateReading?.value ??
        source.heartRate ??
        source.heart_rate ??
        source.hr ??
        source.heartRateValue,
      spo2:
        source.avg_spo2 ??
        latestSpo2Reading?.percentage ??
        latestSpo2Reading?.value ??
        source.spo2 ??
        source.spO2 ??
        source.spo2Value,
      steps:
        source.steps ??
        source.step_count ??
        source.stepCount ??
        source.total_steps ??
        source.stepsTaken,
    };
  }, [sensorData, lastPayload]);

  // ── WebSocket ────────────────────────────────────────────────────────────
  const connect = () => {
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) wsRef.current.close();
      if (wsRef.current.readyState === WebSocket.CLOSED) wsRef.current = null;
      if (wsRef.current?.readyState === WebSocket.CONNECTING) return;
    }

    setStatus("connecting");
    const ws = new WebSocket(socketUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      addMessage("system", `Connected to ${socketUrl}`);

      if (activeUserId) {
        ws.send(
          JSON.stringify({
            type: "subscribe",
            userId: activeUserId,
          }),
        );
      }
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);

        if (parsed?.status === "connected") {
          return;
        }

        if (parsed?.type === "subscribed") {
          return;
        }

        setLastPayload(parsed);
        addMessage(
          "telemetry",
          `Received ${Object.keys(parsed).length} fields`,
          parsed,
        );
      } catch {
        addMessage("error", "Received non-JSON payload", event.data);
      }
    };

    ws.onerror = () => {
      setStatus("error");
      addMessage("error", "WebSocket error while connecting or streaming");
    };

    ws.onclose = () => {
      if (wsRef.current === ws) wsRef.current = null;
      setStatus("disconnected");
      addMessage("system", "Disconnected from websocket");
    };
  };

  const addMessage = (type, text, payload = null) => {
    setMessages((prev) =>
      [
        { type, text, time: new Date().toLocaleTimeString(), payload },
        ...prev,
      ].slice(0, 8),
    );
  };

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.close();
    };
  }, []);
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "air_quality", "esp32_sensor_1"),
      (snapshot) => {
        if (snapshot.exists()) {
          setAirData(snapshot.data());          
        }
      },
      (err) => console.error("Air quality listener error:", err),
    );

    return () => unsubscribe();
  }, []);

  // ── Firestore real-time listener ─────────────────────────────────────────
  useEffect(() => {
    let unsubscribe = null;
    const authUnsubscribe = auth.onAuthStateChanged((user) => {
      const nextUserId = user?.uid ?? null;

      console.log(`User : ${nextUserId ?? "anonymous"}`);
      setActiveUserId(nextUserId);
      setLastPayload(null);

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: nextUserId ? "subscribe" : "unsubscribe",
            userId: nextUserId,
          }),
        );
      }

      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }

      if (!user) {
        setSensorData(null);
        setDbStatus("waiting");
        return;
      }

      const baseCollection = collection(db, "users", user.uid, "health_data");

      const attachQuery = (queryConfig, onEmpty) => {
        unsubscribe = onSnapshot(
          queryConfig,
          (snapshot) => {
            if (!snapshot.empty) {
              const latest = snapshot.docs[0].data();
              setSensorData(latest);
              setDbStatus("live");
              return;
            }

            if (typeof onEmpty === "function") {
              onEmpty();
            }
          },
          (err) => {
            console.error("Firestore error:", err);
            setSensorData(null);
            setDbStatus("error");
          },
        );
      };

      const fallbackToSpo2Readings = () => {
        attachQuery(
          query(
            baseCollection,
            orderBy("spo2_readings.timestamp", "desc"),
            limit(1),
          ),
          () => {
            setSensorData(null);
            setDbStatus("waiting");
          },
        );
      };

      attachQuery(
        query(baseCollection, orderBy("date", "desc"), limit(1)),
        fallbackToSpo2Readings,
      );
    });

    return () => {
      if (unsubscribe) unsubscribe();
      authUnsubscribe();
    };
  }, []);

  // ── Derived UI values ────────────────────────────────────────────────────
  const statusColor = useMemo(() => {
    if (status === "connected")
      return "text-emerald-400 bg-emerald-500/15 border border-emerald-500/30";
    if (status === "connecting")
      return "text-amber-400 bg-amber-500/15 border border-amber-500/30";
    if (status === "error")
      return "text-rose-400 bg-rose-500/15 border border-rose-500/30";
    return "text-slate-400 bg-slate-500/15 border border-slate-500/30";
  }, [status]);

  const statusLabel = useMemo(() => {
    if (status === "connected") return "Pipeline: Streaming";
    if (status === "connecting") return "Pipeline: Connecting";
    if (status === "error") return "Pipeline: Error";
    return "Pipeline: Idle";
  }, [status]);

  const dbStatusColor = {
    live: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
    waiting: "text-amber-400 bg-amber-500/15 border-amber-500/30",
    error: "text-rose-400 bg-rose-500/15 border-rose-500/30",
  }[dbStatus];

  const dbStatusLabel = {
    live: "Sync: Active",
    waiting: "Sync: Standby",
    error: "Sync: Offline",
  }[dbStatus];

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-emerald-950 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10 lg:px-10">
        {/* ── Header card ───────────────────────────────────────────────── */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          <p className="mb-3 text-sm uppercase tracking-[0.3em] text-emerald-300">
            Proton Live Telemetry Monitor
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">
            Real-Time Health & Environmental Analytics
          </h1>
          <p className="mt-4 max-w-3xl text-slate-200">
            Monitoring active biometric feeds and environmental telemetry logs.
            Ensure network streaming statuses remain green to maintain optimal
            evaluation pipeline throughput.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-4 py-2 text-sm font-semibold ${statusColor}`}
            >
              {statusLabel}
            </span>

            <span
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${dbStatusColor}`}
            >
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle ${dbStatus === "live" ? "bg-emerald-400 animate-pulse" : dbStatus === "error" ? "bg-rose-400" : "bg-amber-400"}`}
              />
              {dbStatusLabel}
            </span>

            <span className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100">
              Gateway: {socketUrl.replace("ws://", "")}
            </span>

            <button
              type="button"
              onClick={connect}
              className="rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-emerald-400 active:scale-95 cursor-pointer"
            >
              Reconnect Stream
            </button>
          </div>
        </div>

        {/* ── Middle row (Payload Dashboards) ──────────────────────────── */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Column A: WebSocket Enriched Payload */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-semibold text-white">
                  WebSocket Payload Feed
                </h2>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                  Enriched Live
                </span>
              </div>
              <p className="text-sm text-slate-300">
                The computed state payload broadcast from the custom calculation
                matrix pipeline.
              </p>

              <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/60 p-4 h-64 overflow-auto custom-scrollbar">
                {lastPayload ? (
                  <pre className="text-xs font-mono text-emerald-300 whitespace-pre-wrap">
                    {JSON.stringify(lastPayload, null, 2)}
                  </pre>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">
                    Awaiting upcoming stream packets...
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Calculated Risk Score
                </p>
                <p className="mt-2 text-2xl font-bold text-emerald-400">
                  {lastPayload?.exposureRiskScore ?? "—"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Processed At
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-200">
                  {lastPayload?.processedAt
                    ? new Date(lastPayload.processedAt).toLocaleTimeString()
                    : "Waiting for stream..."}
                </p>
              </div>
            </div>
          </div>

          {/* Column B: Native Firestore Storage Payload */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur flex flex-col justify-between">
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Source Pulse Rate
                </p>
                <p className="mt-2 text-2xl font-bold text-cyan-400">
                  {latestVitals.heartRate != null
                    ? `${latestVitals.heartRate} bpm`
                    : "—"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Blood Oxygen (SpO2)
                </p>
                <p className="mt-2 text-2xl font-bold text-cyan-400">
                  {latestVitals.spo2 != null ? `${latestVitals.spo2} %` : "—"}
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Air Quality
                </p>
                <p className="mt-2 text-2xl font-bold text-cyan-400">
                  {latestVitals.steps != null ? `${latestVitals.steps} steps` : "—"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Risk Level
                </p>
                <p className="mt-2 text-2xl font-bold text-cyan-400">
                  {lastPayload?.riskLevel ? `${lastPayload.riskLevel}` : "—"}
                </p>
              </div>
            </div>
            {/* ── Air Quality row — now reading from airData ── */}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  CO Concentration
                </p>
                <p className="mt-2 text-2xl font-bold text-cyan-400">
                  {airData?.co_ppm != null ? `${airData.co_ppm} ppm` : "—"}
                </p>
                {airData?.co_status && (
                  <p className="mt-1 text-xs text-slate-400">
                    {airData.co_status}
                  </p>
                )}
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Particulate Matter (PM2.5)
                </p>
                <p className="mt-2 text-2xl font-bold text-cyan-400">
                  {airData?.dust_density != null
                    ? `${airData.dust_density} µg/m³`
                    : "—"}
                </p>
                {airData?.dust_label && (
                  <p className="mt-1 text-xs text-slate-400">
                    {airData.dust_label}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Event Log ─────────────────────────────────────────────────── */}
        {messages.length > 0 && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <h2 className="text-xl font-semibold text-white mb-4">
              System Operational Logs
            </h2>
            <div className="flex flex-col gap-2">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 rounded-xl px-4 py-2.5 text-sm border ${
                    msg.type === "telemetry"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-200"
                      : msg.type === "error"
                        ? "bg-rose-500/10 border-rose-500/20 text-rose-200"
                        : "bg-white/5 border-white/10 text-slate-300"
                  }`}
                >
                  <span className="text-xs text-slate-500 mt-0.5 shrink-0 font-mono">
                    [{msg.time}]
                  </span>
                  <span className="font-mono text-xs">{msg.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Leaflet OpenStreetMap Context Component ───────────────────── */}
        <MapDashboard
          liveData={lastPayload}
          deviceData={deviceLocations}
          userVitals={latestVitals}
          environment={{
            co: airData?.co_ppm,
            pm25: airData?.dust_density,
          }}
        />
      </div>
    </div>
  );
}
