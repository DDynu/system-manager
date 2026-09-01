import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

const GPU_COLORS = ['#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

function GpuCard({ gpu, index, history }) {
    const color = GPU_COLORS[index % GPU_COLORS.length];
    const memPct = gpu.mem_total
        ? Math.min(100, Math.round((gpu.mem_used / gpu.mem_total) * 100))
        : 0;

    return (
        <div className="glass-card rounded-xl p-6 backdrop-blur-md">
            <div className="text-xl font-bold text-[var(--text-h)] mb-1 text-center">
                {gpu.utilization != null ? `${gpu.utilization}%` : "—"}
            </div>
            <div className="text-sm text-[var(--text)] text-center mb-4 truncate" title={gpu.name}>
                {gpu.name}
            </div>

            <div className="h-24 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="time" stroke="var(--text)" fontSize={10} />
                        <YAxis stroke="var(--text)" fontSize={10} domain={[0, 100]} width={28} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', border: '2px solid rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(12px)' }} />
                        <Area
                            type="monotone"
                            dataKey={entry => entry.gpuUtils?.[index] ?? null}
                            name={gpu.name}
                            stroke={color}
                            fill={color}
                            fillOpacity={0.25}
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="text-sm text-[var(--text)] space-y-3">
                <div>
                    <div className="flex justify-between mb-1">
                        <span>Memory</span>
                        <span>
                            {gpu.mem_used != null && gpu.mem_total != null
                                ? `${gpu.mem_used} / ${gpu.mem_total} GB`
                                : "—"}
                        </span>
                    </div>
                    <div className="h-2 rounded bg-[var(--border)]/40 overflow-hidden">
                        <div className="h-full bg-[#8b5cf6] transition-all duration-500" style={{ width: `${memPct}%` }} />
                    </div>
                </div>
                <div className="flex justify-between">
                    <span>Temperature</span>
                    <span>{gpu.temperature != null ? `${gpu.temperature} °C` : "—"}</span>
                </div>
                <div className="flex justify-between">
                    <span>Power</span>
                    <span>{gpu.power != null ? `${gpu.power} W` : "—"}</span>
                </div>
            </div>
        </div>
    );
}

export default function GpuCards({ gpus, gpuError, history }) {
    if (gpus?.length) {
        return gpus.map((gpu, i) => <GpuCard key={i} gpu={gpu} index={i} history={history} />);
    }
    if (gpuError) {
        return (
            <div className="glass-card rounded-xl p-4 backdrop-blur-md lg:col-span-3 text-center text-sm text-[var(--text)]">
                GPU metrics unavailable: {gpuError}
            </div>
        );
    }
    return null;
}
