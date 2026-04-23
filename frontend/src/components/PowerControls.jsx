import { useState } from 'react';
import ConfirmPopup from './ConfirmPopup';

const API_URL = `${import.meta.env.VITE_POWER_API_URL}/api`;

const PowerButton = ({ label, onAction }) => (
    <button
        onClick={onAction}
        className="w-28 px-4 py-2.5 glass-card rounded-xl text-white font-semibold text-sm tracking-wide hover:bg-[var(--accent)]/25 hover:border-[var(--accent)]/60 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-[var(--border)]/20 transition-all duration-200 touch-manipulation active:scale-[0.97]"
    >
        {label}
    </button>
);

function PowerControls({action, setAction}) {
    const [error, setError] = useState(null);

    const handleAction = async () => {

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
        } catch (err) {
            setError(err.message);
        } 
        // finally {
        //     setLoading(false);
        // }
    };

    return (
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 p-2 power-bar">
            <PowerButton label="Shutdown" onAction={() => {setAction("shutdown"); handleAction()}} />
            <PowerButton label="Reboot" onAction={() => handleAction('reboot')} />
            <PowerButton label="Sleep" onAction={() => handleAction('sleep')} />
            <PowerButton label="Wake" onAction={() => {setAction('wake'); handleAction()}} />

            {error && (
                <div className="w-full text-center text-red-400 text-sm mt-3">
                    {error}
                </div>
            )}
        </div>
    );
}

export default PowerControls;
