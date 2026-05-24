import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat"; 

// Fix for default Leaflet marker icon breaking in Vite builds
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// ── 1. Helper component to handle the dynamic canvas heatmap layer render loop ──
function HeatmapLayer({ nodes, targetMetric }) {
  const map = useMap();
  const heatLayerRef = useRef(null);

  useEffect(() => {
    if (!map || !nodes || nodes.length === 0) return;

    // Define normalizer baselines depending on what metric we are viewing
    const normalizationFactor = targetMetric === "pm25" ? 100 : 1000;

    // Format required by Leaflet.heat: [[lat, lng, intensity_weight], ...]
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

    // If layer already exists, remove it first to rebuild cleanly on metric shifts
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    // Initialize Leaflet native heat canvas engine
    heatLayerRef.current = L.heatLayer(heatPoints, {
      radius: targetMetric === "pm25" ? 30 : 40, 
      blur: 20, 
      maxZoom: 17,
      gradient: {
        0.2: "#2563eb", // Deep Blue: Baseline Clear Ambient Air
        0.4: "#059669", // Emerald: Low Hazard Risk 
        0.6: "#d97706", // Amber: Elevated Risk
        0.8: "#ea580c", // Orange: High Intensity Risk Zone
        1.0: "#dc2626", // Red: Extreme Critical Violations
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
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15, animate: true });
    }
  }, [nodes, map]);

  return null;
}

export default function LiveMap({ nodes = [], targetMetric = "pm25" }) {
  const defaultCenter = [27.6194, 85.5385];

  return (
    <div className="w-full h-[500px] rounded-2xl overflow-hidden relative border border-slate-200 shadow-inner">
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
        {/* Switched to CartoDB Positron Light-Mode Tile Layer for legible cities, streets, and landmarks */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {/* Dynamic Thermal Heat Rendering Canvas Engine */}
        <HeatmapLayer nodes={nodes} targetMetric={targetMetric} />

        {/* Handles map window centering updates automatically */}
        <AutoFitBounds nodes={nodes} />

        {/* Interactive pin overlays */}
        {nodes.map((node) => {
          if (!node.lat || !node.lng) return null;
          return (
            <Marker key={node.id} position={[node.lat, node.lng]}>
              <Popup>
                <div className="text-slate-900 font-sans p-1 min-w-[160px]">
                  <h4 className="font-bold text-sm border-b border-slate-100 pb-1 mb-1.5 text-slate-800">
                    {node.locationName || `Device Point ID: ${node.id}`}
                  </h4>
                  <div className="space-y-1 text-xs">
                    <p className="flex justify-between">
                      <span className="text-slate-500">PM2.5 Level:</span> 
                      <span className="font-bold text-amber-600">{node.pm25 ?? "—"} µg/m³</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-500">CO2 Matrix:</span> 
                      <span className="font-bold text-cyan-600">{node.co2 ?? "—"} ppm</span>
                    </p>
                    {node.exposureRiskScore !== undefined && (
                      <p className="flex justify-between border-t border-slate-100 pt-1 mt-1 font-semibold text-rose-600">
                        <span>Calculated Risk:</span>
                        <span>{node.exposureRiskScore}</span>
                      </p>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}