import React from 'react';
import { useTelemetry } from '../hooks/useTelemtry.js'; // The custom hook we built earlier
import LiveMap from '../components/LiveMap';

export default function App() {
  const { liveData, isConnected } = useTelemetry();

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Ribbon Indicator */}
        <header className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Proton Tracking Workspace</h1>
            <p className="text-sm text-slate-500">Live Biospatial Processing Environment</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`h-3 w-3 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-sm font-medium text-slate-600">
              {isConnected ? 'System Online' : 'Connecting to Server...'}
            </span>
          </div>
        </header>

        {/* Dashboard Grid Container */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Column A: Left Metric Metrics Pane */}
          <div className="space-y-4 lg:col-span-1">
            
            {/* Exposure Gauge */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Computed Exposure Risk</h3>
              <p className="text-5xl font-black text-rose-600 mt-2">
                {liveData?.exposureRiskScore ?? '--'}
              </p>
              <p className="text-xs text-slate-400 mt-1">Scale factor: Inhalation vs Ambient AQI</p>
            </div>

            {/* Smart Watch Metrics Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Watch Telemetry</h3>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-slate-600 font-medium">❤️ Heart Rate</span>
                <span className="text-xl font-bold text-slate-800">{liveData?.heartRate ? `${liveData.heartRate} BPM` : '--'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">🏃‍♂️ Cumulative Steps</span>
                <span className="text-xl font-bold text-slate-800">{liveData?.stepCount ?? '--'}</span>
              </div>
            </div>

            {/* Proton Module Environmental Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Proton Air Analysis</h3>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-slate-600 font-medium">😷 Particulates (PM2.5)</span>
                <span className="text-xl font-bold text-slate-800">{liveData?.pm25 ? `${liveData.pm25} µg/m³` : '--'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">💨 Carbon Monoxide (CO)</span>
                <span className="text-xl font-bold text-slate-800">{liveData?.co ? `${liveData.co} ppm` : '--'}</span>
              </div>
            </div>

          </div>

          {/* Column B: Right Map Canvas Space */}
          <div className="lg:col-span-2 bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
            <div className="mb-2">
              <h3 className="font-bold text-slate-800">Geospatial Routing Vector</h3>
              <p className="text-xs text-slate-400">Live track overlay fetched via Node OpenStreetMap integration layers</p>
            </div>
            <LiveMap location={liveData?.location} riskScore={liveData?.exposureRiskScore} />
          </div>

        </div>

      </div>
    </div>
  );
}