import React, { useState, useEffect } from 'react';
import { useTelemetry } from '../hooks/useTelemetry.js';
import LiveMap from './LiveMap';

export default function MapDashboard({ deviceData = [] }) {
  const { liveData, isConnected } = useTelemetry();
  
  // Track metric state toggle context for geographic plotting
  const [activeMetric, setActiveMetric] = useState('pm25'); // 'pm25' | 'co2'

  // Array state to merge static node lists with hot incoming live telemetry updates
  const [mapNodes, setMapNodes] = useState(deviceData);

  // Initialize and mirror the device list when props load
  useEffect(() => {
    if (deviceData.length > 0) {
      setMapNodes(deviceData);
    }
  }, [deviceData]);

  // Intercept the hot WebSocket stream to update individual device records on-the-fly
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

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur shadow-2xl">
      <div className="w-full space-y-6">
        
        {/* Status & Toggle Header */}
        <header className="flex flex-wrap gap-4 justify-between items-center bg-slate-950/40 p-5 rounded-2xl border border-white/5">
          <div>
            <h1 className="text-xl font-bold text-white">Proton Spatial Coverage Matrix</h1>
            <p className="text-xs text-slate-400 mt-0.5">Monitoring environmental indices across 50 telemetry nodes</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Metric Selection Switches */}
            <div className="flex rounded-xl bg-slate-900/90 p-1 border border-white/10">
              <button
                type="button"
                onClick={() => setActiveMetric('pm25')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${activeMetric === 'pm25' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:bg-white/5'}`}
              >
                PM2.5 Heatmap
              </button>
              <button
                type="button"
                onClick={() => setActiveMetric('co2')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${activeMetric === 'co2' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:bg-white/5'}`}
              >
                CO2 Emissions
              </button>
            </div>

            {/* Socket Pipeline Indicator */}
            <div className="flex items-center space-x-2 bg-black/20 border border-white/5 px-3 py-1.5 rounded-xl">
              <span className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-xs font-mono font-medium text-slate-300">
                {isConnected ? 'Stream: Sync' : 'Stream: Offline'}
              </span>
            </div>
          </div>
        </header>

        {/* Layout Analytics Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          
          {/* Diagnostic Side Control Panel */}
          <div className="flex flex-col gap-4 xl:col-span-1">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Device Count</h3>
              <p className="text-3xl font-bold text-white mt-2">
                {mapNodes.length} <span className="text-xs font-normal text-slate-500">online</span>
              </p>
            </div>
            
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Stream Target Focus</h3>
              <p className={`text-2xl font-bold mt-2 capitalize ${activeMetric === 'pm25' ? 'text-emerald-400' : 'text-cyan-400'}`}>
                {activeMetric === 'pm25' ? 'Particulates' : 'Carbon Dioxide'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {activeMetric === 'pm25' 
                  ? 'Plotting fine aerodynamic matter diameters ≤ 2.5 micrometers.' 
                  : 'Plotting dynamic environmental greenhouse gas displacements.'}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5 flex-1 hidden xl:block">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Thermal Vector Gradient</h3>
              <div className="space-y-2 text-xs font-mono text-slate-300">
                <div className="flex items-center gap-2"><span className="h-2 w-6 rounded bg-red-600"/> Max Saturation</div>
                <div className="flex items-center gap-2"><span className="h-2 w-6 rounded bg-yellow-400"/> Heavy Spike</div>
                <div className="flex items-center gap-2"><span className="h-2 w-6 rounded bg-lime-400"/> Normal Ambient</div>
                <div className="flex items-center gap-2"><span className="h-2 w-6 rounded bg-blue-600"/> Baseline Clear</div>
              </div>
            </div>
          </div>

          {/* Core Geographic Canvas Block */}
          <div className="xl:col-span-3 rounded-2xl overflow-hidden border border-white/10 bg-slate-950/40 p-2">
            <LiveMap 
              nodes={mapNodes}
              targetMetric={activeMetric}
            />
          </div>

        </div>

      </div>
    </div>
  );
}