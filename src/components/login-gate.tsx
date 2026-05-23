"use client";

import { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "carnes_auth";

export function LoginGate({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setAuthenticated(stored === "1");
  }, []);

  useEffect(() => {
    if (authenticated === false) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [authenticated]);

  if (authenticated === null) return null;
  if (authenticated) return <>{children}</>;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const expected = process.env.NEXT_PUBLIC_APP_PASSWORD;
    if (password === expected) {
      localStorage.setItem(STORAGE_KEY, "1");
      setAuthenticated(true);
    } else {
      setError(true);
      setShake(true);
      setPassword("");
      setTimeout(() => setShake(false), 500);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Koke Al Asador
          </h1>
          <p className="mt-1 text-sm text-neutral-500">Acceso restringido</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 space-y-4"
        >
          <div
            className={shake ? "animate-shake" : ""}
          >
            <label
              htmlFor="password"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Contraseña
            </label>
            <input
              ref={inputRef}
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(false);
              }}
              placeholder="••••••"
              autoComplete="current-password"
              className={[
                "w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors",
                "placeholder:text-neutral-400 text-neutral-900",
                "focus:ring-2 focus:ring-offset-0",
                error
                  ? "border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-200"
                  : "border-neutral-300 bg-white focus:border-neutral-400 focus:ring-neutral-200",
              ].join(" ")}
            />
            {error && (
              <p className="mt-1.5 text-xs text-red-500">
                Contraseña incorrecta
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700 active:bg-neutral-800"
          >
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
}
