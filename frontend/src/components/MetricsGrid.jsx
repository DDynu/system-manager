import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const API_URL = 'http://localhost:8000/api';

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

export default function MetricsGrid() {
  const [metrics, setMetrics] = useState(null);
  const [pcStatus, setPcStatus] = useState({ name: '', status: 'Offline' });
  const [loading, setLoading] = useState(true);
  const [cpuHistory, setCpuHistory] = useState([]);
  const [memoryHistory, setMemoryHistory] = useState([]);
  const [networkHistory, setNetworkHistory] = useState([]);
  const [memoryTotal, setMemoryTotal] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [metricsRes, statusRes] = await Promise.all([
          fetch(`${API_URL}/metrics`),
          fetch(`${API_URL}/status`)
        ]);
        const metricsData = await metricsRes.json();
        const statusData = await statusRes.json();
        setMetrics(metricsData);
        setPcStatus(statusData);
        const timeLabel = new Date().toLocaleTimeString();
        setCpuHistory(prev => [...prev, { time: timeLabel, value: metricsData.cpu }].slice(-20));
        setMemoryHistory(prev => [...prev, { time: timeLabel, value: metricsData.memory.used }].slice(-20));
  setMemoryTotal(metricsData.memory.total);
        setNetworkHistory(prev => [...prev, {
          time: timeLabel,
          rx: metricsData.network.rx,
          tx: metricsData.network.tx
        }].slice(-20));
      } catch (err) {
        console.error('Failed to fetch metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(() => {
      fetchData();
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* PC Status Placeholder */}
        <div className="bg-[var(--bg)] border-2 border-[var(--accent-border)] rounded-xl p-6 lg:col-span-3 flex items-center justify-center gap-4 animate-pulse md:h-[172px] lg:h-[193px]">
          <div className="text-center">
            <div className="h-8 bg-[var(--border)] rounded mb-2 w-48 mx-auto" />
            <div className="h-6 bg-[var(--border)] rounded w-24 mx-auto mb-4" />
            <div className="h-4 bg-[var(--border)] rounded w-40 mx-auto mb-2" />
            <div className="h-4 bg-[var(--border)] rounded w-28 mx-auto" />
          </div>
        </div>

        {/* Metric Card Placeholders */}
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-[var(--bg)] border-2 border-[var(--border)] rounded-xl p-6 animate-pulse md:h-[274px] lg:h-[289px]">
            <div className="h-8 bg-[var(--border)] rounded w-24 mb-2" />
            <div className="h-4 bg-[var(--border)] rounded w-20 mb-4" />
            <div className="h-[150px] bg-[var(--border)] rounded" />
          </div>
        ))}
      </div>
    );
  }

  const statusColor = pcStatus.status === 'Online' ? 'text-green-500' : 'text-red-500';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {/* PC Status Card */}
      <div
        className="bg-[var(--bg)] border-2 border-[var(--accent-border)] rounded-xl p-6 lg:col-span-3 flex items-center justify-center gap-4"
      >
        <div className="text-center">
          <div className="text-3xl font-bold text-[var(--text-h)] mb-1">
            {pcStatus.hostname || 'Unknown'}
          </div>
          <div className={`text-lg font-semibold ${statusColor}`}>
            {pcStatus.status}
          </div>
          <div className="text-sm text-[var(--text)] mt-2">
            {currentTime}
          </div>
          <div className="text-sm text-[var(--text)] mt-1">
            Uptime: {metrics.uptime}
          </div>
        </div>
      </div>

      {/* CPU Graph */}
      <div className="bg-[var(--bg)] border-2 border-[var(--border)] rounded-xl p-6">
        <div className="text-xl font-bold text-[var(--text-h)] mb-2 text-center">
          {metrics.cpu}%
        </div>
        <div className="text-sm text-[var(--text)] text-center mb-4">CPU Usage</div>
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={cpuHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="time" stroke="var(--text)" fontSize={10} hide />
            <YAxis stroke="var(--text)" fontSize={10} domain={[0, 100]} />
            <Tooltip contentStyle={{ backgroundColor: 'var(--bg)', border: '2px solid var(--border)' }} />
            <Area type="monotone" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Memory Graph */}
      <div className="bg-[var(--bg)] border-2 border-[var(--border)] rounded-xl p-6">
        <div className="text-xl font-bold text-[var(--text-h)] mb-2 text-center">
          {metrics.memory.used} GB / {memoryTotal} GB
        </div>
        <div className="text-sm text-[var(--text)] text-center mb-4">Memory</div>
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={memoryHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="time" stroke="var(--text)" fontSize={10} hide />
            <YAxis stroke="var(--text)" fontSize={10} domain={[0, memoryTotal]} tickFormatter={(value) => `${value} GB`} />
            <Tooltip contentStyle={{ backgroundColor: 'var(--bg)', border: '2px solid var(--border)' }} />
            <Area type="monotone" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.3} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Network Graph */}
      <div className="bg-[var(--bg)] border-2 border-[var(--border)] rounded-xl p-6">
        <div className="text-xl font-bold text-[var(--text-h)] mb-2 text-center">
          {formatBytes(metrics.network.rx)} / {formatBytes(metrics.network.tx)}
        </div>
        <div className="text-sm text-[var(--text)] text-center mb-4">Network</div>
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={networkHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="time" stroke="var(--text)" fontSize={10} hide />
            <YAxis stroke="var(--text)" fontSize={10} domain={['dataMin - 100', 'dataMax + 100']} tickFormatter={formatBytes} />
            <Tooltip contentStyle={{ backgroundColor: 'var(--bg)', border: '2px solid var(--border)' }} formatter={(value) => formatBytes(value)} />
            <Area type="monotone" dataKey="rx" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} strokeWidth={2} name="Download" />
            <Area type="monotone" dataKey="tx" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.3} strokeWidth={2} name="Upload" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
