// client/src/hooks/useTelemetry.js
import { useEffect, useState } from 'react';

export function useTelemetry() {
  const [liveData, setLiveData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // 1. Establish connection to your modular Express WebSocket server
    const socket = new WebSocket('ws://localhost:5000');

    socket.onopen = () => {
      setIsConnected(true);
      console.log('🔗 WebSocket connection established with Proton Engine.');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Skip the initial server connection confirmation packet
        if (data.status === 'connected') return;

        // 2. Feed the enriched dataset (with exposureRiskScore) directly to React state
        setLiveData(data);
      } catch (error) {
        console.error('Error parsing incoming WebSocket packet:', error);
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      console.log('❌ Disconnected from Proton WebSocket server.');
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    // 3. Cleanup connection if the user switches routes or closes the tab
    return () => {
      socket.close();
    };
  }, []);

  return { liveData, isConnected };
}