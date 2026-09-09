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
// After a successful WOL packet, wait this long for the target to report in.
// The first SSH connection right after a cold boot is usually the slow part.
const WAKING_TIMEOUT_MS = 20000;

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
        <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
        </>
    );
}

function MetricsGrid() {
    const [data, setData] = useState({
        metrics: null,
        history: [],
        memoryTotal: 0,
        pcStatus: { hostname: '', status: 'Pending' },
        time: new Date().toLocaleTimeString()
    });
    // The status bar renders immediately as "Pending"; only the metric
    // cards wait behind skeletons until the first metrics response lands.
    const [metricsDone, setMetricsDone] = useState(false);
    const loading = !metricsDone;

    // Broadcasts a WOL magic packet for the target via the backend, then
    // flips the status to "Waking Up". If no status poll succeeds within
    // WAKING_TIMEOUT_MS it falls back to Offline; a successful poll (Online)
    // cancels the timer and wins immediately.
    const wakingTimerRef = useRef(null);
    const isWakingRef = useRef(false);
    const handleWake = async () => {
        const res = await fetch(`${API_BASE}/api/power/wake`, { method: 'POST' });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.detail || `Wake failed (${res.status})`);
        isWakingRef.current = true;
        setData(prev => ({ ...prev, pcStatus: { ...prev.pcStatus, status: 'Waking Up' } }));
        clearTimeout(wakingTimerRef.current);
        wakingTimerRef.current = setTimeout(() => {
            wakingTimerRef.current = null;
            isWakingRef.current = false;
            wasStaleOfflineRef.current = false;
            setData(prev => prev.pcStatus.status === 'Waking Up'
                ? { ...prev, pcStatus: { ...prev.pcStatus, status: 'Offline' } }
                : prev);
        }, WAKING_TIMEOUT_MS);
    };

    const backendRef = useRef(false);
    const lastStatusAtRef = useRef(0);
    // Guards the staleness timer against redundant updates. Reset on each
    // successful status, set once we've flipped offline via staleness.
    const wasStaleOfflineRef = useRef(false);
    const wsRef = useRef({ start: () => {}, stop: () => {} });

    const { start, stop } = useStatusWebSocket(
        (status) => {
            setData(prev => ({ ...prev, pcStatus: { ...prev.pcStatus, status } }));
        },
        () => {
            // WebSocket closed - server went offline
            backendRef.current = false;
            clearTimeout(wakingTimerRef.current);
            wakingTimerRef.current = null;
            isWakingRef.current = false;
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
                // Target offline: the backend answers 503 with a {detail} body,
                // not a metrics object. Don't feed that into state; the status
                // poll owns offline detection.
                if (!metricsRes.ok) {
                    console.error('Metrics fetch failed:', metricsRes.status);
                    backendRef.current = false;
                    return;
                }
                const metricsData = await metricsRes.json();
                const timeLabel = new Date().toLocaleTimeString(); // time for metrics
                setData(prev => {
                    const lastEntry = prev.history[prev.history.length - 1];
                    let rxSpeed = 0;
                    let txSpeed = 0;
                    if (lastEntry) {
                        const timeDelta = FETCH_API_INTERVAL/1000;
                        if (timeDelta > 0) {
                            // Null-safe: an unexpected response shape must
                            // never throw inside this updater (React runs it
                            // during render, outside the try/catch above).
                            rxSpeed = ((metricsData.network?.rx ?? 0) - lastEntry.rx) / timeDelta;
                            txSpeed = ((metricsData.network?.tx ?? 0) - lastEntry.tx) / timeDelta;
                        }
                    }

                    return {
                        ...prev,
                        metrics: metricsData,
                        memoryTotal: metricsData.memory?.total ?? 0,
                        history: [...prev.history, {
                            time: timeLabel,
                            cpu: metricsData.cpu,
                            memory: metricsData.memory?.used ?? 0,
                            rx: metricsData.network?.rx ?? 0,
                            tx: metricsData.network?.tx ?? 0,
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
                wasStaleOfflineRef.current = false;
                backendRef.current = true;
                clearTimeout(wakingTimerRef.current);
                wakingTimerRef.current = null;
                isWakingRef.current = false;
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
                // If the first attempt fails, stop showing "Pending" and
                // fall back to the offline UI (with the Wake button).
                setData(prev => prev.pcStatus.status === 'Pending'
                    ? { ...prev, pcStatus: { ...prev.pcStatus, status: 'Offline' } }
                    : prev);
            }
        };

        // Safety net: never hold the skeletons if a request hangs.
        const loadingTimeout = setTimeout(() => {
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
        // independent of how long the failed poll takes to return. Before the
        // first success, mount time is the baseline: with the target down,
        // the first status poll can hang for SSH_TIMEOUT × retries before
        // failing, and without this the bar would sit on Pending (orange)
        // the whole time.
        const startedAt = Date.now();
        const stalenessInterval = setInterval(() => {
            // While a wake is in flight the 20s timer owns the offline
            // decision, so the short staleness window must not preempt it.
            if (isWakingRef.current) return;
            const last = lastStatusAtRef.current;
            const baseline = last > 0 ? last : startedAt;
            if (Date.now() - baseline > OFFLINE_AFTER_MS && !wasStaleOfflineRef.current) {
                wasStaleOfflineRef.current = true;
                backendRef.current = false;
                setData(prev => ({ ...prev, pcStatus: { ...prev.pcStatus, status: 'Offline' } }));
            }
        }, 500);

        return () => {
            clearTimeout(loadingTimeout);
            clearTimeout(wakingTimerRef.current);
            clearInterval(statusInterval);
            clearInterval(metricsInterval);
            clearInterval(stalenessInterval);
            wsRef.current.stop();
        };
    }, []);

    if ((data.pcStatus.status === 'Offline' || data.pcStatus.status === 'Waking Up') && !loading) {
        return (
            <StatusCard status={data.pcStatus.status} uptime={data.metrics?.uptime} time={data.time} onWake={handleWake}/>
        )
    }
    else {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                {/* PC Status Card */}
                <StatusCard status={data.pcStatus.status} uptime={data.metrics?.uptime} hostname={data.pcStatus.hostname} time={data.time} onWake={handleWake}/>

                {loading
                    ? <SkeletonGrid />
                    : <>
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
                    </>
                }
            </div>
        );
    }
}

export default MetricsGrid;
