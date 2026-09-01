import { useState, useEffect, useRef, lazy, Suspense } from 'react';
const ChartsView = lazy(() => import('./ChartsView'));
import StatusCard from './StatusCard';

const GpuCards = lazy(() => import('./GpuCards'));
import useStatusWebSocket from '../hooks/useStatusWebSocket';

// Falls back to same-origin when VITE_METRICS_API_URL is unset,
// which is the default deployment (frontend and API on one server).
const API_BASE = import.meta.env.VITE_METRICS_API_URL || window.location.origin;
const METRICS_API_URL = `${API_BASE}/api/metrics`;

const FETCH_API_INTERVAL = import.meta.env.VITE_FETCH_API_INTERVAL;

function SkeletonCard() {
    return (
        <div className="glass-card rounded-xl p-6 backdrop-blur-md animate-pulse">
            <div className="h-8 bg-(--border) rounded w-24 mb-2 mx-auto" />
            <div className="h-4 bg-(--border) rounded w-20 mb-4 mx-auto" />
            <div className="h-[250px] bg-(--border) rounded" />
        </div>
    );
}

function SkeletonGrid() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
        </div>
    );
}

function MetricsGrid() {
    const [data, setData] = useState({
        metrics: null,
        history: [],
        memoryTotal: 0,
        pcStatus: { hostname: '', status: 'Offline' },
        currentTime: new Date().toLocaleTimeString()
    });
    const [loading, setLoading] = useState(true);

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
                const metricsRes = await fetch(`${METRICS_API_URL}`);
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
                            gpuUtils: metricsData.gpu?.map(g => g.utilization) ?? [],
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
                setLoading(false);
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

        return () => {
            clearInterval(statusInterval);
            wsRef.current.stop();
        };
    }, []);

    if (loading) {
        return <SkeletonGrid />;
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

                <Suspense fallback={
                    <div className="glass-card rounded-xl p-6 md:h-[374px] lg:h-[389px] animate-pulse">
                        <div className="h-8 bg-(--border) rounded w-24 mb-2 mx-auto" />
                        <div className="h-4 bg-(--border) rounded w-20 mb-4 mx-auto" />
                        <div className="h-[250px] bg-(--border) rounded" />
                    </div>
                }>
                    <ChartsView
                        metrics={data.metrics}
                        memoryTotal={data.memoryTotal}
                        history={data.history}
                    />
                    <GpuCards
                        gpus={data.metrics?.gpu}
                        gpuError={data.metrics?.gpu_error}
                        history={data.history}
                    />
                </Suspense>
            </div>
        );
    }
}

export default MetricsGrid;
