import Layout from './components/Layout'
import MetricsGrid from './components/MetricsGrid'
import PowerControls from './components/PowerControls'

function App() {
  return (
    <Layout>
      <main className="main-content">
        <MetricsGrid />
        <PowerControls />
      </main>
    </Layout>
  )
}

export default App
