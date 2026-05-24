import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet marker icon breaking in Vite builds
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Helper component to smoothly animate/pan the map view to new incoming data coordinates
function RecenterMap({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng], 16, { animate: true });
    }
  }, [lat, lng, map]);
  return null;
}

export default function LiveMap({ location, riskScore }) {
  // Default fallback center coordinates if no live data is streaming yet
  const defaultCenter = [27.6200, 85.5390]; 
  const currentPos = location ? [location.lat, location.lng] : defaultCenter;

  return (
    <div className="w-full h-[450px] rounded-xl overflow-hidden shadow-lg border border-slate-200">
      <MapContainer 
        center={currentPos} 
        zoom={15} 
        style={{ height: '100%', width: '100%' }}
      >
        {/* OpenStreetMap Layer Tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Render live location pin if data exists */}
        {location && (
          <>
            <Marker position={currentPos}>
              <Popup>
                <div className="text-sm">
                  <p className="font-bold text-slate-800">Proton Telemetry Pin</p>
                  <p className="text-red-500 font-semibold">Live Risk Score: {riskScore}</p>
                </div>
              </Popup>
            </Marker>
            <RecenterMap lat={location.lat} lng={location.lng} />
          </>
        )}
      </MapContainer>
    </div>
  );
}