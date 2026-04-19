export default function Layout({ children }) {
  return (
    <div className="min-h-screen p-6">
      <div className="w-full mx-auto max-w-3xl lg:max-w-[1200px]">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-h)]" style={{ fontFamily: "'Righteous', cursive" }}>System Manager</h1>
        </header>
        {children}
      </div>
    </div>
  );
}
