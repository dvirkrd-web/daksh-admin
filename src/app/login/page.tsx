"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getToken, saveSession, ApiError } from "@/lib/api";
import type { LoginResponse } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (getToken()) router.replace("/dashboard");
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await apiFetch<LoginResponse>("/admin/auth/login", {
        method: "POST",
        body: { email: email.trim(), password },
        auth: false,
      });
      saveSession(res.token ?? res.access_token, res.admin);
      router.replace("/dashboard");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Login failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy-deep px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-sky text-3xl shadow-lg">
            🖨️
          </div>
          <h1 className="text-2xl font-extrabold tracking-wide text-white">
            DAKSH
          </h1>
          <p className="text-xs font-semibold tracking-[0.28em] text-brand-sky">
            ONLINE PRINTING
          </p>
          <p className="mt-2 text-[11px] tracking-[0.22em] text-slate-400">
            PRINT • PACK • DELIVER
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl bg-white p-6 shadow-xl sm:p-8"
        >
          <h2 className="text-lg font-bold text-slate-900">Admin Login</h2>
          <p className="mt-1 text-sm text-slate-500">
            Sign in with the admin account created from the backend
            (<code className="text-xs">npm run create-admin</code>).
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
              {error}
            </div>
          )}

          <label className="mt-5 block text-sm font-semibold text-slate-700">
            Email
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/40"
            />
          </label>

          <label className="mt-4 block text-sm font-semibold text-slate-700">
            Password
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/40"
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="mt-6 w-full rounded-xl bg-navy px-4 py-3 text-sm font-bold text-white transition hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          This panel talks to the DAKSH backend API. Live data needs the
          backend running with PostgreSQL.
        </p>
      </div>
    </main>
  );
}
