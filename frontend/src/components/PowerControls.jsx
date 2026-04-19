import { useState, useCallback, memo } from 'react';

const API_URL = `${import.meta.env.VITE_POWER_API_URL}/api`;

const PowerButton = memo(({ label, loading, onAction }) => (
    <button
        onClick={onAction}
        disabled={loading}
        className="flex-1 min-w-[100px] sm:min-w-auto px-4 py-2.5 sm:px-6 sm:py-3 glass-card rounded-xl text-white font-semibold text-sm tracking-wide hover:bg-[var(--accent)]/25 hover:border-[var(--accent)]/60 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-[var(--border)]/20 transition-all duration-200 touch-manipulation active:scale-[0.97]"
    >
        {loading ? 'Processing...' : label}
    </button>
), (prev, next) => prev.loading === next.loading);

function PowerControls() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAction = useCallback(async (action) => {
    if (!confirm(`Are you sure you want to ${action} this system?`)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/power/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || `Failed to ${action}`);
      }

      alert(data.message);
    } catch (err) {
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 p-2">
      <PowerButton label="Shutdown" loading={loading} onAction={() => handleAction('shutdown')} />
      <PowerButton label="Reboot" loading={loading} onAction={() => handleAction('reboot')} />
      <PowerButton label="Sleep" loading={loading} onAction={() => handleAction('sleep')} />
      <PowerButton label="Wake" loading={loading} onAction={() => handleAction('wake')} />

      {error && (
        <div className="w-full text-center text-red-400 text-sm mt-3">
          {error}
        </div>
      )}
    </div>
  );
}

export default memo(PowerControls, (prevProps, nextProps) => {
    return true;
});
