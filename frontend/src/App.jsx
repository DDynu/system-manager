import { useState } from 'react'
import ConfirmPopup from './components/ConfirmPopup'
import Layout from './components/Layout'
import MetricsGrid from './components/MetricsGrid'
import PowerControls from './components/PowerControls'

function App() {
    const [action, setAction] = useState("");
    return (
        <Layout>
            <main className="main-content">
                <MetricsGrid />
                <PowerControls action={action} setAction={setAction} />
            </main>
        {action && <ConfirmPopup action={action} setAction={setAction}/>}
        </Layout>
    )
}

export default App
