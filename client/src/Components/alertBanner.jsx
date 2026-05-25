import { X, AlertTriangle, Info, AlertCircle } from "lucide-react";
import { useState } from "react";

export default function AlertBanner({ alerts, onDismiss }) {
  const [dismissed, setDismissed] = useState(new Set());

  if (!alerts || alerts.length === 0) return null;

  const activeAlerts = alerts.filter(alert => !dismissed.has(alert.type));
  if (activeAlerts.length === 0) return null;

  const handleDismiss = (type) => {
    setDismissed(prev => new Set([...prev, type]));
    onDismiss?.(type);
  };

  const severityConfig = {
    critical: {
      bg: "bg-rose-500/20",
      border: "border-rose-500/50",
      text: "text-rose-200",
      icon: AlertTriangle,
      iconColor: "text-rose-400"
    },
    high: {
      bg: "bg-orange-500/20",
      border: "border-orange-500/50",
      text: "text-orange-200",
      icon: AlertCircle,
      iconColor: "text-orange-400"
    },
    medium: {
      bg: "bg-amber-500/20",
      border: "border-amber-500/50",
      text: "text-amber-200",
      icon: AlertCircle,
      iconColor: "text-amber-400"
    },
    low: {
      bg: "bg-blue-500/20",
      border: "border-blue-500/50",
      text: "text-blue-200",
      icon: Info,
      iconColor: "text-blue-400"
    }
  };

  return (
    <div className="space-y-3">
      {activeAlerts.map((alert) => {
        const config = severityConfig[alert.severity] || severityConfig.low;
        const Icon = config.icon;

        return (
          <div
            key={alert.type}
            className={`rounded-2xl border ${config.border} ${config.bg} p-4 backdrop-blur animate-in slide-in-from-top-2`}
          >
            <div className="flex items-start gap-3">
              <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.iconColor}`} />
              
              <div className="flex-1 min-w-0">
                <p className={`font-semibold ${config.text}`}>{alert.message}</p>
                <p className="text-sm text-slate-300 mt-1">{alert.recommendation}</p>
              </div>

              <button
                onClick={() => handleDismiss(alert.type)}
                className="flex-shrink-0 text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}