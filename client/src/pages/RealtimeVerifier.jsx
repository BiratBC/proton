import { useEffect, useMemo, useRef, useState } from "react";
import MapDashboard from "../Components/MapDashboard.jsx";

const DEFAULT_WS_URL = "ws://localhost:5000";

const getSocketUrl = () =>
  import.meta.env.VITE_WS_URL || DEFAULT_WS_URL;

export default function RealtimeVerifier() {
  const [status, setStatus] = useState("idle");
  const [messages, setMessages] = useState([]);
  const [lastPayload, setLastPayload] = useState(null);
  const socketUrl = useMemo(() => getSocketUrl(), []);
  const wsRef = useRef(null);

  const connect = () => {
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }

      if (wsRef.current.readyState === WebSocket.CLOSED) {
        wsRef.current = null;
      }

      if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
        return;
      }
    }

    setStatus("connecting");
    const ws = new WebSocket(socketUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      setMessages((prev) => [
        {
          type: "system",
          text: `Connected to ${socketUrl}`,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ].slice(0, 8));
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        setLastPayload(parsed);
        setMessages((prev) => [
          {
            type: "telemetry",
            text: `Received ${Object.keys(parsed).length} fields`,
            time: new Date().toLocaleTimeString(),
            payload: parsed,
          },
          ...prev,
        ].slice(0, 8));
      } catch (error) {
        setMessages((prev) => [
          {
            type: "error",
            text: "Received non-JSON payload",
            time: new Date().toLocaleTimeString(),
            payload: event.data,
          },
          ...prev,
        ].slice(0, 8));
      }
    };

    ws.onerror = () => {
      setStatus("error");
      setMessages((prev) => [
        {
          type: "error",
          text: "WebSocket error while connecting or streaming",
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ].slice(0, 8));
    };

    ws.onclose = () => {
      if (wsRef.current === ws) {
        wsRef.current = null;
      }

      setStatus("disconnected");
      setMessages((prev) => [
        {
          type: "system",
          text: "Disconnected from websocket",
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ].slice(0, 8));
    };
  };

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, []);

  const statusColor = useMemo(() => {
    if (status === "connected") return "text-emerald-700 bg-emerald-100";
    if (status === "connecting") return "text-amber-700 bg-amber-100";
    if (status === "error") return "text-rose-700 bg-rose-100";
    return "text-slate-700 bg-slate-100";
  }, [status]);

  const statusLabel = useMemo(() => {
    if (status === "connected") return "Streaming";
    if (status === "connecting") return "Connecting";
    if (status === "error") return "Error";
    return "Idle";
  }, [status]);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-emerald-950 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10 lg:px-10">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          <p className="mb-3 text-sm uppercase tracking-[0.3em] text-emerald-300">
            Proton verification panel
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">
            Verify your realtime Firebase → WebSocket pipeline
          </h1>
          <p className="mt-4 max-w-3xl text-slate-200">
            Connect to the backend, then insert a new record into <span className="font-semibold text-emerald-200">telemetry_logs</span> to confirm the listener is broadcasting the enriched payload.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <span className={`rounded-full px-4 py-2 text-sm font-semibold ${statusColor}`}>
              {statusLabel}
            </span>
            <span className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100">
              {socketUrl}
            </span>
            <button
              type="button"
              onClick={connect}
              className="rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              Reconnect
            </button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <h2 className="text-xl font-semibold text-white">Live payload preview</h2>
            <p className="mt-2 text-sm text-slate-300">
              The latest message received from the server will appear here. When you add a new document to Firestore, this card should update automatically.
            </p>

            <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              {lastPayload ? (
                <pre className="overflow-auto text-sm text-emerald-100">
                  {JSON.stringify(lastPayload, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-slate-300">
                  No telemetry has been received yet. Add a new record to <span className="font-semibold text-emerald-200">telemetry_logs</span> to trigger the stream.
                </p>
              )}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-slate-300">Exposure risk</p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {lastPayload?.exposureRiskScore ?? "—"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-slate-300">Processed at</p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {lastPayload?.processedAt ?? "Waiting for first payload"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <h2 className="text-xl font-semibold text-white">How to test</h2>
            <ol className="mt-4 space-y-3 text-sm text-slate-200">
              <li>1. Make sure the server is running on port <span className="font-semibold text-emerald-200">5000</span>.</li>
              <li>2. Open this page and confirm the status shows <span className="font-semibold text-emerald-200">Streaming</span>.</li>
              <li>3. Insert a new record into <span className="font-semibold text-emerald-200">telemetry_logs</span> with numeric <span className="font-semibold text-emerald-200">heartRate</span> and <span className="font-semibold text-emerald-200">pm25</span>.</li>
              <li>4. Watch this page update with the enriched payload and risk score.</li>
            </ol>

            <div className="mt-6 rounded-2xl border border-dashed border-emerald-300/40 bg-emerald-500/10 p-4">
              <p className="text-sm font-semibold text-emerald-200">Example payload</p>
              <pre className="mt-3 overflow-auto text-sm text-emerald-50">
{`{
  "deviceId": "test-device-01",
  "heartRate": 90,
  "pm25": 12.5,
  "temperature": 30.1,
  "timestamp": "2026-05-24T12:00:00.000Z",
  "exposureRiskScore": 6.25,
  "processedAt": "2026-05-24T12:00:01.000Z"
}`}
              </pre>
            </div>
          </div>
        </div>
        <MapDashboard liveData={lastPayload} />

        {/* <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-white">Event log</h2>
            <span className="text-sm text-slate-300">Showing latest 8 events</span>
          </div>

          <div className="mt-4 space-y-3">
            {messages.length === 0 ? (
              <p className="text-sm text-slate-300">No events yet. Connect to the stream to begin.</p>
            ) : (
              messages.map((message, index) => (
                <div
                  key={`${message.time}-${index}`}
                  className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold text-white">{message.text}</p>
                    <span className="text-xs text-slate-300">{message.time}</span>
                  </div>
                  {message.payload && (
                    <pre className="mt-3 overflow-auto text-xs text-emerald-100">
                      {JSON.stringify(message.payload, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </div> */}
      </div>
    </div>
  );
}
