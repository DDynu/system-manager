import React, { useState, useEffect, useRef } from 'react';
import ChartsView from './ChartsView';
import StatusCard from './StatusCard';

const METRICS_API_URL = `${import.meta.env.VITE_METRICS_API_URL}/api`;

function MetricsGrid({ loading, setLoading }) {
    const [data, setData] = useState({
        metrics: null,
        history: [],
        memoryTotal: 0,
        pcStatus: { hostname: '', status: 'Offline' },
        currentTime: new Date().toLocaleTimeString()
    });

    const [time, setTime] = useState(new Date().toLocaleTimeString());
    const backendRef = useRef(false);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const metricsRes = await fetch(`${METRICS_API_URL}/metrics`);
                const metricsData = await metricsRes.json();
                const timeLabel = new Date().toLocaleTimeString();
                backendRef.current = true;
                setData(prev => ({
                    ...prev,
                    metrics: metricsData,
                    memoryTotal: metricsData.memory.total,
                    history: [...prev.history, {
                        time: timeLabel,
                        cpu: metricsData.cpu,
                        memory: metricsData.memory.used,
                        rx: metricsData.network.rx,
                        tx: metricsData.network.tx
                    }].slice(-20),
                }));
            } catch (err) {
                console.error('Failed to fetch metrics:', err);
                setData(prev => ({ ...prev, backendAvailable: false }));
                backendRef.current = false;
                fetchStatus(); // fetch to change offline status
            }
        };

        const fetchStatus = async () => {
            try {
                const statusRes = await fetch(`${METRICS_API_URL}/status`);
                const statusData = await statusRes.json();
                backendRef.current = true;
                setData(prev => ({ ...prev, pcStatus: statusData, backendAvailable: true }));
            } catch (err) {
                console.error('Failed to fetch status:', err);
                backendRef.current = false;
                setData(prev => ({ ...prev, pcStatus: { ...prev.pcStatus, status: 'Offline' }, backendAvailable: false }));
                clearInterval(metricsInterval);
            }
        };

        const timeInterval = setInterval(() => {
            setTime(new Date().toLocaleTimeString());
        }, 1000);
        // const metricsInterval = setInterval(fetchMetrics, 1000);
        const statusInterval = setInterval(() => {
            fetchStatus();
            // setData(prev => ({ ...prev, currentTime: new Date().toLocaleTimeString() }));
            if (backendRef.current) {
                fetchMetrics();
            }
        }, 5000);
        fetchStatus();
        setData(prev => ({ ...prev, loading: false }));


        return () => {
            // clearInterval(metricsInterval);
            clearInterval(statusInterval);
            clearInterval(timeInterval);
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
                        <div className="h-8 bg-[var(--border)] rounded w-24 mb-2" />
                        <div className="h-4 bg-[var(--border)] rounded w-20 mb-4" />
                        <div className="h-[250px] bg-[var(--border)] rounded" />
                    </div>
                ))}
            </div>
        );
    }
    if (!backendRef.current) {
        return (
            <StatusCard status={data.pcStatus.status} uptime={data.metrics?.uptime} time={time}/>
        )
    } 
    else {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                {/* PC Status Card */}
                <StatusCard status={data.pcStatus.status} uptime={data.metrics?.uptime} time={time} hostname={data.pcStatus.hostname}/>

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
