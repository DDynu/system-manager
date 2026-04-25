import { useState } from 'react'
import ConfirmPopup from './components/ConfirmPopup'
import Layout from './components/Layout'
import MetricsGrid from './components/MetricsGrid'
import PowerControls from './components/PowerControls'

function App() {
    const [action, setAction] = useState("");
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    return (
        <Layout>
            <main className="main-content">
                <MetricsGrid loading={loading} setLoading={setLoading}/>
                <PowerControls action={action} setAction={setAction} error={error} setError={setError}/>
            </main>
        {action && <ConfirmPopup action={action} setAction={setAction} setError={setError}/>}
        </Layout>
    )
}

export default App
