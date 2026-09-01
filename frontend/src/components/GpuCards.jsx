function GpuCard({ gpu }) {
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

export default function GpuCards({ gpus, gpuError }) {
    if (gpus?.length) {
        return gpus.map((gpu, i) => <GpuCard key={i} gpu={gpu} />);
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
