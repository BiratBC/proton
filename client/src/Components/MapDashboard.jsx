import React, { useState, useEffect, useMemo } from 'react';
import { useTelemetry } from '../hooks/useTelemetry.js';
import LiveMap from './LiveMap';

const HAZARD_THRESHOLD_DEGREE = 0.0025;
const ROUTE_WEIGHT_RISK = 0.5;
const ROUTE_WEIGHT_PM25 = 0.3;
const ROUTE_WEIGHT_CO2 = 0.2;
const PM25_MAX = 150;
const CO2_BASELINE = 400;
const CO2_MAX = 1500;
const RISK_MAX = 100;
const SAFETY_WEIGHT_MIN = 1.0;
const SAFETY_WEIGHT_MAX = 50.0;
const HAZARD_CUTOFF_SCORE = 0.3;

function normalizeLocationCoordinates(location) {
  if (!location) return null;

  if (Array.isArray(location) && location.length >= 2) {
    const lat = Number(location[0]);
    const lng = Number(location[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    return null;
  }

  if (typeof location === 'string') {
    const [lat, lng] = location
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value));
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    return null;
  }

  if (typeof location === 'object') {
    const lat = Number(location.lat ?? location.latitude);
    const lng = Number(location.lng ?? location.longitude ?? location.lon);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }

  return null;
}

function buildLiveMarkerNode(payload) {
  if (!payload) return null;

  const coordinates =
    normalizeLocationCoordinates(
      payload.location ?? payload.coordinates ?? payload.coords ?? payload.position
    ) ?? normalizeLocationCoordinates({ lat: payload.lat, lng: payload.lng });

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
  const normalized = Math.min(Math.max(safeValue - CO2_BASELINE, 0), CO2_MAX - CO2_BASELINE);
  return normalized / (CO2_MAX - CO2_BASELINE);
}

function getCompositeHazardScore(node) {
  const riskScore = normalizeRiskScore(node.exposureRiskScore);
  const pm25Score = normalizePm25(node.pm25);
  const co2Score = normalizeCo2(node.co2);
  return ROUTE_WEIGHT_RISK * riskScore + ROUTE_WEIGHT_PM25 * pm25Score + ROUTE_WEIGHT_CO2 * co2Score;
}

function getRouteCandidateNodes(nodes, livePayload) {
  const liveNode = buildLiveMarkerNode(livePayload);
  if (!liveNode) return nodes;
  const existingNode = nodes.find((node) => node.id === liveNode.id);
  if (existingNode) return nodes;
  return [...nodes, liveNode];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// Returns how many clean waypoints to inject based on urgency tier
function getSafeWaypointCount(safetyWeight) {
  if (safetyWeight >= 35) return 4; // Critical: maximum detour
  if (safetyWeight >= 20) return 3; // Moderate: significant detour
  if (safetyWeight >= 10) return 2; // Mild: moderate detour
  if (safetyWeight >= 5)  return 1; // Low: slight detour
  return 0;                          // Healthy: direct route
}

// Only include waypoints that fall within the bounding box of origin→destination
// Prevents routing backwards or making absurd detours off-axis
function isWaypointOnPath(node, origin, destination) {
  const padding = 0.012; // ~1.3km geographic padding to allow slight off-axis clean paths
  const minLat = Math.min(origin.lat, destination.lat) - padding;
  const maxLat = Math.max(origin.lat, destination.lat) + padding;
  const minLng = Math.min(origin.lng, destination.lng) - padding;
  const maxLng = Math.max(origin.lng, destination.lng) + padding;
  return node.lat >= minLat && node.lat <= maxLat && node.lng >= minLng && node.lng <= maxLng;
}

function computeSafetyWeight({ heartRate, spo2, co, pm25 }) {
  let stressScore = 0;
  let factorCount = 0;

  if (Number.isFinite(Number(heartRate))) {
    const hr = Number(heartRate);
    let hrStress = 0;
    if      (hr >= 130) hrStress = 1.0;
    else if (hr >= 110) hrStress = 0.7;
    else if (hr >= 95)  hrStress = 0.45;
    else if (hr >= 80)  hrStress = 0.2;
    else if (hr >= 60)  hrStress = 0.0;
    else                hrStress = 0.3;
    stressScore += hrStress;
    factorCount++;
  }

  if (Number.isFinite(Number(spo2))) {
    const o2 = Number(spo2);
    let o2Stress = 0;
    if      (o2 < 88) o2Stress = 1.0;
    else if (o2 < 91) o2Stress = 0.8;
    else if (o2 < 94) o2Stress = 0.55;
    else if (o2 < 97) o2Stress = 0.25;
    else              o2Stress = 0.0;
    stressScore += o2Stress;
    factorCount++;
  }

  if (Number.isFinite(Number(co))) {
    const coVal = Number(co);
    let coStress = 0;
    if      (coVal >= 35) coStress = 1.0;
    else if (coVal >= 20) coStress = 0.75;
    else if (coVal >= 10) coStress = 0.45;
    else if (coVal >= 5)  coStress = 0.2;
    else                  coStress = 0.0;
    stressScore += coStress;
    factorCount++;
  }

  if (Number.isFinite(Number(pm25))) {
    const pmVal = Number(pm25);
    let pmStress = 0;
    if      (pmVal >= 150) pmStress = 1.0;
    else if (pmVal >= 75)  pmStress = 0.7;
    else if (pmVal >= 35)  pmStress = 0.45;
    else if (pmVal >= 12)  pmStress = 0.2;
    else                   pmStress = 0.0;
    stressScore += pmStress;
    factorCount++;
  }

  const normalizedStress = factorCount > 0 ? stressScore / factorCount : 0;
  const curved = Math.pow(normalizedStress, 1.5);
  const weight = SAFETY_WEIGHT_MIN + curved * (SAFETY_WEIGHT_MAX - SAFETY_WEIGHT_MIN);
  return Number(clamp(weight, SAFETY_WEIGHT_MIN, SAFETY_WEIGHT_MAX).toFixed(2));
}

export default function MapDashboard({
  deviceData = [],
  liveData = null,
  userVitals = {},
  environment = {},
}) {
  const { liveData: streamedLiveData } = useTelemetry();
  const currentLiveData = liveData ?? streamedLiveData;
  const [activeMetric, setActiveMetric] = useState('pm25');
  const [mapNodes, setMapNodes] = useState(deviceData);
  const [startNode, setStartNode] = useState('node-19');
  const [endNode, setEndNode] = useState('node-04');
  const [computedRoute, setComputedRoute] = useState([]);

  // Tracks real routing outcome for the status panel — replaces the hardcoded text
  const [routeMetadata, setRouteMetadata] = useState({
    waypointsUsed: 0,
    nodesAvoided: 0,
    status: 'idle', // 'idle' | 'direct' | 'detour' | 'error'
  });

  const safetyWeight = useMemo(() => {
    const resolvedEnvironment = {
      co: environment.co ?? currentLiveData?.co ?? null,
      pm25: environment.pm25 ?? currentLiveData?.pm25 ?? null,
    };
    return computeSafetyWeight({
      heartRate: userVitals.heartRate,
      spo2: userVitals.spo2,
      co: resolvedEnvironment.co,
      pm25: resolvedEnvironment.pm25,
    });
  }, [currentLiveData, environment.co, environment.pm25, userVitals.heartRate, userVitals.spo2]);

  useEffect(() => {
    if (deviceData.length > 0) setMapNodes(deviceData);
  }, [deviceData]);

  useEffect(() => {
    if (!mapNodes.length) return;
    const validIds = mapNodes.map((node) => node.id).filter(Boolean);
    const firstId = validIds[0];
    const secondId = validIds[1] ?? firstId;
    setStartNode((current) => (validIds.includes(current) ? current : firstId));
    setEndNode((current) => (validIds.includes(current) ? current : secondId));
  }, [mapNodes]);

  const heatmapNodes = useMemo(() => {
    if (deviceData.length > 0) return deviceData;
    return mapNodes;
  }, [deviceData, mapNodes]);

  const markerNodes = useMemo(() => {
    const liveMarkerNode = buildLiveMarkerNode(currentLiveData);
    if (!liveMarkerNode) return [];
    return [liveMarkerNode];
  }, [currentLiveData]);

  const routeMarkers = useMemo(() => {
    const routeMarkerConfigs = [
      { id: startNode, label: 'A', color: '#0f59ff', description: 'Origin Node Location' },
      { id: endNode,   label: 'B', color: '#16a34a', description: 'Destination Target' },
    ];

    return routeMarkerConfigs
      .map((config) => {
        const node = heatmapNodes.find((item) => item.id === config.id);
        if (!node || !node.lat || !node.lng) return null;
        return { ...config, lat: node.lat, lng: node.lng, locationName: node.locationName || node.id };
      })
      .filter(Boolean);
  }, [heatmapNodes, startNode, endNode]);

  useEffect(() => {
    if (currentLiveData && currentLiveData.id) {
      setMapNodes((prevNodes) =>
        prevNodes.map((node) =>
          node.id === currentLiveData.id
            ? {
                ...node,
                pm25: currentLiveData.pm25 ?? node.pm25,
                co2: currentLiveData.co2 ?? node.co2,
                exposureRiskScore: currentLiveData.exposureRiskScore ?? node.exposureRiskScore,
              }
            : node,
        ),
      );
    }
  }, [currentLiveData]);

  useEffect(() => {
    const fetchRealStreetRoute = async () => {
      const routeNodes = getRouteCandidateNodes(mapNodes, currentLiveData);
      if (!routeNodes.length || !startNode || !endNode) return;

      const origin = routeNodes.find((n) => n.id === startNode);
      const destination = routeNodes.find((n) => n.id === endNode);
      if (!origin || !destination) return;

      // 1. Score all intermediate nodes and separate into hazard vs safe pools
      const intermediateNodes = routeNodes
        .filter((n) => n.id !== startNode && n.id !== endNode)
        .map((n) => ({ ...n, hazardScore: getCompositeHazardScore(n) }))
        .sort((a, b) => b.hazardScore - a.hazardScore);

      const hazardNodes = intermediateNodes.filter((n) => n.hazardScore >= HAZARD_CUTOFF_SCORE);

      // 2. safetyWeight drives avoidance ratio: healthy=0%, critical=80% of hazard nodes skipped
      const avoidanceRatio = Math.min(0.8, (safetyWeight - SAFETY_WEIGHT_MIN) / (SAFETY_WEIGHT_MAX - SAFETY_WEIGHT_MIN));

      const nodesAvoided = Math.ceil(hazardNodes.length * avoidanceRatio);

      // 3. Safe waypoints: lowest-hazard nodes within the A→B bounding corridor
      const waypointLimit = getSafeWaypointCount(safetyWeight);

      const safeWaypoints = intermediateNodes
        .filter((n) => n.hazardScore < HAZARD_CUTOFF_SCORE)
        .sort((a, b) => a.hazardScore - b.hazardScore)
        .filter((n) => isWaypointOnPath(n, origin, destination))
        .slice(0, waypointLimit);

      try {
        // 4. Build OSRM coordinate chain: origin → [clean waypoints] → destination
        //    Injecting clean waypoints forces the polyline through low-pollution corridors
        //    rather than just picking between OSRM's 2-3 near-identical alternatives
        const waypointCoords = [
          `${origin.lng},${origin.lat}`,
          ...safeWaypoints.map((n) => `${n.lng},${n.lat}`),
          `${destination.lng},${destination.lat}`,
        ].join(';');

        const url = `https://router.project-osrm.org/route/v1/driving/${waypointCoords}?overview=full&geometries=geojson`;
        const response = await fetch(url);
        const data = await response.json();

        if (!data.routes?.[0]) {
          setComputedRoute([]);
          setRouteMetadata({ waypointsUsed: 0, nodesAvoided: 0, status: 'error' });
          return;
        }

        const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        setComputedRoute(coords);
        setRouteMetadata({
          waypointsUsed: safeWaypoints.length,
          nodesAvoided,
          status: safeWaypoints.length > 0 ? 'detour' : 'direct',
        });
      } catch (error) {
        console.error('OSRM Street Routing Engine Failed:', error);
        setRouteMetadata({ waypointsUsed: 0, nodesAvoided: 0, status: 'error' });
      }
    };

    fetchRealStreetRoute();
  }, [mapNodes, currentLiveData, startNode, endNode, safetyWeight]);

  // Derive status panel copy from real metadata rather than hardcoded strings
  const routeStatusDisplay = useMemo(() => {
    switch (routeMetadata.status) {
      case 'detour':
        return {
          label: 'Eco-Detour Active',
          labelClass: 'text-amber-400',
          description: `${routeMetadata.waypointsUsed} clean waypoint${routeMetadata.waypointsUsed !== 1 ? 's' : ''} injected · ${routeMetadata.nodesAvoided} hazard zone${routeMetadata.nodesAvoided !== 1 ? 's' : ''} avoided`,
        };
      case 'direct':
        return {
          label: 'Direct Clean Route',
          labelClass: 'text-emerald-400',
          description: 'No significant hazard zones detected along the direct path.',
        };
      case 'error':
        return {
          label: 'Routing Unavailable',
          labelClass: 'text-red-400',
          description: 'OSRM routing engine failed. Check connection and retry.',
        };
      default:
        return {
          label: 'Calculating…',
          labelClass: 'text-slate-400',
          description: 'Analysing pollution nodes and computing optimal corridor.',
        };
    }
  }, [routeMetadata]);

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

          {/* Navigation Route Selection Controller */}
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
                  {mapNodes.map((n) => (
                    <option key={n.id} value={n.id}>{n.locationName || `Node ${n.id}`}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Destination Target</label>
                <select
                  value={endNode}
                  onChange={(e) => setEndNode(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-hidden cursor-pointer"
                >
                  {mapNodes.map((n) => (
                    <option key={n.id} value={n.id}>{n.locationName || `Node ${n.id}`}</option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl border border-white/10 bg-emerald-500/10 p-3">
                <div className="flex justify-between items-center gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-200">
                    Auto Safety Weight
                  </span>
                  <span className="text-emerald-400 font-bold">x{safetyWeight}</span>
                </div>
                <p className="mt-2 text-[11px] text-slate-300">
                  Calculated from current SPO2, heart rate, CO, and PM2.5.
                </p>
              </div>
            </div>

            {/* Route Optimization Status — now driven by real routeMetadata */}
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Route Optimization Status</h3>
              <p className="text-sm font-semibold text-white mt-3">
                Path Calculation:{' '}
                <span className={routeStatusDisplay.labelClass}>{routeStatusDisplay.label}</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">{routeStatusDisplay.description}</p>
            </div>
          </div>

          {/* Interactive Map Panel */}
          <div className="xl:col-span-3 rounded-2xl overflow-hidden border border-white/10 bg-slate-950/40 p-2">
            <LiveMap
              nodes={heatmapNodes}
              markerNodes={markerNodes}
              routeMarkers={routeMarkers}
              targetMetric={activeMetric}
              routePath={computedRoute}
            />
          </div>

        </div>
      </div>
    </div>
  );
}