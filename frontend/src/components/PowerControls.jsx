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
    <div className="flex items-center justify-center gap-4">
      <button
        onClick={() => handleAction('shutdown')}
        disabled={loading}
        className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-bold rounded-lg border-b-4 border-red-800 hover:border-red-600 active:border-b-0 active:mt-1 transition-all"
      >
        {loading ? 'Processing...' : 'Shutdown'}
      </button>
      <button
        onClick={() => handleAction('reboot')}
        disabled={loading}
        className="px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white font-bold rounded-lg border-b-4 border-orange-800 hover:border-orange-600 active:border-b-0 active:mt-1 transition-all"
      >
        {loading ? 'Processing...' : 'Reboot'}
      </button>
      <button
        onClick={() => handleAction('sleep')}
        disabled={loading}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold rounded-lg border-b-4 border-blue-800 hover:border-blue-600 active:border-b-0 active:mt-1 transition-all"
      >
        {loading ? 'Processing...' : 'Sleep'}
      </button>
      <button
        onClick={() => handleAction('wake')}
        disabled={loading}
        className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold rounded-lg border-b-4 border-green-800 hover:border-green-600 active:border-b-0 active:mt-1 transition-all"
      >
        {loading ? 'Processing...' : 'Wake'}
      </button>

      {error && (
        <div className="absolute bottom-4 text-red-500 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
