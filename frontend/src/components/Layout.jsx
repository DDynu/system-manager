export default function Layout({ children }) {
  return (
    <div style={{ backgroundColor: '#1a1b26', color: '#a9b1d6', minHeight: '100vh', padding: '24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-h)]">System Manager</h1>
        </header>
        {children}
      </div>
    </div>
  );
}
