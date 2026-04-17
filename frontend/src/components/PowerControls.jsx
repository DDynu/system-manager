import { useState } from 'react';

const API_URL = 'http://localhost:8000/api';

export default function PowerControls() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAction = async (action) => {
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
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 p-2">
      <button
        onClick={() => handleAction('shutdown')}
        disabled={loading}
        className="flex-1 min-w-[100px] sm:min-w-auto px-4 py-2 sm:px-6 sm:py-3 bg-[var(--accent)] hover:bg-[var(--accent)]/90 disabled:bg-gray-700 text-white font-bold rounded-lg border-b-4 border-[var(--accent)]/60 hover:border-[var(--accent)]/80 hover:scale-105 active:border-b-0 active:scale-95 active:mt-1 transition-all touch-manipulation"
      >
        {loading ? 'Processing...' : 'Shutdown'}
      </button>
      <button
        onClick={() => handleAction('reboot')}
        disabled={loading}
        className="flex-1 min-w-[100px] sm:min-w-auto px-4 py-2 sm:px-6 sm:py-3 bg-[var(--accent)] hover:bg-[var(--accent)]/90 disabled:bg-gray-700 text-white font-bold rounded-lg border-b-4 border-[var(--accent)]/60 hover:border-[var(--accent)]/80 hover:scale-105 active:border-b-0 active:scale-95 active:mt-1 transition-all touch-manipulation"
      >
        {loading ? 'Processing...' : 'Reboot'}
      </button>
      <button
        onClick={() => handleAction('sleep')}
        disabled={loading}
        className="flex-1 min-w-[100px] sm:min-w-auto px-4 py-2 sm:px-6 sm:py-3 bg-[var(--accent)] hover:bg-[var(--accent)]/90 disabled:bg-gray-700 text-white font-bold rounded-lg border-b-4 border-[var(--accent)]/60 hover:border-[var(--accent)]/80 hover:scale-105 active:border-b-0 active:scale-95 active:mt-1 transition-all touch-manipulation"
      >
        {loading ? 'Processing...' : 'Sleep'}
      </button>
      <button
        onClick={() => handleAction('wake')}
        disabled={loading}
        className="flex-1 min-w-[100px] sm:min-w-auto px-4 py-2 sm:px-6 sm:py-3 bg-[var(--accent)] hover:bg-[var(--accent)]/90 disabled:bg-gray-700 text-white font-bold rounded-lg border-b-4 border-[var(--accent)]/60 hover:border-[var(--accent)]/80 hover:scale-105 active:border-b-0 active:scale-95 active:mt-1 transition-all touch-manipulation"
      >
        {loading ? 'Processing...' : 'Wake'}
      </button>

      {error && (
        <div className="w-full text-center text-red-400 text-sm mt-3">
          {error}
        </div>
      )}
    </div>
  );
}
