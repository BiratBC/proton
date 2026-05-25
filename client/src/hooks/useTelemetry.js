// client/src/hooks/useTelemetry.js
import { useEffect, useRef, useState } from 'react';

const DEFAULT_WS_URL = 'ws://localhost:5000';

export function useTelemetry() {
  const [liveData, setLiveData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const socketUrl = import.meta.env.VITE_WS_URL || DEFAULT_WS_URL;
    let isMounted = true;

    if (socketRef.current) {
      return undefined;
    }

    const socket = new WebSocket(socketUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      if (!isMounted) return;
      setIsConnected(true);
      console.log('🔗 WebSocket connection established with Proton Engine.');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.status === 'connected') return;
        if (!isMounted) return;

        setLiveData(data);
      } catch (error) {
        console.error('Error parsing incoming WebSocket packet:', error);
      }
    };

    socket.onclose = () => {
      if (socketRef.current === socket) {
        socketRef.current = null;
      }

      if (!isMounted) return;
      setIsConnected(false);
      console.log('❌ Disconnected from Proton WebSocket server.');
    };

    socket.onerror = (error) => {
      if (!isMounted) return;
      console.error('WebSocket error:', error);
    };

    return () => {
      isMounted = false;

      if (socketRef.current === socket) {
        socketRef.current = null;
      }

      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, []);

  return { liveData, isConnected };
}