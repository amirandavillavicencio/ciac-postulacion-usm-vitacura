"use client";

import { FormEvent, useEffect, useState } from "react";

import AdminPostulacionesPage from "../postulaciones/page";

const ACCESS_KEY = "admin_postulantes_access";
const ACCESS_PASSWORD = "Suna2060";

export default function AdminPostulantesProtectedPage() {
  const [password, setPassword] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [hasCheckedSession, setHasCheckedSession] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const hasAccess = sessionStorage.getItem(ACCESS_KEY) === "granted";
    setIsAuthorized(hasAccess);
    setHasCheckedSession(true);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password === ACCESS_PASSWORD) {
      sessionStorage.setItem(ACCESS_KEY, "granted");
      setIsAuthorized(true);
      setError("");
      return;
    }

    setError("Clave incorrecta");
  }

  if (!hasCheckedSession) {
    return null;
  }

  if (!isAuthorized) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-12">
        <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Área protegida – Ingrese la clave de acceso</h1>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700" htmlFor="access-password">
                Clave de acceso
              </label>
              <input
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-500"
                id="access-password"
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
            </div>

            {error ? <p className="text-sm text-rose-600">{error}</p> : null}

            <button
              className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              type="submit"
            >
              Ingresar
            </button>
          </form>
        </section>
      </main>
    );
  }

  return <AdminPostulacionesPage />;
}
