import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import formatBytes from '../utils/formatBytes';

function ChartShell({ title, subtitle, children }) {
    return (
        <div className="glass-card rounded-xl p-6 backdrop-blur-md">
            <div className="text-xl font-bold text-[var(--text-h)] mb-2 text-center">
                {title}
            </div>
            <div className="text-sm text-[var(--text)] text-center mb-4">{subtitle}</div>
            <ResponsiveContainer width="100%" height={250}>
                {children}
            </ResponsiveContainer>
        </div>
    );
}

export default function ChartsView({ metrics, memoryTotal, history }) {
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
