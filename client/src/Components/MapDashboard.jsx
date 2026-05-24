import React, { useState, useEffect } from 'react';
import { useTelemetry } from '../hooks/useTelemetry.js';
import LiveMap from './LiveMap';

// Approx. 250 meters in coordinate degrees for localized exposure cross-checking
const HAZARD_THRESHOLD_DEGREE = 0.0025;

export default function MapDashboard({ deviceData = [] }) {
  const { liveData, isConnected } = useTelemetry();
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

  useEffect(() => {
    if (liveData && liveData.id) {
      setMapNodes((prevNodes) =>
        prevNodes.map((node) =>
          node.id === liveData.id
            ? { 
                ...node, 
                pm25: liveData.pm25 ?? node.pm25, 
                co2: liveData.co2 ?? node.co2,
                exposureRiskScore: liveData.exposureRiskScore ?? node.exposureRiskScore
              }
            : node
        )
      );
    }
  }, [liveData]);

  // Recalculate the clean eco-route automatically whenever nodes shift, sliders adjust, or metrics toggle
  useEffect(() => {
    const fetchRealStreetRoute = async () => {
      if (!mapNodes.length || !startNode || !endNode) return;

      const origin = mapNodes.find(n => n.id === startNode);
      const destination = mapNodes.find(n => n.id === endNode);
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
            mapNodes.forEach((node) => {
              const latDiff = Math.abs(streetLat - node.lat);
              const lngDiff = Math.abs(streetLng - node.lng);
              
              // If street layout passes close to a monitored tracking hardware coordinate
              if (latDiff < HAZARD_THRESHOLD_DEGREE && lngDiff < HAZARD_THRESHOLD_DEGREE) {
                // Use explicit exposure scores if tracking human vitals, or default to ambient normalized data
                const baseHazard = node.exposureRiskScore ?? (
                  activeMetric === 'pm25' 
                    ? (node.pm25 || 0) / 25 
                    : (node.co2 || 400) / 300
                );
                
                pollutionExposurePenalty += baseHazard;
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
  }, [mapNodes, startNode, endNode, safetyWeight, activeMetric]);

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
                  type="range" min="0" max="10" step="1" 
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
              targetMetric={activeMetric}
              routePath={computedRoute}
            />
          </div>

        </div>

      </div>
    </div>
  );
}