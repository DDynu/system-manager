import { useEffect } from "react";

export default function ConfirmPopup({ action, setAction, setError, setLoading }) {
    useEffect(() => {
        setLoading(true);
    }, []);
    const API_URL = `${import.meta.env.VITE_POWER_API_URL}/api`;
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
        finally {
            setAction("");
            setError(null);
        }
    };
    // Skip popup for wake commands
    if (action === "wake") {
        handleAction();
    }
    else 
    return (
        <div className="fixed top-0 right-0 z-100 w-screen h-screen bg-black/30 backdrop-blur-md flex justify-center items-center font-[Zen_Dots]">
            <section className="bg-white/10 text-white text-center flex flex-wrap justify-around rounded-3xl border-2 border-gray-500">
                <p className="flex-1/1 p-10">Do you want to do {action} ?</p>
                <button className="bg-amber-300 text-black p-2 mb-5 w-25 rounded-2xl" onClick={()=> handleAction()}>Confirm</button>
                <button className="bg-gray-700 p-2 mb-5 w-25 rounded-2xl" onClick={() => setAction("")}>Cancel</button>
            </section>
        </div>
    )
}
