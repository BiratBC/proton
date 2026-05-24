import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Polyline, useMap } from "react-leaflet"; // ← MAKE SURE Polyline IS HERE!
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat"; 

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

// ── 2. Helper component to automatically fit the map view box over your 50 nodes ──
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
// Ensure routePath = [] is destructured right here in the parameters!
export default function LiveMap({ nodes = [], targetMetric = "pm25", routePath = [] }) {
  const defaultCenter = [27.6194, 85.5385];

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
        <HeatmapLayer nodes={nodes} targetMetric={targetMetric} />

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

        {/* Handles map window centering updates automatically */}
        <AutoFitBounds nodes={nodes} />
      </MapContainer>
    </div>
  );
}