import React, { useState, useEffect, useMemo } from 'react';
import { useTelemetry } from '../hooks/useTelemetry.js';
import LiveMap from './LiveMap';

// Approx. 250 meters in coordinate degrees for localized exposure cross-checking
const HAZARD_THRESHOLD_DEGREE = 0.0025;
const ROUTE_WEIGHT_RISK = 0.5;
const ROUTE_WEIGHT_PM25 = 0.3;
const ROUTE_WEIGHT_CO2 = 0.2;
const PM25_MAX = 150;
const CO2_BASELINE = 400;
const CO2_MAX = 1500;
const RISK_MAX = 100;

function normalizeLocationCoordinates(location) {
  if (!location) return null;

  if (Array.isArray(location) && location.length >= 2) {
    const lat = Number(location[0]);
    const lng = Number(location[1]);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }

    return null;
  }

  if (typeof location === 'string') {
    const [lat, lng] = location
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value));

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }

    return null;
  }

  if (typeof location === 'object') {
    const lat = Number(location.lat ?? location.latitude);
    const lng = Number(location.lng ?? location.longitude ?? location.lon);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
  }

  return null;
}

function buildLiveMarkerNode(payload) {
  if (!payload) return null;

  const coordinates = normalizeLocationCoordinates(
    payload.location ?? payload.coordinates ?? payload.coords ?? payload.position
  ) ?? normalizeLocationCoordinates({
    lat: payload.lat,
    lng: payload.lng,
  });

  if (!coordinates) return null;

  return {
    id: payload.id ?? payload.deviceId ?? 'live-payload',
    lat: coordinates.lat,
    lng: coordinates.lng,
    pm25: payload.pm25 ?? payload.airQuality?.pm25 ?? null,
    co2: payload.co2 ?? payload.airQuality?.co2 ?? null,
    exposureRiskScore: payload.exposureRiskScore ?? payload.riskScore ?? null,
    locationName: payload.locationName ?? payload.deviceName ?? payload.source ?? 'Live Payload',
  };
}

function normalizeRiskScore(value) {
  const safeValue = Number(value);
  if (!Number.isFinite(safeValue)) return 0;
  return Math.min(Math.max(safeValue, 0), RISK_MAX) / RISK_MAX;
}

function normalizePm25(value) {
  const safeValue = Number(value);
  if (!Number.isFinite(safeValue)) return 0;
  return Math.min(Math.max(safeValue, 0), PM25_MAX) / PM25_MAX;
}

function normalizeCo2(value) {
  const safeValue = Number(value);
  if (!Number.isFinite(safeValue)) return 0;

  const normalized = Math.min(
    Math.max(safeValue - CO2_BASELINE, 0),
    CO2_MAX - CO2_BASELINE
  );

  return normalized / (CO2_MAX - CO2_BASELINE);
}

function getCompositeHazardScore(node) {
  const riskScore = normalizeRiskScore(node.exposureRiskScore);
  const pm25Score = normalizePm25(node.pm25);
  const co2Score = normalizeCo2(node.co2);

  return (
    ROUTE_WEIGHT_RISK * riskScore +
    ROUTE_WEIGHT_PM25 * pm25Score +
    ROUTE_WEIGHT_CO2 * co2Score
  );
}

function getRouteCandidateNodes(nodes, livePayload) {
  const liveNode = buildLiveMarkerNode(livePayload);

  if (!liveNode) return nodes;

  const existingNode = nodes.find((node) => node.id === liveNode.id);

  if (existingNode) return nodes;

  return [...nodes, liveNode];
}

export default function MapDashboard({ deviceData = [], liveData = null }) {
  const { liveData: streamedLiveData } = useTelemetry();
  const currentLiveData = liveData ?? streamedLiveData;
  const [activeMetric, setActiveMetric] = useState('pm25');
  const [mapNodes, setMapNodes] = useState(deviceData);

  // Eco-routing state endpoints identifiers
  const [startNode, setStartNode] = useState('node-19'); // Default starting highway toll point
  const [endNode, setEndNode] = useState('node-04');     // Default ending target location campus block
  const [computedRoute, setComputedRoute] = useState([]);
  const [safetyWeight, setSafetyWeight] = useState(4);    // Multiplier preference slider state

  useEffect(() => {
    if (deviceData.length > 0) setMapNodes(deviceData);
  }, [deviceData]);

  const displayNodes = useMemo(() => {
    const liveMarkerNode = buildLiveMarkerNode(currentLiveData);
    return liveMarkerNode ? [liveMarkerNode] : mapNodes;
  }, [currentLiveData, mapNodes]);

  useEffect(() => {
    if (currentLiveData && currentLiveData.id) {
      setMapNodes((prevNodes) =>
        prevNodes.map((node) =>
          node.id === currentLiveData.id
            ? { 
                ...node, 
                pm25: currentLiveData.pm25 ?? node.pm25, 
                co2: currentLiveData.co2 ?? node.co2,
                exposureRiskScore: currentLiveData.exposureRiskScore ?? node.exposureRiskScore
              }
            : node
        )
      );
    }
  }, [currentLiveData]);

  // Recalculate the clean eco-route automatically whenever nodes shift, sliders adjust, or metrics toggle
  useEffect(() => {
    const fetchRealStreetRoute = async () => {
      const routeNodes = getRouteCandidateNodes(mapNodes, currentLiveData);
      if (!routeNodes.length || !startNode || !endNode) return;

      const origin = routeNodes.find(n => n.id === startNode);
      const destination = routeNodes.find(n => n.id === endNode);
      if (!origin || !destination) return;

      try {
        // 1. Query OSRM requesting alternative paths to compare
        const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&alternatives=true`;
        const response = await fetch(url);
        const data = await response.json();

        if (!data.routes || data.routes.length === 0) {
          setComputedRoute([]);
          return;
        }

        let bestRouteCoordinates = [];
        let lowestTotalCost = Infinity;

        // 2. Cross-reference alternative street paths with localized air metrics
        data.routes.forEach((route) => {
          // Map OSRM [lng, lat] geometry coordinates back into standard Leaflet format [lat, lng]
          const streetCoords = route.geometry.coordinates.map((coord) => [coord[1], coord[0]]);

          let physicalDistance = route.distance / 1000; // Convert meters to kilometers
          let pollutionExposurePenalty = 0;

          // 3. Scan along the route geometry to track hot spot entries
          streetCoords.forEach(([streetLat, streetLng]) => {
            routeNodes.forEach((node) => {
              const latDiff = Math.abs(streetLat - node.lat);
              const lngDiff = Math.abs(streetLng - node.lng);

              // If street layout passes close to a monitored tracking hardware coordinate
              if (latDiff < HAZARD_THRESHOLD_DEGREE && lngDiff < HAZARD_THRESHOLD_DEGREE) {
                pollutionExposurePenalty += getCompositeHazardScore(node);
              }
            });
          });

          // 4. Evaluate true path optimization cost relative to the user choice weight settings
          const totalWeightedCost = physicalDistance + (pollutionExposurePenalty * safetyWeight);

          if (totalWeightedCost < lowestTotalCost) {
            lowestTotalCost = totalWeightedCost;
            bestRouteCoordinates = streetCoords;
          }
        });

        setComputedRoute(bestRouteCoordinates);
      } catch (error) {
        console.error("OSRM Street Routing Engine Failed:", error);
      }
    };

    fetchRealStreetRoute();
  }, [mapNodes, currentLiveData, startNode, endNode, safetyWeight]);

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur shadow-2xl">
      <div className="w-full space-y-6">
        
        {/* Header Block */}
        <header className="flex flex-wrap gap-4 justify-between items-center bg-slate-950/40 p-5 rounded-2xl border border-white/5">
          <div>
            <h1 className="text-xl font-bold text-white">Proton Eco-Routing Command Matrix</h1>
            <p className="text-xs text-slate-400 mt-0.5">Real-time path adjustments minimizing health risk index exposures</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-xl bg-slate-900/90 p-1 border border-white/10">
              <button
                onClick={() => setActiveMetric('pm25')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${activeMetric === 'pm25' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:bg-white/5'}`}
              >
                PM2.5 Heatmap
              </button>
              <button
                onClick={() => setActiveMetric('co2')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${activeMetric === 'co2' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:bg-white/5'}`}
              >
                CO2 Emissions
              </button>
            </div>
          </div>
        </header>

        {/* Core Layout Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          
          {/* Navigation Route Selection Controller Box Component */}
          <div className="flex flex-col gap-4 xl:col-span-1">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5 space-y-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Navigation Framework</h3>
              
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Origin Node Location</label>
                <select 
                  value={startNode} 
                  onChange={(e) => setStartNode(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-hidden cursor-pointer"
                >
                  {mapNodes.map(n => <option key={n.id} value={n.id}>{n.locationName || `Node ${n.id}`}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Destination Target</label>
                <select 
                  value={endNode} 
                  onChange={(e) => setEndNode(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-hidden cursor-pointer"
                >
                  {mapNodes.map(n => <option key={n.id} value={n.id}>{n.locationName || `Node ${n.id}`}</option>)}
                </select>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Safety Avoidance Priority</span>
                  <span className="text-emerald-400 font-bold">x{safetyWeight}</span>
                </div>
                <input 
                  type="range" min="0" max="20" step="1" 
                  value={safetyWeight} 
                  onChange={(e) => setSafetyWeight(Number(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
              </div>
            </div>

            {/* Diagnostic readout block updates */}
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Route Optimization Status</h3>
              <p className="text-sm font-semibold text-white mt-3">
                Path Calculation: <span className="text-emerald-400">Optimal Eco-Pass Found</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                The computed green polyline path intelligently avoids sectors displaying critical cardiovascular or PM2.5 risk metrics.
              </p>
            </div>
          </div>

          {/* Interactive Geographic Window Wrapper Panel */}
          <div className="xl:col-span-3 rounded-2xl overflow-hidden border border-white/10 bg-slate-950/40 p-2">
            <LiveMap 
              nodes={mapNodes}
              markerNodes={displayNodes}
              targetMetric={activeMetric}
              routePath={computedRoute}
            />
          </div>

        </div>

      </div>
    </div>
  );
}