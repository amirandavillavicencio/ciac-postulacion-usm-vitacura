"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-16 top-10 h-56 w-56 rounded-full bg-cyan-400 blur-3xl" />
          <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-blue-500 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-sky-300 blur-3xl" />
        </div>

        <div className="relative mx-auto flex min-h-[72vh] max-w-7xl flex-col justify-center px-6 py-16 lg:px-10">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">
              CIAC USM Vitacura
            </p>

            <h1 className="mt-5 text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              Sistema de postulación y gestión de ayudantías CIAC
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
              Plataforma para centralizar postulaciones, revisar disponibilidad horaria
              y apoyar la coordinación de tutores, ayudantes y funciones de apoyo del
              Centro Integrado de Aprendizaje en Campus Vitacura.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/postulacion"
                className="rounded-2xl bg-cyan-400 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
              >
                Ir a postulación
              </Link>

              <Link
                href="/admin/postulante"
                className="rounded-2xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
              >
                Acceso administración
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14 lg:px-10">
        <div className="grid gap-6 md:grid-cols-3">
          <InfoCard
            title="Postulación simple"
            description="Las y los estudiantes pueden registrar sus antecedentes, cargo de interés y disponibilidad horaria en un solo flujo."
          />
          <InfoCard
            title="Gestión centralizada"
            description="El equipo administrativo puede revisar postulantes, comparar perfiles y apoyar la organización interna del semestre."
          />
          <InfoCard
            title="Apoyo a la planificación"
            description="La plataforma facilita ordenar información para construir horarios y procesos de selección de forma más clara."
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-14 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
              Sobre la plataforma
            </p>
            <h2 className="mt-3 text-3xl font-black text-slate-900">
              Un acceso claro para postulantes y administración
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
              Esta plataforma fue pensada para ordenar el proceso de postulación del
              CIAC, permitiendo reunir datos relevantes como carrera, disponibilidad,
              motivación y cargo de interés. Al mismo tiempo, entrega un punto de
              entrada claro para la revisión administrativa y futura asignación de
              horarios.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <MiniStat value="1" label="Formulario central de ingreso" />
              <MiniStat value="2" label="Accesos principales del sistema" />
              <MiniStat value="100%" label="Enfocado en gestión CIAC" />
              <MiniStat value="24/7" label="Disponibilidad de acceso web" />
            </div>
          </div>

          <div className="rounded-3xl bg-slate-900 p-8 text-white shadow-sm ring-1 ring-slate-800">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
              Accesos rápidos
            </p>

            <div className="mt-6 space-y-4">
              <QuickAccessCard
                href="/postulacion"
                title="Formulario de postulación"
                description="Ingreso de antecedentes y disponibilidad para estudiantes interesados en participar."
                buttonLabel="Abrir postulación"
                primary
              />

              <QuickAccessCard
                href="/admin/postulante"
                title="Módulo administrativo"
                description="Espacio de revisión y gestión interna del proceso."
                buttonLabel="Entrar a administración"
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function InfoCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="mb-4 h-11 w-11 rounded-2xl bg-blue-100" />
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <p className="text-2xl font-black text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-600">{label}</p>
    </div>
  );
}

function QuickAccessCard({
  href,
  title,
  description,
  buttonLabel,
  primary = false,
}: {
  href: string;
  title: string;
  description: string;
  buttonLabel: string;
  primary?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>

      <Link
        href={href}
        className={`mt-5 inline-flex rounded-xl px-4 py-2.5 text-sm font-bold transition ${
          primary
            ? "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
            : "bg-white/10 text-white hover:bg-white/20"
        }`}
      >
        {buttonLabel}
      </Link>
    </div>
  );
}
