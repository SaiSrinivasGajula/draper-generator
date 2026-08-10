"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setLoading(false);
    if (!res.ok) {
      setError("Incorrect password");
      return;
    }

    router.push(searchParams.get("next") || "/");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm bg-surface border border-line rounded-2xl p-9 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_12px_32px_-16px_rgba(28,25,23,0.15)]"
    >
      <p className="text-xs font-semibold tracking-[0.2em] text-accent mb-2">DRAPER SOCIETY</p>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">Lookbook Studio</h1>
      <p className="text-sm text-muted mb-7">Sign in to continue</p>

      <label className="block text-xs font-semibold text-muted mb-1.5" htmlFor="password">
        Password
      </label>
      <input
        id="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full border border-line rounded-lg px-3.5 py-2.5 mb-5 text-ink outline-none transition-shadow focus:ring-2 focus:ring-accent/40 focus:border-accent"
        autoFocus
      />

      {error && (
        <p className="text-sm text-red-700 mb-4" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full min-h-11 bg-ink text-cream rounded-lg py-2.5 font-semibold cursor-pointer transition-colors hover:bg-ink/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
