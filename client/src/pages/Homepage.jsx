import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// ── Ambient blob ──────────────────────────────────────────────────────────────
// No inline style prop for animations — purely CSS class-driven
const Blob = ({ className }) => (
  <div className={`absolute rounded-full pointer-events-none ${className}`} />
);

// ── Metric card ───────────────────────────────────────────────────────────────
const colorMap = {
  green: {
    bar: "from-emerald-400 to-teal-300",
    value: "text-emerald-700",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  blue: {
    bar: "from-blue-400 to-sky-300",
    value: "text-blue-700",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  red: {
    bar: "from-rose-400 to-pink-300",
    value: "text-rose-700",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
  },
  amber: {
    bar: "from-amber-400 to-yellow-300",
    value: "text-amber-700",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
};

// FIX 1: Remove useEffect+setTimeout — use CSS animation-delay instead
// FIX 2: Replace backdrop-blur-xl with a solid semi-transparent bg
const MetricCard = ({ label, value, unit, status, color, delay = 0 }) => {
  const c = colorMap[color];
  return (
    <div
      className="animate-fade-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      <Card
        className="relative overflow-hidden border border-white/80 bg-white/70 shadow-md hover:-translate-y-1 hover:shadow-lg transition-transform duration-200 rounded-2xl will-change-transform"
      >
        <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${c.bar}`} />
        <CardContent className="pt-6 pb-5 px-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-2">{label}</p>
          <div className="flex items-baseline gap-1 mb-3">
            <span className={`text-4xl font-bold tracking-tight ${c.value}`}>{value}</span>
            <span className="text-sm font-medium text-slate-400">{unit}</span>
          </div>
          <Badge
            variant="outline"
            className={`text-[11px] font-semibold px-3 py-0.5 rounded-full border ${c.badge} flex items-center gap-1.5 w-fit`}
          >
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${c.dot} animate-pulse`} />
            {status}
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
};

// FIX 3: Same treatment for FeatureCard
const FeatureCard = ({ icon, title, body, delay = 0 }) => (
  <div
    className="animate-fade-up h-full"
    style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
  >
    <Card className="group relative overflow-hidden border border-white/80 bg-white/70 shadow-md hover:-translate-y-1 hover:shadow-lg transition-transform duration-200 h-full rounded-3xl will-change-transform">
      <CardContent className="p-8">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-3xl mb-5 group-hover:scale-110 transition-transform duration-200 shadow-sm">
          {icon}
        </div>
        <h3 className="text-[18px] font-semibold tracking-tight text-slate-800 mb-2.5">{title}</h3>
        <p className="text-[14px] leading-relaxed text-slate-500">{body}</p>
      </CardContent>
    </Card>
  </div>
);

// ── Main page ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const metrics = [
    { label: "Air Quality", value: "42",  unit: "AQI",   status: "Good",     color: "green", delay: 200 },
    { label: "CO Level",    value: "9",   unit: "ppm",   status: "Safe",     color: "blue",  delay: 350 },
    { label: "Heart Rate",  value: "78",  unit: "BPM",   status: "Normal",   color: "red",   delay: 500 },
    { label: "PM2.5",       value: "18",  unit: "μg/m³", status: "Moderate", color: "amber", delay: 650 },
  ];

  const features = [
    {
      icon: "⌚",
      title: "Smart Wearable",
      body: "Collects body temperature, heart rate, and health data to measure environmental impact on the user.",
      delay: 300,
    },
    {
      icon: "🌫️",
      title: "Pollution Detection",
      body: "Uses MQ-7 and dust sensors connected with ESP32 for real-time air quality monitoring.",
      delay: 450,
    },
    {
      icon: "📊",
      title: "Live Analytics",
      body: "Visualizes health and pollution trends with a responsive React dashboard and cloud integration.",
      delay: 600,
    },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-green-50 via-white to-teal-50 text-gray-800">

      {/*
        FIX 4: Blob animations moved to CSS — no inline style prop diffing.
        FIX 5: Removed blur-[90px] from blobs (very expensive composite layer).
                Use opacity only for a similar ambient effect.
        FIX 6: Reduced blob count from 3 → 2 to cut GPU layers.
      */}
      <style>{`
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-up { animation: fade-up 0.6s ease-out; }

        @keyframes drift1 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%      { transform: translate(40px,60px) scale(1.06); }
        }
        @keyframes drift2 {
          0%,100% { transform: translate(0,0); }
          50%      { transform: translate(-50px,30px); }
        }
        .blob1 { animation: drift1 18s ease-in-out infinite; }
        .blob2 { animation: drift2 22s ease-in-out infinite; }
      `}</style>

      {/* Ambient blobs — opacity only, no blur */}
      <Blob className="blob1 w-[600px] h-[600px] bg-emerald-200 opacity-30 -top-32 -left-32" />
      <Blob className="blob2 w-[500px] h-[500px] bg-sky-200 opacity-25 top-1/2 -right-24" />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 py-24 grid md:grid-cols-2 gap-16 items-center">
        <div className="space-y-6">
          <Badge
            variant="outline"
            className="bg-emerald-50/80 text-emerald-700 border-emerald-200 text-[11px] font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full flex items-center gap-2 w-fit"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Smart Environmental Monitoring
          </Badge>

          <h1 className="text-5xl font-bold leading-[1.07] tracking-tight text-slate-900">
            Track Pollution &amp;{" "}
            <span className="text-emerald-600">Health</span>{" "}
            in Real Time
          </h1>

          <p className="text-[16.5px] text-slate-500 leading-relaxed max-w-[480px]">
            Proton combines wearable health monitoring, environmental sensors,
            and AI analytics to help you understand how air quality impacts your wellbeing.
          </p>

          <div className="flex gap-3 pt-1">
            <Button
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-lg shadow-emerald-200 font-semibold text-[15px] px-6 gap-2 transition-colors duration-150 hover:-translate-y-0.5"
            >
              View Dashboard →
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-2xl bg-white/60 border-white/90 shadow-sm hover:bg-white/80 text-slate-700 font-medium text-[15px] px-6 transition-colors duration-150 hover:-translate-y-0.5"
            >
              Learn More
            </Button>
          </div>

          <div className="flex items-center gap-8 pt-2">
            {[["10k+", "Users"], ["99.9%", "Uptime"], ["<2s", "Latency"]].map(([val, lbl]) => (
              <div key={lbl}>
                <p className="text-lg font-bold text-slate-800 tracking-tight">{val}</p>
                <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">{lbl}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {metrics.map((m) => (
            <MetricCard key={m.label} {...m} />
          ))}
        </div>
      </section>

      <Separator className="max-w-7xl mx-auto opacity-20" />

      {/* ── FEATURES ──────────────────────────────────────────────────────── */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-8 py-20">
        <div className="text-center mb-14 space-y-3">
          <Badge
            variant="outline"
            className="bg-white/60 text-slate-500 border-slate-200 text-[11px] font-semibold tracking-widest uppercase px-4 py-1 rounded-full"
          >
            Platform Capabilities
          </Badge>
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">Core Features</h2>
          <p className="text-slate-500 max-w-lg mx-auto text-[15px] leading-relaxed">
            A complete environmental intelligence platform combining IoT,
            wearable technology, and analytics.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 pb-24">
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-emerald-600/90 to-teal-700/90 border border-white/20 shadow-2xl p-16 text-center">
          {/* Static decorative circles — no animation, no blur */}
          <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-white/10" />
          <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full bg-emerald-300/20" />

          <div className="relative z-10 space-y-5">
            <Badge
              variant="outline"
              className="bg-white/10 text-white/80 border-white/20 text-[11px] font-semibold tracking-widest uppercase px-4 py-1 rounded-full"
            >
              Join the Movement
            </Badge>
            <h2 className="text-4xl font-bold text-white tracking-tight">
              Build a Healthier Environment
            </h2>
            <p className="text-emerald-100/80 text-[15px] max-w-md mx-auto leading-relaxed">
              Empowering people with real-time pollution awareness and health insights
              through smart technology.
            </p>
            <Button
              size="lg"
              className="bg-white text-emerald-700 hover:bg-white/90 font-semibold text-[15px] px-8 rounded-2xl shadow-lg transition-colors duration-150 hover:-translate-y-0.5 hover:shadow-xl mt-2 gap-2"
            >
              Open Dashboard →
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}