import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="mx-auto max-w-5xl px-6 py-20">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-700">
          CIAC USM Vitacura
        </p>

        <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
          Sistema de postulación y gestión CIAC
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600">
          Plataforma para postulación de estudiantes y acceso al panel interno de
          administración del CIAC.
        </p>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/postulacion"
            className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
          >
            Ir a postulación
          </Link>

          <Link
            href="/admin/postulante"
            className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-800 hover:bg-slate-50"
          >
            Ir a administración
          </Link>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-bold">Postulación</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Registro de datos, antecedentes y disponibilidad horaria.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-bold">Gestión</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Revisión de postulantes y organización del proceso interno.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-bold">CIAC</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Acceso central para las funciones del campus Vitacura.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
