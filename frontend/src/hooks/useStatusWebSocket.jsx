import { useState, useEffect, useRef, useCallback } from 'react';

const WS_API_URL = import.meta.env.VITE_METRICS_API_URL || window.location.origin;

export default function useStatusWebSocket(setStatus, onOffline) {
    const wsRef = useRef(null);
    const isOnlineRef = useRef(false);
    const closedByUsRef = useRef(false);

    const connect = useCallback(() => {
        if (wsRef.current || !isOnlineRef.current) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const baseUrl = WS_API_URL.replace(/^https?:\/\//, ''); // replacing the http in env with ws
        const url = `${protocol}//${baseUrl}/ws/status`;
        const ws = new WebSocket(url);

        ws.onopen = () => {
            closedByUsRef.current = false;
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
            // A close we initiated (unmount) is not a server-death signal.
            // Only an unexpected close means the server went offline. HTTP
            // polling detects the online state again and restarts the socket.
            if (!closedByUsRef.current && onOffline) onOffline();
        };

        ws.onerror = () => {
            ws.close();
        };
    }, [setStatus]);

    const start = useCallback(() => {
        isOnlineRef.current = true;
        connect();
    }, [connect]);

    const stop = useCallback(() => {
        isOnlineRef.current = false;
        if (wsRef.current) {
            closedByUsRef.current = true;
            wsRef.current.close();
            wsRef.current = null;
        }
    }, []);

    return { start, stop };
}
