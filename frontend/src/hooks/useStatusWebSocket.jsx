import { useState, useEffect, useRef, useCallback } from 'react';

const WS_API_URL = `${import.meta.env.VITE_METRICS_API_URL}`;

export default function useStatusWebSocket(setStatus, onOffline) {
    const wsRef = useRef(null);
    const isOnlineRef = useRef(false);

    const connect = useCallback(() => {
        if (wsRef.current || !isOnlineRef.current) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const baseUrl = WS_API_URL.replace(/^https?:\/\//, ''); // replacing the http in env with ws
        const url = `${protocol}//${baseUrl}/ws/status`;
        console.log('WebSocket connecting to:', url, 'origin:', window.location.origin);
        const ws = new WebSocket(url);

        ws.onopen = () => {
            wsRef.current = ws;
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'status') {
                    setStatus(data.state === 'online' ? 'Online' : 'Offline');
                }
            } catch (e) {
                // Ignore malformed messages
            }
        };

        ws.onclose = () => {
            wsRef.current = null;
            // Server went offline - don't auto-reconnect
            // HTTP polling will detect online state and restart WS
            console.log("SERVER OFFLINE!!!!");
            if (onOffline) onOffline();
        };

        ws.onerror = () => {
            ws.close();
            console.log("WS ERROR");
        };
    }, [setStatus]);

    const start = useCallback(() => {
        isOnlineRef.current = true;
        connect();
    }, [connect]);

    const stop = useCallback(() => {
        isOnlineRef.current = false;
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
    }, []);

    return { start, stop };
}
