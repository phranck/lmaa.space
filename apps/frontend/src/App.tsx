import { Routes, Route } from "react-router";

function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-bold text-[var(--color-primary)] mb-4">dein.shop</h1>
        <p className="text-lg text-[var(--color-text-muted)]">
          Amazon-Alternativen, kuratiert von der Community
        </p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
    </Routes>
  );
}
