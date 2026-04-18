export default function Layout({ children }) {
  return (
    <div style={{ minHeight: '100vh', padding: '24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }} className="w-full">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-h)]">System Manager</h1>
        </header>
        {children}
      </div>
    </div>
  );
}
