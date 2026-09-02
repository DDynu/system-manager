import { useState, useEffect, useRef } from 'react';
import ChartsView from './ChartsView';
import StatusCard from './StatusCard';
import GpuCards from './GpuCards';
import useStatusWebSocket from '../hooks/useStatusWebSocket';

// Falls back to same-origin when VITE_METRICS_API_URL is unset,
// which is the default deployment (frontend and API on one server).
const API_BASE = import.meta.env.VITE_METRICS_API_URL || window.location.origin;
const METRICS_API_URL = `${API_BASE}/api/metrics`;

const FETCH_API_INTERVAL = import.meta.env.VITE_FETCH_API_INTERVAL;

// Status is polled every 2s for prompt offline detection. The expensive
// metrics fetch stays on the slower interval above. If no successful status
// arrives within OFFLINE_AFTER_MS, the target is declared offline.
const STATUS_POLL_MS = 2000;
const OFFLINE_AFTER_MS = 5000;

function StatusSkeleton() {
    return (
        <div className="glass-card rounded-xl p-4 lg:col-span-3 flex items-center justify-between backdrop-blur-md animate-pulse">
            <div className="flex items-center gap-4">
                <div className="w-3 h-3 rounded-full bg-(--border)" />
                <div>
                    <div className="h-6 bg-(--border) rounded w-40 mb-2" />
                    <div className="h-4 bg-(--border) rounded w-52" />
                </div>
            </div>
            <div className="h-4 bg-(--border) rounded w-16" />
        </div>
    );
}

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
            <StatusSkeleton />
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
    // The grid swaps from skeletons to real cards once both the first
    // status and the first metrics response have arrived, so everything
    // appears in a single transition instead of cards popping in one by one.
    const [statusDone, setStatusDone] = useState(false);
    const [metricsDone, setMetricsDone] = useState(false);
    const loading = !statusDone || !metricsDone;

    // Broadcasts a WOL magic packet for the target via the backend.
    const handleWake = async () => {
        const res = await fetch(`${API_BASE}/api/power/wake`, { method: 'POST' });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.detail || `Wake failed (${res.status})`);
    };

    const backendRef = useRef(false);
    const lastStatusAtRef = useRef(0);
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
            } finally {
                setMetricsDone(true);
            }
        };

        const fetchStatus = async () => {
            try {
                const statusRes = await fetch(`${METRICS_API_URL}/status`);
                const statusData = await statusRes.json();
                const timeLabel = new Date().toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"}); // Time for status
                lastStatusAtRef.current = Date.now();
                backendRef.current = true;
                setData(prev => ({ ...prev, pcStatus: statusData, time: timeLabel}));
                // Server is online - start WebSocket for instant offline detection
                wsRef.current.start();
            } catch (err) {
                // Don't flip offline here and don't close the WebSocket. The
                // socket is a server-liveness signal, and the target can be
                // down while the server is up. The staleness timer below
                // declares offline after OFFLINE_AFTER_MS with no successful
                // update, so a slow or hanging poll can't delay it.
                console.error('Failed to fetch status:', err);
                backendRef.current = false;
            } finally {
                setStatusDone(true);
            }
        };

        // Safety net: never hold the skeleton if a request hangs.
        const loadingTimeout = setTimeout(() => {
            setStatusDone(true);
            setMetricsDone(true);
        }, 15000);

        fetchStatus();
        fetchMetrics();

        // Status polls fast for prompt offline detection; metrics stays on the
        // slower cadence (the SSH /proc sampling is the expensive part).
        const statusInterval = setInterval(fetchStatus, STATUS_POLL_MS);
        const metricsInterval = setInterval(async () => {
            if (backendRef.current) {
                await fetchMetrics();
            }
        }, FETCH_API_INTERVAL);

        // Declare offline OFFLINE_AFTER_MS after the last successful status,
        // independent of how long the failed poll takes to return.
        const stalenessInterval = setInterval(() => {
            const last = lastStatusAtRef.current;
            if (last > 0 && Date.now() - last > OFFLINE_AFTER_MS && backendRef.current) {
                backendRef.current = false;
                setData(prev => ({ ...prev, pcStatus: { ...prev.pcStatus, status: 'Offline' } }));
            }
        }, 1000);

        return () => {
            clearTimeout(loadingTimeout);
            clearInterval(statusInterval);
            clearInterval(metricsInterval);
            clearInterval(stalenessInterval);
            wsRef.current.stop();
        };
    }, []);

    if (loading) {
        return <SkeletonGrid />;
    }

    if (data.pcStatus.status === 'Offline') {
        return (
            <StatusCard status={data.pcStatus.status} uptime={data.metrics?.uptime} time={data.time} onWake={handleWake}/>
        )
    }
    else {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                {/* PC Status Card */}
                <StatusCard status={data.pcStatus.status} uptime={data.metrics?.uptime} hostname={data.pcStatus.hostname} time={data.time} onWake={handleWake}/>

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
            </div>
        );
    }
}

export default MetricsGrid;
