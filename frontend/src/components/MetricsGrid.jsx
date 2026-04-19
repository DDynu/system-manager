import { useState, useEffect, useRef } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import PowerControls from './PowerControls';

const METRICS_API_URL = `${import.meta.env.VITE_METRICS_API_URL}/api`;

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let value = bytes;
    while (value >= k && i < sizes.length - 1) {
        value /= k;
        i++;
    }
    return `${value.toFixed(1)} ${sizes[i]}`;
}

function ChartShell({ title, subtitle, children }) {
    return (
        <div className="glass-card rounded-xl p-6 backdrop-blur-md">
            <div className="text-xl font-bold text-[var(--text-h)] mb-2 text-center">
                {title}
            </div>
            <div className="text-sm text-[var(--text)] text-center mb-4">{subtitle}</div>
            <ResponsiveContainer width="100%" height={150}>
                {children}
            </ResponsiveContainer>
        </div>
    );
}

function ChartsView({ metrics, memoryTotal, history }) {
    return (
        <>
            <ChartShell
                title={`${metrics?.cpu ?? 0}%`}
                subtitle="CPU Usage"
            >
                <AreaChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="time" stroke="var(--text)" fontSize={10} />
                    <YAxis stroke="var(--text)" fontSize={10} domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', border: '2px solid rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(12px)' }} />
                    <Area type="monotone" dataKey="cpu" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} strokeWidth={2} />
                </AreaChart>
            </ChartShell>

            <ChartShell
                title={`${metrics?.memory?.used ?? 0} GB / ${memoryTotal} GB`}
                subtitle="Memory"
            >
                <AreaChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="time" stroke="var(--text)" fontSize={10} />
                    <YAxis stroke="var(--text)" fontSize={10} domain={[0, memoryTotal]} tickFormatter={(value) => `${value} GB`} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', border: '2px solid rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(12px)' }} />
                    <Area type="monotone" dataKey="memory" stroke="#10b981" fill="#10b981" fillOpacity={0.3} strokeWidth={2} />
                </AreaChart>
            </ChartShell>

            <ChartShell
                title={`${formatBytes(metrics?.network?.rx ?? 0)} / ${formatBytes(metrics?.network?.tx ?? 0)}`}
                subtitle="Network"
            >
                <AreaChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="time" stroke="var(--text)" fontSize={10} />
                    <YAxis stroke="var(--text)" fontSize={10} domain={[0, 'dataMax + 100']} tickFormatter={formatBytes} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', border: '2px solid rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(12px)' }} formatter={(value) => formatBytes(value)} />
                    <Area type="monotone" dataKey="rx" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} strokeWidth={2} name="Download" />
                    <Area type="monotone" dataKey="tx" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.3} strokeWidth={2} name="Upload" />
                </AreaChart>
            </ChartShell>
        </>
    );
}

function MetricsGrid() {
    const [data, setData] = useState({
        metrics: null,
        history: [],
        memoryTotal: 0,
        pcStatus: { hostname: '', status: 'Offline' },
        backendAvailable: false,
        loading: true,
        currentTime: new Date().toLocaleTimeString()
    });
    const backendRef = useRef(false);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const metricsRes = await fetch(`${METRICS_API_URL}/metrics`);
                const metricsData = await metricsRes.json();
                const timeLabel = new Date().toLocaleTimeString();
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
                    backendAvailable: true
                }));
            } catch (err) {
                console.error('Failed to fetch metrics:', err);
                setData(prev => ({ ...prev, backendAvailable: false }));
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
            }
        };

        fetchMetrics();
        fetchStatus();
        setData(prev => ({ ...prev, loading: false }));

        const metricsInterval = setInterval(fetchMetrics, 5000);
        const statusInterval = setInterval(() => {
            fetchStatus();
            setData(prev => ({ ...prev, currentTime: new Date().toLocaleTimeString() }));
        }, 10000);

        return () => {
            clearInterval(metricsInterval);
            clearInterval(statusInterval);
        };
    }, []);

    if (data.loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {/* PC Status Placeholder */}
                <div className="glass-card rounded-xl p-6 lg:col-span-3 flex items-center justify-center gap-4 animate-pulse md:h-[172px] lg:h-[193px] backdrop-blur-md">
                    <div className="text-center">
                        <div className="h-8 bg-[var(--border)] rounded mb-2 w-48 mx-auto" />
                        <div className="h-6 bg-[var(--border)] rounded w-24 mx-auto mb-4" />
                        <div className="h-4 bg-[var(--border)] rounded w-40 mx-auto mb-2" />
                        <div className="h-4 bg-[var(--border)] rounded w-28 mx-auto" />
                    </div>
                </div>

                {/* Metric Card Placeholders */}
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="glass-card rounded-xl p-6 animate-pulse md:h-[274px] lg:h-[289px] backdrop-blur-md">
                        <div className="h-8 bg-[var(--border)] rounded w-24 mb-2" />
                        <div className="h-4 bg-[var(--border)] rounded w-20 mb-4" />
                        <div className="h-[150px] bg-[var(--border)] rounded" />
                    </div>
                ))}
            </div>
        );
    }

    if (!data.backendAvailable) {
        return (
            <div className="glass-card rounded-xl p-8 lg:col-span-3 flex flex-col items-center justify-center gap-4 backdrop-blur-md">
                <div className="text-3xl font-bold text-[var(--text-h)]" style={{ fontFamily: "'Zen Dots', cursive" }}>Offline</div>
                <div className="text-lg font-semibold text-red-500" style={{ fontFamily: "'Zen Dots', cursive" }}>Backend Offline</div>
                <div className="text-sm text-[var(--text)] mt-2">{data.currentTime}</div>
                <div className="w-full">
                    <PowerControls />
                </div>
            </div>
        );
    }

    const statusColor = data.pcStatus.status === 'Online' ? 'text-green-500' : 'text-red-500';

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* PC Status Card */}
            <div
                className="glass-card rounded-xl p-6 lg:col-span-3 flex flex-col items-center justify-center gap-4 backdrop-blur-md"
            >
                <div className="text-center">
                    <div className="text-3xl font-bold text-[var(--text-h)] mb-1" style={{ fontFamily: "'Zen Dots', cursive" }}>
                        {data.pcStatus.hostname || 'Unknown'}
                    </div>
                    <div className={`text-lg font-semibold ${statusColor}`} style={{ fontFamily: "'Zen Dots', cursive" }}>
                        {data.pcStatus.status}
                    </div>
                    <div className="text-sm text-[var(--text)] mt-2">
                        {data.currentTime}
                    </div>
                    <div className="text-sm text-[var(--text)] mt-1">
                        Uptime: {data.metrics?.uptime || 'Unknown'}
                    </div>
                </div>
                <div className="w-full">
                    <PowerControls />
                </div>
            </div>

            <ChartsView
                metrics={data.metrics}
                memoryTotal={data.memoryTotal}
                history={data.history}
            />

        </div>
    );
}

export default MetricsGrid;
