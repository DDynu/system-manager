export default function StatusCard({status, uptime, hostname, time}) {
    return (
        <div
            className="glass-card rounded-xl p-4 lg:col-span-3 flex items-center justify-between backdrop-blur-md"
        >
            <div className="flex items-center gap-4">
                <span className={`status-dot ${status === 'Online' ? 'online' : 'offline'}`} />
                <div>
                    <div className="text-xl font-bold text-[var(--text-h)]" style={{ fontFamily: "'Zen Dots', cursive" }}>
                        {hostname || 'Unknown'}
                    </div>
        
                    <div className="text-sm text-[var(--text)]">
                        {status} {status === 'Online' && `· Uptime: ${uptime || 'Unknown'}` }
                    </div>
        
                </div>
            </div>
            <div className="text-sm text-[var(--text)] tabular-nums">
                {time}
            </div>
        </div>
    )
}
