import { useState } from 'react';

export default function StatusCard({status, uptime, hostname, time, onWake}) {
    const [waking, setWaking] = useState(false);
    const [wakeMsg, setWakeMsg] = useState('');

    const handleWake = async () => {
        if (!onWake || waking) return;
        setWaking(true);
        setWakeMsg('');
        try {
            await onWake();
            setWakeMsg('Wake signal sent');
        } catch (err) {
            setWakeMsg(err.message || 'Wake failed');
        } finally {
            setWaking(false);
            setTimeout(() => setWakeMsg(''), 4000);
        }
    };

    return (
        <div
            className="glass-card rounded-xl p-4 lg:col-span-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 backdrop-blur-md"
        >
            <div className="min-w-0">
                {/* Dot sits on the hostname line so it doesn't look
                    stranded between the two text lines on narrow screens. */}
                <div className="flex items-center gap-2 min-w-0">
                    <span className={`status-dot ${status === 'Online' ? 'online' : status === 'Offline' ? 'offline' : 'pending'}`} />
                    <div className="text-xl font-bold text-[var(--text-h)] truncate" style={{ fontFamily: "'Zen Dots', cursive" }}>
                        {hostname || 'Unknown'}
                    </div>
                </div>

                <div className="text-sm text-[var(--text)] truncate">
                    {status} {status === 'Online' && `· Uptime: ${uptime || 'Unknown'}`}
                </div>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                {onWake && (
                    <button
                        onClick={handleWake}
                        disabled={waking}
                        className="text-sm px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--text-h)] transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                        {waking ? 'Waking…' : '⏻ Wake PC'}
                    </button>
                )}
                {wakeMsg && <span className="text-xs text-[var(--text)]">{wakeMsg}</span>}
                <div className="text-sm text-[var(--text)] tabular-nums whitespace-nowrap">
                    {time}
                </div>
            </div>
        </div>
    )
}
