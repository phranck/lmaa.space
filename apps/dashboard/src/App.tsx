import { Routes, Route, Navigate } from "react-router";

function LoginPage() {
  return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
      <div className="bg-[var(--color-surface)] p-8 rounded-lg shadow-sm max-w-sm w-full">
        <h1 className="text-2xl font-bold text-[var(--color-primary)] mb-6">dein.shop Admin</h1>
        <p className="text-[var(--color-text-muted)] text-sm">Login folgt in Phase 3.</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
