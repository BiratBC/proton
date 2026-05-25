import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet"; // ← Added Marker and Popup
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat"; 

// Fix default Leaflet icon paths breaking under asset bundling frameworks (Vite, Webpack, etc.)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function createLabelIcon(label, color = "#0f172a") {
  return L.divIcon({
    className: "route-label-icon",
    html: `<div style="
      min-width: 28px;
      height: 28px;
      border-radius: 9999px;
      background: ${color};
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 800;
      border: 2px solid #ffffff;
      box-shadow: 0 8px 20px rgba(15, 23, 42, 0.28);
    ">${label}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -10],
  });
}

// ── 1. Helper component to handle the dynamic canvas heatmap layer render loop ──
function HeatmapLayer({ nodes, targetMetric }) {
  const map = useMap();
  const heatLayerRef = useRef(null);

  useEffect(() => {
    if (!map || !nodes || nodes.length === 0) return;

    const normalizationFactor = targetMetric === "pm25" ? 100 : 1000;

    const heatPoints = nodes
      .filter((n) => n.lat && n.lng) 
      .map((n) => {
        const metricValue = targetMetric === "pm25" ? Number(n.pm25 || 0) : Number(n.co2 || 0);
        return [
          n.lat,
          n.lng,
          metricValue / normalizationFactor, 
        ];
      });

    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    heatLayerRef.current = L.heatLayer(heatPoints, {
      radius: targetMetric === "pm25" ? 35 : 45, 
      blur: 25, 
      maxZoom: 17,
      gradient: {
        0.2: "#2563eb", 
        0.4: "#059669", 
        0.6: "#d97706", 
        0.8: "#ea580c", 
        1.0: "#dc2626", 
      },
    }).addTo(map);

    return () => {
      if (heatLayerRef.current && map) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [nodes, targetMetric, map]);

  return null;
}

// ── 2. Helper component to automatically fit the map view box over nodes ──
function AutoFitBounds({ nodes }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !nodes || nodes.length === 0) return;

    const validCoordinates = nodes
      .filter((n) => n.lat && n.lng)
      .map((n) => [n.lat, n.lng]);

    if (validCoordinates.length > 0) {
      const bounds = L.latLngBounds(validCoordinates);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, animate: true });
    }
  }, [nodes, map]);

  return null;
}

// ── 3. Main Export Component ──
export default function LiveMap({
  nodes = [],
  markerNodes = [],
  routeMarkers = [],
  targetMetric = "pm25",
  routePath = [],
}) {
  const defaultCenter = [27.6194, 85.5385];
  const visibleNodes = Array.isArray(nodes) ? nodes : [nodes];
  const visibleMarkerNodes = Array.isArray(markerNodes) ? markerNodes : [markerNodes];
  const visibleRouteMarkers = Array.isArray(routeMarkers) ? routeMarkers : [routeMarkers];
  const validHeatNodes = visibleNodes.filter((n) => n && n.lat && n.lng);
  const validMarkerNodes = visibleMarkerNodes.filter((n) => n && n.lat && n.lng);
  const validRouteMarkers = visibleRouteMarkers.filter((n) => n && n.lat && n.lng);
  const fitBoundsNodes = [...validHeatNodes, ...validMarkerNodes, ...validRouteMarkers];

  return (
    <div className="w-full h-[500px] rounded-2xl overflow-hidden relative border border-slate-200 shadow-sm">
      <MapContainer
        center={defaultCenter}
        zoom={15}
        style={{
          height: "100%",
          width: "100%",
          position: "relative",
          zIndex: 0,
        }}
      >
        {/* CartoDB Positron Light-Mode Tile Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {/* Dynamic Thermal Heat Rendering Canvas Engine */}
        <HeatmapLayer nodes={validHeatNodes} targetMetric={targetMetric} />

        {/* Dynamic Real-time Safe Vector Polyline Engine Overlay */}
        {routePath && routePath.length > 0 && (
          <Polyline
            positions={routePath}
            pathOptions={{
              color: "#10b981",       // Vivid Emerald Green 
              weight: 5,              // Line thickness
              opacity: 0.85,          // Opacity profile
              lineJoin: "round",
              lineCap: "round",
            }}
          />
        )}

        {/* ─── 4. PHYSICAL PIN MARKERS RENDER LOOP ─── */}
        {validMarkerNodes.map((n) => (
          <Marker key={n.id ?? `${n.lat}-${n.lng}`} position={[n.lat, n.lng]}>
            <Popup>
              <div className="text-slate-900 p-1 font-sans">
                <h4 className="font-bold text-xs border-b pb-1 mb-1 border-slate-200">
                  {n.locationName || `Device ID: ${n.id}`}
                </h4>
                <ul className="text-[11px] space-y-0.5 text-slate-600">
                  <li><strong>PM2.5:</strong> {n.pm25} µg/m³</li>
                  <li><strong>CO₂:</strong> {n.co2} ppm</li>
                  <li><strong>Risk Level:</strong> {n.exposureRiskScore}</li>
                </ul>
              </div>
            </Popup>
          </Marker>
        ))}

        {validRouteMarkers.map((n) => (
          <Marker
            key={`route-${n.label}-${n.id ?? `${n.lat}-${n.lng}`}`}
            position={[n.lat, n.lng]}
            icon={createLabelIcon(n.label, n.color || "#0f172a")}
          >
            <Popup>
              <div className="text-slate-900 p-1 font-sans">
                <h4 className="font-bold text-xs border-b pb-1 mb-1 border-slate-200">
                  {n.label} — {n.locationName || `Node ${n.id}`}
                </h4>
                <p className="text-[11px] text-slate-600">
                  {n.description || "Selected route endpoint"}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Handles map window centering updates automatically */}
        <AutoFitBounds nodes={fitBoundsNodes} />
      </MapContainer>
    </div>
  );
}