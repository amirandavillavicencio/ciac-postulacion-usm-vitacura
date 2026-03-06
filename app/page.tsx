import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-ciac-navy to-ciac-blue text-white">
      <div className="container-page flex min-h-screen flex-col justify-center py-16">
        <div className="max-w-3xl">
          <p className="mb-3 text-sm uppercase tracking-[0.2em] text-blue-100">
            CIAC USM Vitacura
          </p>
          <h1 className="mb-6 text-4xl font-bold md:text-6xl">
            Sistema de postulación y gestión de postulantes
          </h1>
          <p className="mb-10 max-w-2xl text-lg text-blue-50">
            Proyecto base para desplegar en Vercel, con formulario público,
            panel interno y futura conexión a Supabase.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/postulacion"
              className="rounded-xl bg-white px-6 py-3 font-semibold text-ciac-navy transition hover:translate-y-[-1px]"
            >
              Ir a postulación
            </Link>
            <Link
              href="/admin/postulantes"
              className="rounded-xl border border-white/30 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              Ir al panel interno
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
