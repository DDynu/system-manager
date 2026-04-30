import { useState, useEffect, useRef } from 'react';
import ChartsView from './ChartsView';
import StatusCard from './StatusCard';
import useStatusWebSocket from '../hooks/useStatusWebSocket';

const METRICS_API_URL = `${import.meta.env.VITE_METRICS_API_URL}/api`;

const FETCH_API_INTERVAL = import.meta.env.VITE_FETCH_API_INTERVAL;

function MetricsGrid({ loading, setLoading }) {
    const [data, setData] = useState({
        metrics: null,
        history: [],
        memoryTotal: 0,
        pcStatus: { hostname: '', status: 'Offline' },
        currentTime: new Date().toLocaleTimeString()
    });

    const backendRef = useRef(false);
    const wsRef = useRef({ start: () => {}, stop: () => {} });

    const { start, stop } = useStatusWebSocket(
        (status) => {
            setData(prev => ({ ...prev, pcStatus: { ...prev.pcStatus, status } }));
        },
        () => {
            // WebSocket closed - server went offline
            backendRef.current = false;
            setData(prev => ({ ...prev, pcStatus: { ...prev.pcStatus, status: 'Offline' } }));
        }
    );

    useEffect(() => {
        wsRef.current = { start, stop };
    }, [start, stop]);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const metricsRes = await fetch(`${METRICS_API_URL}/metrics`);
                const metricsData = await metricsRes.json();
                const timeLabel = new Date().toLocaleTimeString(); // time for metrics
                setData(prev => {
                    const lastEntry = prev.history[prev.history.length - 1];
                    let rxSpeed = 0;
                    let txSpeed = 0;
                    if (lastEntry) {
                        const timeDelta = FETCH_API_INTERVAL/1000;
                        if (timeDelta > 0) {
                            rxSpeed = (metricsData.network.rx - lastEntry.rx) / timeDelta;
                            txSpeed = (metricsData.network.tx - lastEntry.tx) / timeDelta;
                        }
                    }

                    return {
                        ...prev,
                        metrics: metricsData,
                        memoryTotal: metricsData.memory.total,
                        history: [...prev.history, {
                            time: timeLabel,
                            cpu: metricsData.cpu,
                            memory: metricsData.memory.used,
                            rx: metricsData.network.rx,
                            tx: metricsData.network.tx,
                            rxSpeed,
                            txSpeed,
                        }].slice(-5),
                    }
                });
            } catch (err) {
                console.error('Failed to fetch metrics:', err);
                backendRef.current = false;
                fetchStatus(); // fetch to change offline status
            }
        };

        const fetchStatus = async () => {
            try {
                const statusRes = await fetch(`${METRICS_API_URL}/status`);
                const statusData = await statusRes.json();
                const timeLabel = new Date().toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"}); // Time for status
                backendRef.current = true;
                setLoading(false);
                setData(prev => ({ ...prev, pcStatus: statusData, time: timeLabel}));
                backendRef.current = true;
                // Server is online - start WebSocket for instant offline detection
                wsRef.current.start();
            } catch (err) {
                console.error('Failed to fetch status:', err);
                backendRef.current = false;
                setData(prev => ({ ...prev, pcStatus: { ...prev.pcStatus, status: 'Offline' } }));
                // Server is offline - stop WebSocket
                wsRef.current.stop();
            }
        };

        fetchStatus();
        fetchMetrics();

        // const metricsInterval = setInterval(fetchMetrics, 1000);
        const statusInterval = setInterval(async () => {
            await fetchStatus();
            if (backendRef.current) {
                await fetchMetrics();
            }
        }, FETCH_API_INTERVAL);
        setData(prev => ({ ...prev, loading: false }));


        return () => {
            clearInterval(statusInterval);
            wsRef.current.stop();
        };
    }, []);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                {/* PC Status Placeholder */}
                <div className="glass-card rounded-xl p-6 lg:col-span-3 flex items-center justify-center gap-4 backdrop-blur-md">
                    <div className="text-center">
                        <div className="h-8 bg-(--border) rounded mb-2 w-48 mx-auto" />
                        <div className="h-6 bg-(--border) rounded w-24 mx-auto mb-4" />
                        <div className="h-4 bg-(--border) rounded w-40 mx-auto mb-2" />
                        <div className="h-4 bg-(--border) rounded w-28 mx-auto" />
                    </div>
                </div>

                {/* Metric Card Placeholders */}
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="glass-card rounded-xl p-6 animate-pulse md:h-[374px] lg:h-[389px] backdrop-blur-md">
                        <div className="h-8 bg-(--border) rounded w-24 mb-2" />
                        <div className="h-4 bg-(--border) rounded w-20 mb-4" />
                        <div className="h-[250px] bg-(--border) rounded" />
                    </div>
                ))}
            </div>
        );
    }
    if (!backendRef.current) {
        return (
            <StatusCard status={data.pcStatus.status} uptime={data.metrics?.uptime} time={data.time}/>
        )
    }
    else {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                {/* PC Status Card */}
                <StatusCard status={data.pcStatus.status} uptime={data.metrics?.uptime} hostname={data.pcStatus.hostname} time={data.time}/>

                <ChartsView
                    metrics={data.metrics}
                    memoryTotal={data.memoryTotal}
                    history={data.history}
                />

            </div>
        );
    }
}

export default MetricsGrid;
