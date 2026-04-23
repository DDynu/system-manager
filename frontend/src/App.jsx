import { useState } from 'react'
import ConfirmPopup from './components/ConfirmPopup'
import Layout from './components/Layout'
import MetricsGrid from './components/MetricsGrid'
import PowerControls from './components/PowerControls'

function App() {
    const [action, setAction] = useState("");
    const [error, setError] = useState(null);
    return (
        <Layout>
            <main className="main-content">
                <MetricsGrid />
                <PowerControls action={action} setAction={setAction} error={error} setError={setError}/>
            </main>
        {action && <ConfirmPopup action={action} setAction={setAction} setError={setError}/>}
        </Layout>
    )
}

export default App
