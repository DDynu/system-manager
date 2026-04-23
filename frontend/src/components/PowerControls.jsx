const PowerButton = ({ label, onAction }) => (
    <button
        onClick={onAction}
        className="w-28 px-4 py-2.5 glass-card rounded-xl text-white font-semibold text-sm tracking-wide hover:bg-[var(--accent)]/25 hover:border-[var(--accent)]/60 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-[var(--border)]/20 transition-all duration-200 touch-manipulation active:scale-[0.97]"
    >
        {label}
    </button>
);

function PowerControls({setAction, error}) {
    // const [error, setError] = useState(null);

    return (
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 p-2 power-bar">
            <PowerButton label="Shutdown" onAction={() => setAction("shutdown")} />
            <PowerButton label="Reboot" onAction={() => setAction("reboot")} />
            <PowerButton label="Sleep" onAction={() => setAction("sleep")} />
            <PowerButton label="Wake" onAction={() => setAction("wake")} />

            {error && (
                <div className="w-full text-center text-red-400 text-sm mt-3">
                    {error}
                </div>
            )}
        </div>
    );
}

export default PowerControls;
